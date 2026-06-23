import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SimplePool, type Event as NostrEvent } from "nostr-tools";
import { OWNER_NPUB, RELEASE_KIND } from "../config";
import { npubToHex } from "../lib/nostr";
import { classifyReaction, REACTION_UP } from "../lib/rating";
import { useSigner } from "./useSigner";
import { useRelays } from "./useRelays";

// Per-release reaction aggregate. `mine` is the current user's own reaction
// event id (for revoke), or null.
export type ReactionAgg = { up: number; down: number; mine: string | null };
const EMPTY: ReactionAgg = { up: 0, down: 0, mine: null };

type Ctx = {
  forAddr: (addr: string) => ReactionAgg;
  react: (addr: string) => Promise<void>;
  unreact: (addr: string) => Promise<void>;
  canReact: boolean;
};
const C = createContext<Ctx | null>(null);

// One subscription for the whole app; cards/detail read per-release. Posting
// goes through the NIP-46 signer (useSigner).
export function ReactionsProvider({ children }: { children: ReactNode }) {
  const { pubkey: myPubkey, signEvent } = useSigner();

  const ownerHex = useMemo(() => {
    try {
      return npubToHex(OWNER_NPUB);
    } catch {
      return undefined;
    }
  }, []);

  // addr (`kind:pubkey:d`) → reactor pubkey → that reactor's latest kind:7.
  const latestRef = useRef<Map<string, Map<string, NostrEvent>>>(new Map());
  const [aggs, setAggs] = useState<Map<string, ReactionAgg>>(new Map());

  // Pool persists for the provider's life — reused for sub + publish.
  const poolRef = useRef<SimplePool | null>(null);
  if (!poolRef.current) poolRef.current = new SimplePool();
  const { relays } = useRelays();

  // `myPubkey` via ref so the stable aggregator can see the current identity.
  const myPubkeyRef = useRef<string | null>(myPubkey);
  myPubkeyRef.current = myPubkey;

  const aggOf = useCallback((addr: string): ReactionAgg => {
    const inner = latestRef.current.get(addr);
    if (!inner) return EMPTY;
    let up = 0;
    let down = 0;
    let mine: string | null = null;
    for (const ev of inner.values()) {
      const k = classifyReaction(ev.content);
      if (k === "up") up++;
      else if (k === "down") down++;
      if (myPubkeyRef.current && ev.pubkey === myPubkeyRef.current) {
        mine = ev.id;
      }
    }
    return { up, down, mine };
  }, []);

  const refresh = useCallback(
    (addr: string) => {
      setAggs((m) => new Map(m).set(addr, aggOf(addr)));
    },
    [aggOf],
  );

  // Subscribe to the owner's reactions.
  useEffect(() => {
    if (!ownerHex) return;
    latestRef.current = new Map();
    setAggs(new Map());
    const pool = poolRef.current!;
    const prefix = `${RELEASE_KIND}:${ownerHex}:`;

    const sub = pool.subscribeMany(
      relays,
      { kinds: [7], "#p": [ownerHex] },
      {
        onevent(ev) {
          const addr = ev.tags
            .filter((t) => t[0] === "a" && t[1]?.startsWith(prefix))
            .map((t) => t[1])[0];
          if (!addr) return;
          let inner = latestRef.current.get(addr);
          if (!inner) {
            inner = new Map();
            latestRef.current.set(addr, inner);
          }
          const prev = inner.get(ev.pubkey);
          if (
            prev &&
            !(
              ev.created_at > prev.created_at ||
              (ev.created_at === prev.created_at && ev.id < prev.id)
            )
          ) {
            return;
          }
          inner.set(ev.pubkey, ev);
          refresh(addr);
        },
      },
    );

    return () => sub.close();
  }, [ownerHex, relays, refresh]);

  // Recompute `mine` across every release when the signed-in identity changes.
  useEffect(() => {
    setAggs(() => {
      const next = new Map<string, ReactionAgg>();
      for (const addr of latestRef.current.keys()) next.set(addr, aggOf(addr));
      return next;
    });
  }, [myPubkey, aggOf]);

  // Close the pool on unmount (mainly dev hot-reload).
  useEffect(() => {
    const pool = poolRef.current!;
    return () => pool.close(relays);
  }, [relays]);

  const react = useCallback(
    async (addr: string) => {
      const me = myPubkeyRef.current;
      if (!me || !ownerHex) return;
      const signed = await signEvent({
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        content: REACTION_UP,
        tags: [
          ["a", addr],
          ["p", ownerHex],
          ["k", String(RELEASE_KIND)],
        ],
      });
      // Optimistic — reflect it before the relay round-trip.
      let inner = latestRef.current.get(addr);
      if (!inner) {
        inner = new Map();
        latestRef.current.set(addr, inner);
      }
      inner.set(me, signed);
      refresh(addr);
      await Promise.allSettled(poolRef.current!.publish(relays, signed));
    },
    [ownerHex, signEvent, relays, refresh],
  );

  const unreact = useCallback(
    async (addr: string) => {
      const me = myPubkeyRef.current;
      if (!me) return;
      const inner = latestRef.current.get(addr);
      const mine = inner?.get(me);
      if (!inner || !mine) return;
      const signed = await signEvent({
        kind: 5,
        created_at: Math.floor(Date.now() / 1000),
        content: "",
        tags: [
          ["e", mine.id],
          ["k", "7"],
        ],
      });
      inner.delete(me);
      refresh(addr);
      await Promise.allSettled(poolRef.current!.publish(relays, signed));
    },
    [signEvent, relays, refresh],
  );

  const value = useMemo<Ctx>(
    () => ({
      forAddr: (addr) => aggs.get(addr) ?? EMPTY,
      react,
      unreact,
      canReact: myPubkey != null,
    }),
    [aggs, react, unreact, myPubkey],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useReactions(): Ctx {
  const v = useContext(C);
  if (!v) {
    throw new Error("useReactions must be used inside <ReactionsProvider>");
  }
  return v;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { SimplePool, type Event as NostrEvent } from "nostr-tools";
import {
  APPROVAL_KIND,
  FEED_KIND,
  REGISTRY_KIND,
  resolveFeed,
  type FeedNote,
} from "../lib/feed";
import { useRelays } from "./useRelays";

export interface FeedState {
  notes: FeedNote[];
  loading: boolean;
}

// Subscribes to the owner's feed-note channel (kind:31239 + the owner's 30000
// registry / 4550 sign-offs / 5 deletes) on the active relays, then runs the
// SHARED trust gate (lib/feed.ts resolveFeed) — the same pure function ndisc
// and glmps run. Transport is per-app; the maths is the shared template.
//
// Phase 1 is owner-only (author filter = owner), so every note resolves as
// provenance "owner". Contributors (a wider, registry-gated author filter) are
// a later increment — see ndisc schema/current-feed-2026-06-23.md.
export function useFeed(ownerHex: string | undefined): FeedState {
  const { relays } = useRelays();
  const [notes, setNotes] = useState<FeedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const byKeyRef = useRef<Map<string, NostrEvent>>(new Map());

  useEffect(() => {
    if (!ownerHex) {
      setNotes([]);
      setLoading(false);
      return;
    }
    byKeyRef.current = new Map();
    setNotes([]);
    setLoading(true);

    const pool = new SimplePool();
    const byKey = byKeyRef.current;
    const recompute = () => setNotes(resolveFeed([...byKey.values()], ownerHex));

    const sub = pool.subscribeMany(
      relays,
      {
        kinds: [FEED_KIND, REGISTRY_KIND, APPROVAL_KIND, 5],
        authors: [ownerHex],
      },
      {
        onevent(ev) {
          // Replaceable kinds key by address; regular events (4550, 5) by id.
          // Newer created_at supersedes for a given key.
          const dTag = ev.tags.find((t) => t[0] === "d")?.[1];
          const key =
            ev.kind === FEED_KIND || ev.kind === REGISTRY_KIND
              ? `${ev.kind}:${ev.pubkey}:${dTag ?? ""}`
              : ev.id;
          const prev = byKey.get(key);
          if (!prev || ev.created_at > prev.created_at) {
            byKey.set(key, ev);
            recompute();
          }
        },
        oneose() {
          setLoading(false);
        },
      },
    );

    // Stop showing "loading" if no relay responds.
    const t = setTimeout(() => setLoading(false), 5000);

    return () => {
      clearTimeout(t);
      sub.close();
      pool.close(relays);
    };
  }, [ownerHex, relays]);

  return useMemo(() => ({ notes, loading }), [notes, loading]);
}

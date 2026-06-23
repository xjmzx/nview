import { useEffect, useMemo, useRef, useState } from "react";
import { SimplePool, type Event as NostrEvent } from "nostr-tools";
import {
  compareReleases,
  isNewerReplaceable,
  parseRelease,
  type Release,
} from "../lib/nostr";
import { RELEASE_KIND } from "../config";
import { useRelays } from "./useRelays";

type State = {
  releases: Release[];
  loading: boolean;
  eose: boolean;
};

// Subscribes to one author's kind:31237 release events plus their kind:5
// deletions, deduped (NIP-01 replaceable) and tombstoned client-side.
export function useReleases(hexPubkey: string | undefined) {
  const { relays } = useRelays();
  const [state, setState] = useState<State>({
    releases: [],
    loading: true,
    eose: false,
  });

  // Latest event per d-tag (NIP-01 replaceable dedupe).
  const latestRef = useRef<Map<string, NostrEvent>>(new Map());
  // NIP-09 deletion state — `e`-tag deletes a specific event id, `a`-tag
  // deletes a coordinate `kind:pubkey:d`. ndisc / this viewer treat an `a`
  // deletion as a permanent tombstone regardless of timestamp.
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const deletedAddrsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hexPubkey) return;
    latestRef.current = new Map();
    deletedIdsRef.current = new Set();
    deletedAddrsRef.current = new Set();
    setState({ releases: [], loading: true, eose: false });

    const pool = new SimplePool();

    // Cold launches frequently miss the first handshake to the data-heavy
    // relay. nostr-tools counts an errored/closed relay as EOSE, so the
    // aggregate `oneose` can fire with zero events and never retry — which is
    // why a first launch shows empty but a relaunch (warm connections) works.
    // We re-open the release subscription with backoff until events arrive or
    // the attempt budget is spent, mimicking that manual relaunch.
    const MAX_ATTEMPTS = 5;
    let attempt = 0;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let releasesSub: { close: () => void } | undefined;

    const coordOf = (ev: NostrEvent) => {
      const d = ev.tags.find((t) => t[0] === "d")?.[1] ?? "";
      return `${ev.kind}:${ev.pubkey}:${d}`;
    };

    const isDeleted = (ev: NostrEvent) =>
      deletedIdsRef.current.has(ev.id) ||
      deletedAddrsRef.current.has(coordOf(ev));

    const recompute = () => {
      const releases: Release[] = [];
      for (const ev of latestRef.current.values()) {
        if (isDeleted(ev)) continue;
        const parsed = parseRelease(ev);
        if (parsed) releases.push(parsed);
      }
      releases.sort(compareReleases);
      // Reveal results the moment any release parses — don't wait for EOSE,
      // and don't flash "no releases" while a retry is still pending.
      setState((s) => ({
        ...s,
        releases,
        loading: releases.length === 0 ? s.loading : false,
      }));
    };

    const openReleases = () => {
      releasesSub?.close();
      releasesSub = pool.subscribeMany(
        relays,
        { kinds: [RELEASE_KIND], authors: [hexPubkey] },
        {
          // Cap the wait so a hung relay can't stall the retry logic.
          maxWait: 4000,
          onevent(ev) {
            const dTag = ev.tags.find((t) => t[0] === "d")?.[1];
            if (!dTag) return;
            const current = latestRef.current.get(dTag);
            if (!isNewerReplaceable(current, ev)) return;
            latestRef.current.set(dTag, ev);
            recompute();
          },
          oneose() {
            if (cancelled) return;
            if (latestRef.current.size > 0) {
              setState((s) => ({ ...s, loading: false, eose: true }));
            } else if (attempt < MAX_ATTEMPTS) {
              const delay = Math.min(600 * 2 ** attempt, 6000);
              attempt += 1;
              retryTimer = setTimeout(() => {
                if (!cancelled && latestRef.current.size === 0) openReleases();
              }, delay);
            } else {
              // Budget spent and still nothing — treat as genuinely empty.
              setState((s) => ({ ...s, loading: false, eose: true }));
            }
          },
        },
      );
    };

    const deletesSub = pool.subscribeMany(
      relays,
      { kinds: [5], authors: [hexPubkey] },
      {
        onevent(ev) {
          let touched = false;
          for (const t of ev.tags) {
            if (t[0] === "e" && t[1] && !deletedIdsRef.current.has(t[1])) {
              deletedIdsRef.current.add(t[1]);
              touched = true;
            } else if (
              t[0] === "a" &&
              t[1] &&
              !deletedAddrsRef.current.has(t[1])
            ) {
              deletedAddrsRef.current.add(t[1]);
              touched = true;
            }
          }
          if (touched) recompute();
        },
      },
    );

    openReleases();

    // iOS suspends the webview when backgrounded, dropping the relay sockets.
    // On return to the foreground, re-open the subscription if we still have
    // nothing, so the list recovers without a manual relaunch.
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        !cancelled &&
        latestRef.current.size === 0
      ) {
        attempt = 0;
        openReleases();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      releasesSub?.close();
      deletesSub.close();
      pool.close(relays);
    };
  }, [hexPubkey, relays]);

  return useMemo(
    () => ({
      releases: state.releases,
      loading: state.loading,
      eose: state.eose,
    }),
    [state],
  );
}

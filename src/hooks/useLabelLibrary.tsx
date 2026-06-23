import { useEffect, useState } from "react";
import { SimplePool, type Event as NostrEvent } from "nostr-tools";
import {
  isNewerReplaceable,
  parseLabelLibrary,
  type LabelLibrary,
} from "../lib/nostr";
import { LABEL_LIBRARY_D, LABEL_LIBRARY_KIND } from "../config";
import { useRelays } from "./useRelays";

/**
 * Owner-published record-label image library (kind:31238, schema labels.v1).
 * One event per author addressed by (`disco-vault:labels`). Returns `null`
 * until the event lands (and remains `null` if the owner hasn't published
 * one). Mirror of glmps's hook — wire format and dedupe rules identical.
 *
 * Use the companion [`imageForLabel`] helper for safe lookup with a
 * graceful fallback when a label has no entry.
 */
export function useLabelLibrary(hexPubkey: string | undefined) {
  const { relays } = useRelays();
  const [library, setLibrary] = useState<LabelLibrary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hexPubkey) {
      setLoading(false);
      return;
    }
    setLibrary(null);
    setLoading(true);

    const pool = new SimplePool();
    let latest: NostrEvent | undefined;

    const sub = pool.subscribeMany(
      relays,
      {
        kinds: [LABEL_LIBRARY_KIND],
        authors: [hexPubkey],
        "#d": [LABEL_LIBRARY_D],
      },
      {
        onevent(ev) {
          if (!isNewerReplaceable(latest, ev)) return;
          latest = ev;
          setLibrary(parseLabelLibrary(ev));
        },
        oneose() {
          setLoading(false);
        },
      },
    );

    // Safety timeout — if no relay responds at all, stop showing "loading"
    // after 5s. Mirrors glmps's pattern.
    const t = setTimeout(() => setLoading(false), 5000);

    return () => {
      clearTimeout(t);
      sub.close();
      pool.close(relays);
    };
  }, [hexPubkey, relays]);

  return { library, loading };
}

/** Returns the image URL for a label name, or null when unmapped. */
export function imageForLabel(
  library: LabelLibrary | null,
  name: string | undefined,
): string | null {
  if (!library || !name) return null;
  return library.labels[name]?.image ?? null;
}

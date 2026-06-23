import { useEffect, useState } from "react";
import { SimplePool, type Event as NostrEvent } from "nostr-tools";
import { parseProfile, type Profile } from "../lib/nostr";
import { useRelays } from "./useRelays";

// Fetches one author's kind:0 metadata (name / nip05 / picture). Read-only.
export function useProfile(hexPubkey: string | undefined) {
  const { relays } = useRelays();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!hexPubkey) return;
    setProfile(null);

    const pool = new SimplePool();
    let latest: NostrEvent | undefined;

    const sub = pool.subscribeMany(
      relays,
      { kinds: [0], authors: [hexPubkey] },
      {
        onevent(ev) {
          if (!latest || ev.created_at > latest.created_at) {
            latest = ev;
            setProfile(parseProfile(ev));
          }
        },
      },
    );

    return () => {
      sub.close();
      pool.close(relays);
    };
  }, [hexPubkey, relays]);

  return profile;
}

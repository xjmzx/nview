import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_RELAYS } from "../config";

// Active relay configuration for the viewer. The discography is fetched from
// these relays; the set is user-configurable from first-run onboarding and the
// relay settings panel, persisted to localStorage (which works the same in the
// Android and iOS WebView builds — no native storage plugin needed). Falls back
// to the built-in DEFAULT_RELAYS when nothing valid is stored.
const RELAYS_KEY = "ndisc-mobile.relays";
const ONBOARDED_KEY = "ndisc-mobile.onboarded";

// Normalise a user-typed relay URL, or null if it isn't a usable ws(s) URL.
// A bare host (no scheme) is assumed secure (wss://). Trailing slash trimmed so
// duplicates collapse.
export function normaliseRelayUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const withScheme = /^wss?:\/\//i.test(s) ? s : `wss://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "wss:" && u.protocol !== "ws:") return null;
    if (!u.hostname) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// The list a Save should commit: `list` plus whatever is still sitting in the
// add-relay box, if it is a usable URL not already listed. Typing a relay and
// pressing Save without the "+" used to drop it without a word.
export function withPending(list: string[], pending: string): string[] {
  const n = normaliseRelayUrl(pending);
  return n && !list.includes(n) ? [...list, n] : list;
}

// Clean a candidate list: normalise each entry, drop invalid, dedupe, preserve
// order.
function sanitiseList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const n = normaliseRelayUrl(item);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

// Retired relays, rewritten in saved lists to the current default.
// relay.fizx.uk went with the fizx box on 2026-11-05 and no longer resolves.
const RETIRED_RELAYS: Record<string, string> = {
  "wss://relay.fizx.uk": "wss://relay.nfunc.xyz",
};

// One-shot migration of a sanitised list: each retired relay becomes its
// replacement in the same place, duplicates dropped. Idempotent.
export function migrateRetiredRelays(list: string[]): string[] {
  const out: string[] = [];
  for (const r of list) {
    const next = RETIRED_RELAYS[r] ?? r;
    if (!out.includes(next)) out.push(next);
  }
  return out;
}

// The two public relays the May 2026 first run seeded alongside what was then
// relay.fizx.uk. Neither holds this discography — checked 2026-10-02, when the
// owner key's releases were found to be unretained on both — and nothing has
// been published to them since, so an upgraded install drops them once.
//
// The drop is flagged rather than recognised by value, which is the one part
// worth not simplifying. After migrateRetiredRelays has rewritten fizx, a saved
// list reads [nfunc, nos.lol, primal] — and that is also exactly what someone
// gets by adding the two back on purpose. The cases are indistinguishable by
// value, so only a flag, which separates them by time, can tell them apart:
// prune once, record it, and anything re-added afterwards survives.
const DROPPED_PUBLIC_RELAYS = ["wss://nos.lol", "wss://relay.primal.net"];
const PRUNED_KEY = "ndisc-mobile.migrated.publicRelaysDropped";

// Drop the seeded public relays from a sanitised list, order preserved. May
// return an empty list; resolveStoredRelays falls back to DEFAULT_RELAYS.
export function prunePublicRelays(list: string[]): string[] {
  return list.filter((r) => !DROPPED_PUBLIC_RELAYS.includes(r));
}

// Everything a load decides about the stored list, kept pure so the flag
// behaviour is testable without a DOM: given the raw stored string and whether
// the one-shot prune has already run, which list to use and which, if any, to
// write back. loadRelays is the storage plumbing around it.
export function resolveStoredRelays(
  raw: string | null,
  alreadyPruned: boolean,
): { relays: string[]; writeBack: string[] | null } {
  if (!raw) return { relays: [...DEFAULT_RELAYS], writeBack: null };

  let clean: string[];
  try {
    clean = sanitiseList(JSON.parse(raw));
  } catch {
    return { relays: [...DEFAULT_RELAYS], writeBack: null };
  }

  let next = migrateRetiredRelays(clean);
  if (!alreadyPruned) next = prunePublicRelays(next);

  // An empty result means the stored list held nothing but dropped relays;
  // fall back to the default and persist it, so storage and the live list agree.
  const relays = next.length > 0 ? next : [...DEFAULT_RELAYS];
  const changed = relays.join("\n") !== clean.join("\n");
  return { relays, writeBack: changed ? relays : null };
}

function loadRelays(): string[] {
  // Default to "already pruned" when storage is unreadable: there is then no
  // saved list to prune, and no way to record the pass if we ran it.
  let alreadyPruned = true;
  let raw: string | null = null;
  try {
    alreadyPruned = localStorage.getItem(PRUNED_KEY) === "1";
    raw = localStorage.getItem(RELAYS_KEY);
  } catch {
    /* ignore */
  }

  const { relays, writeBack } = resolveStoredRelays(raw, alreadyPruned);

  if (writeBack) {
    try {
      localStorage.setItem(RELAYS_KEY, JSON.stringify(writeBack));
    } catch {
      /* ignore */
    }
  }

  // Record the pass even when nothing was stored to prune: a fresh install must
  // not drop these relays from a list its owner builds later.
  if (!alreadyPruned) {
    try {
      localStorage.setItem(PRUNED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return relays;
}

type RelaysCtx = {
  /** The live relay list the data hooks subscribe to (always ≥ 1). */
  relays: string[];
  /** Replace the relay list (sanitised; an empty result resets to defaults). */
  setRelays: (next: string[]) => void;
  /** Restore the built-in DEFAULT_RELAYS. */
  resetToDefaults: () => void;
  /** Whether first-run onboarding has been completed. */
  onboarded: boolean;
  /** Persist the chosen relays and mark onboarding done. */
  completeOnboarding: (next: string[]) => void;
};

const RelaysContext = createContext<RelaysCtx | null>(null);

export function RelaysProvider({ children }: { children: ReactNode }) {
  const [relays, setRelaysState] = useState<string[]>(loadRelays);
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const persist = useCallback((next: string[]) => {
    const clean = sanitiseList(next);
    const final = clean.length > 0 ? clean : [...DEFAULT_RELAYS];
    setRelaysState(final);
    try {
      localStorage.setItem(RELAYS_KEY, JSON.stringify(final));
    } catch {
      /* ignore */
    }
  }, []);

  const resetToDefaults = useCallback(
    () => persist([...DEFAULT_RELAYS]),
    [persist],
  );

  const completeOnboarding = useCallback(
    (next: string[]) => {
      persist(next);
      setOnboarded(true);
      try {
        localStorage.setItem(ONBOARDED_KEY, "1");
      } catch {
        /* ignore */
      }
    },
    [persist],
  );

  const value = useMemo<RelaysCtx>(
    () => ({
      relays,
      setRelays: persist,
      resetToDefaults,
      onboarded,
      completeOnboarding,
    }),
    [relays, persist, resetToDefaults, onboarded, completeOnboarding],
  );

  return (
    <RelaysContext.Provider value={value}>{children}</RelaysContext.Provider>
  );
}

export function useRelays(): RelaysCtx {
  const ctx = useContext(RelaysContext);
  if (!ctx) throw new Error("useRelays must be used within a RelaysProvider");
  return ctx;
}

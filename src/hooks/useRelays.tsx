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

function loadRelays(): string[] {
  try {
    const raw = localStorage.getItem(RELAYS_KEY);
    if (raw) {
      const clean = sanitiseList(JSON.parse(raw));
      if (clean.length > 0) return clean;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return [...DEFAULT_RELAYS];
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

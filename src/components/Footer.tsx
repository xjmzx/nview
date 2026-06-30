import { OWNER_NPUB } from "../config";
import { useRelays } from "../hooks/useRelays";

// Mirrors the desktop ndisc footer — what-it-is / whose-data / where-from —
// as a left-aligned, padded band that wraps cleanly on a narrow screen.
const ownerShort = `${OWNER_NPUB.slice(0, 12)}…${OWNER_NPUB.slice(-6)}`;

export function Footer() {
  const { relays } = useRelays();
  const relayHosts = relays.map((r) => r.replace(/^wss?:\/\//, "")).join(" · ");

  return (
    <footer
      className="mt-8 border-t border-surface bg-surface/40 px-4 pt-3
                 pb-[max(1.25rem,env(safe-area-inset-bottom))]
                 text-[11px] leading-relaxed text-muted"
    >
      <p className="font-semibold tracking-tight text-fg/80">
        n<span className="text-accent">view</span>
      </p>
      <p className="mt-1">
        <span className="text-muted">viewing </span>
        <span className="font-mono text-mauve break-all">{ownerShort}</span>
      </p>
      <p className="mt-1 break-words">
        <span className="text-muted">relays </span>
        <span className="font-mono text-fg/55">{relayHosts}</span>
      </p>
    </footer>
  );
}

import { useState } from "react";
import { Radio } from "lucide-react";
import { DEFAULT_RELAYS } from "../config";
import { useRelays } from "../hooks/useRelays";
import { RelayListEditor } from "./RelayListEditor";

// First-run screen — choose the Nostr relays the viewer reads the discography
// from. Seeded with the built-in defaults; the user can keep them, trim to
// their own, or add more. Pure web UI (no native plugin) so it renders the same
// in the Android and iOS WebView builds.
export function Onboarding() {
  const { completeOnboarding } = useRelays();
  const [relays, setRelays] = useState<string[]>(() => [...DEFAULT_RELAYS]);

  const n = relays.length;
  // On first run the list already IS the defaults, so a separate "use defaults"
  // button would duplicate the primary CTA. Only offer a reset once the user
  // has actually changed the list.
  const atDefaults =
    n === DEFAULT_RELAYS.length &&
    relays.every((r) => (DEFAULT_RELAYS as readonly string[]).includes(r));

  return (
    <div
      className="min-h-screen w-full max-w-md md:max-w-xl mx-auto bg-bg text-fg
                 flex flex-col px-5
                 pt-[max(2rem,env(safe-area-inset-top))]
                 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/15 text-accent">
              <Radio size={18} />
            </span>
            <h1 className="text-xl font-bold tracking-tight">
              n<span className="text-accent">view</span>
            </h1>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Discographies on the Nostr network.
            <br />
            Pick relays to connect to and fetch from.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <RelayListEditor value={relays} onChange={setRelays} />
          <p className="px-1 text-[12px] text-muted leading-relaxed">
            At least one relay is required. Two are helpful for coverage; three
            is a good spread. The default set includes{" "}
            <span className="font-mono text-fg/60">relay.fizx.uk</span>, where
            this discography is published.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={n === 0}
            onClick={() => completeOnboarding(relays)}
            className="w-full py-3 rounded-xl bg-accent text-bg font-semibold
                       transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {n === 0
              ? "Add a relay to continue"
              : `Continue with ${n} relay${n === 1 ? "" : "s"}`}
          </button>
          {!atDefaults && (
            <button
              type="button"
              onClick={() => setRelays([...DEFAULT_RELAYS])}
              className="self-center py-1 text-xs text-mauve/80 hover:text-mauve
                         transition-colors"
            >
              Reset to defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

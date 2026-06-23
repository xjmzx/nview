import { useState } from "react";
import { X } from "lucide-react";
import { DEFAULT_RELAYS } from "../config";
import { useRelays } from "../hooks/useRelays";
import { RelayListEditor } from "./RelayListEditor";

type Props = { onClose: () => void };

// Post-onboarding relay editor — the live settings panel the reactive relay
// context enables. Edits a local draft and commits on Save, so changing relays
// re-subscribes the data hooks. Reuses the same RelayListEditor as onboarding.
// Mounted only while open (see App), so the draft seeds fresh from the live
// list each time via useState — no re-seeding effect needed.
export function RelaySettings({ onClose }: Props) {
  const { relays, setRelays } = useRelays();
  const [draft, setDraft] = useState<string[]>(relays);

  function save() {
    if (draft.length === 0) return;
    setRelays(draft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 px-4 pb-[env(safe-area-inset-bottom)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-bg border border-surface rounded-t-2xl
                   sm:rounded-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Relays</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-muted hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <RelayListEditor value={draft} onChange={setDraft} />
        <p className="text-[12px] text-muted leading-relaxed">
          At least one relay. Two are helpful for coverage; three is a good
          spread.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={draft.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-accent text-bg font-semibold
                       transition-opacity disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setDraft([...DEFAULT_RELAYS])}
            className="px-3 py-2.5 rounded-xl bg-surface text-sm text-fg/80
                       hover:text-fg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

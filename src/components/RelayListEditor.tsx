import { useState } from "react";
import { Plus, X } from "lucide-react";
import { normaliseRelayUrl } from "../hooks/useRelays";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

// Reusable relay-list editor: add / remove wss:// URLs with light validation
// and dedupe. Shared by first-run Onboarding and the relay settings panel.
// Permits an empty list — the caller gates its primary action on length > 0 and
// shows the "at least one" guidance.
export function RelayListEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function add() {
    const n = normaliseRelayUrl(draft);
    if (!n) {
      setErr("Enter a valid relay URL (wss://…)");
      return;
    }
    if (value.includes(n)) {
      setErr("That relay is already in the list");
      return;
    }
    onChange([...value, n]);
    setDraft("");
    setErr(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {value.map((r) => (
          <li
            key={r}
            className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2"
          >
            <span className="flex-1 min-w-0 truncate font-mono text-[13px] text-fg/85">
              {r.replace(/^wss?:\/\//, "")}
            </span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== r))}
              aria-label={`Remove ${r}`}
              className="shrink-0 p-1 rounded text-muted hover:text-accent transition-colors"
            >
              <X size={15} />
            </button>
          </li>
        ))}
        {value.length === 0 && (
          <li className="px-1 py-2 text-[12px] text-muted">
            No relays — add at least one below.
          </li>
        )}
      </ul>

      <div className="flex items-stretch gap-2">
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="wss://relay.example.com"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface text-fg text-sm
                     font-mono outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add relay"
          className="shrink-0 px-3 grid place-items-center rounded-lg bg-mauve/15
                     text-mauve hover:bg-mauve hover:text-bg transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
      {err && (
        <p className="px-1 text-[12px]" style={{ color: "#f87171" }}>
          {err}
        </p>
      )}
    </div>
  );
}

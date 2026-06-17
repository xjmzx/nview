export type ViewMode = "grid" | "list";

type Props = {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
};

// Compact grid/list switch. Mirrors the glmps ViewToggle (trimmed to two
// modes for mobile). `list` is a denser single-line layout, handy on a phone.
export function ViewToggle({ value, onChange, className = "" }: Props) {
  return (
    <div
      className={
        "inline-flex rounded-md border border-surface overflow-hidden shrink-0 " +
        className
      }
    >
      <Btn active={value === "grid"} onClick={() => onChange("grid")} label="grid view">
        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <rect x="1" y="1" width="4" height="4" rx="0.5" />
          <rect x="7" y="1" width="4" height="4" rx="0.5" />
          <rect x="1" y="7" width="4" height="4" rx="0.5" />
          <rect x="7" y="7" width="4" height="4" rx="0.5" />
        </svg>
      </Btn>
      <Btn active={value === "list"} onClick={() => onChange("list")} label="list view">
        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <rect x="1" y="2" width="10" height="1.5" rx="0.5" />
          <rect x="1" y="5.25" width="10" height="1.5" rx="0.5" />
          <rect x="1" y="8.5" width="10" height="1.5" rx="0.5" />
        </svg>
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={
        "px-1.5 py-1 grid place-items-center transition-colors " +
        (active
          ? "bg-accent/20 text-accent"
          : "text-muted hover:text-fg")
      }
    >
      {children}
    </button>
  );
}

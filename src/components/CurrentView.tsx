import { useMemo } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { CoverArt } from "./CoverArt";
import { hostnameOf, type Release } from "../lib/nostr";
import type { FeedNote } from "../lib/feed";

interface Props {
  notes: FeedNote[];
  loading: boolean;
  releases: Release[];
  onSelect: (release: Release) => void;
}

// A feed note's `a` reference is `31237:<ownerhex>:<release-d>`; pull the
// release-d, which is the viewer's Release.d (e.g. "disco-vault:314").
function releaseDOf(ref: string | null): string | undefined {
  if (!ref) return undefined;
  const parts = ref.split(":");
  return parts.length >= 3 ? parts.slice(2).join(":") : undefined;
}

// `current` — the live feed-note channel (kind:31239) matched against the local
// discography. Read-only viewer. The feed read + trust gate are the SHARED
// template (lib/feed.ts + useFeed); this is ndisc.view's presentation. Each
// note hydrates its referenced release from the already-loaded 31237s.
export function CurrentView({ notes, loading, releases, onSelect }: Props) {
  const byD = useMemo(() => {
    const m = new Map<string, Release>();
    for (const r of releases) m.set(r.d, r);
    return m;
  }, [releases]);

  return (
    <main className="flex-1 px-4 py-3">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-sm text-fg">
          current <span className="text-muted">/ feed</span>
        </h2>
        {notes.length > 0 && (
          <span className="font-mono text-[11px] text-muted tabular-nums">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        )}
      </div>

      {loading && notes.length === 0 ? (
        <p className="text-muted text-sm py-12 text-center">listening…</p>
      ) : notes.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-fg/70">Nothing here yet</p>
          <p className="text-xs text-muted max-w-xs leading-relaxed">
            Curated picks &amp; new releases will appear here as they're posted.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <FeedCard
              key={n.address}
              note={n}
              release={byD.get(releaseDOf(n.release) ?? "")}
              hasRef={!!n.release}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function FeedCard({
  note,
  release,
  hasRef,
  onSelect,
}: {
  note: FeedNote;
  release?: Release;
  hasRef: boolean;
  onSelect: (r: Release) => void;
}) {
  const lead = note.images[0];
  return (
    <li className="rounded-lg bg-surface p-3 flex flex-col gap-2">
      {/* Match column: the referenced release (tap to open), or a flag when the
          note points at a release this viewer doesn't have. */}
      {release ? (
        <button
          type="button"
          onClick={() => onSelect(release)}
          className="flex items-center gap-3 text-left active:opacity-70 transition-opacity"
        >
          <CoverArt
            src={release.image}
            alt={release.title}
            className="shrink-0 w-12 h-12 rounded-md"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium truncate">
              {release.artist}
            </span>
            <span className="block text-sm text-fg/70 truncate">
              {release.title}
              {release.year ? ` (${release.year})` : ""}
            </span>
          </span>
        </button>
      ) : hasRef ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <AlertTriangle size={12} /> references a release not in view
        </span>
      ) : null}

      {note.title && <p className="text-sm font-semibold">{note.title}</p>}

      {lead && (
        <img
          src={lead}
          alt=""
          loading="lazy"
          className="w-full rounded-md max-h-72 object-cover"
        />
      )}

      {note.body && (
        <p className="text-sm text-fg/80 whitespace-pre-wrap">{note.body}</p>
      )}

      {(note.topics.length > 0 || note.links.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {note.topics.map((t) => (
            <span key={t} className="text-[11px] text-muted">
              #{t}
            </span>
          ))}
          {note.links.map((l) => (
            <a
              key={l}
              href={l}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-accent underline inline-flex items-center gap-1 truncate max-w-[12rem]"
            >
              <ExternalLink size={10} /> {hostnameOf(l) ?? l}
            </a>
          ))}
        </div>
      )}

      {note.provenance !== "owner" && (
        <span className="text-[10px] uppercase tracking-wide text-mauve">
          {note.provenance}
        </span>
      )}
    </li>
  );
}

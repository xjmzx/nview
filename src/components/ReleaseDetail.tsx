import { useState } from "react";
import { Heart } from "lucide-react";
import { CoverArt } from "./CoverArt";
import { StarRow } from "./StarRow";
import { GenreDotChip } from "./GenreDotChip";
import { LeafDots } from "./LeafDots";
import { useReactions } from "../hooks/useReactions";
import { RELEASE_KIND } from "../config";
import { externalRef, hostnameOf, type Release } from "../lib/nostr";
import { sourcePlatform } from "../lib/source";

interface Props {
  release: Release;
  onRequireLogin: () => void;
}

// ♥ a release. Logged out, a tap opens the login sheet; logged in, it
// posts / revokes a kind:7 reaction.
function ReactionButton({ release, onRequireLogin }: Props) {
  const { forAddr, react, unreact, canReact } = useReactions();
  const addr = `${RELEASE_KIND}:${release.pubkey}:${release.d}`;
  const { up, mine } = forAddr(addr);
  const [busy, setBusy] = useState(false);

  async function onTap() {
    if (!canReact) {
      onRequireLogin();
      return;
    }
    setBusy(true);
    try {
      if (mine) await unreact(addr);
      else await react(addr);
    } catch {
      /* swallow — a failed publish just leaves the count as-is */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 bg-surface active:bg-surfaceHover transition-colors
                 disabled:opacity-50"
    >
      <Heart
        size={15}
        className={mine ? "text-mauve" : "text-muted"}
        fill={mine ? "currentColor" : "none"}
      />
      <span className="text-sm tabular-nums">{up}</span>
    </button>
  );
}

// One label/value pair inside the meta strip. Absent values show an em-dash
// so the two columns keep their shape.
function MetaCell({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-fg/90 truncate" title={value || undefined}>
        {value || "—"}
      </dd>
    </>
  );
}

// Slim two-column metadata strip beneath the cover — replaces the tall
// field list. Column 1: year / medium / format; column 2: label / country
// / category.
function MetaBar({ release }: { release: Release }) {
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-x-5 rounded-lg bg-surface/60
                 px-3 py-2.5"
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        <MetaCell label="year" value={release.year} />
        <MetaCell label="medium" value={release.medium} />
        <MetaCell label="format" value={release.format} />
        <dt className="text-muted">tracks</dt>
        <dd className="text-fg/90">
          {release.tracks != null ? <LeafDots n={release.tracks} /> : "—"}
        </dd>
      </dl>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        <MetaCell label="label" value={release.label} />
        <MetaCell label="country" value={release.country} />
        <MetaCell label="category" value={release.category} />
        <MetaCell
          label="discs"
          value={
            release.discs && release.discs > 1 ? String(release.discs) : undefined
          }
        />
      </dl>
    </div>
  );
}

// Detail body for one release. The app header is owned by App; this renders
// only the scrolling content beneath it.
export function ReleaseDetail({ release, onRequireLogin }: Props) {
  const { forAddr } = useReactions();
  const addr = `${RELEASE_KIND}:${release.pubkey}:${release.d}`;
  const { up, down } = forAddr(addr);

  // Drop the bare "discogs.com" source link when a Discogs external-id pill
  // already covers it — keep the canonical pill, lose the redundant link.
  const hasDiscogsId = release.externalIds.some(
    (i) => externalRef(i)?.kind === "discogs",
  );
  const showSource =
    !!release.source &&
    !(hostnameOf(release.source) === "discogs.com" && hasDiscogsId);

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4">
      <CoverArt
        src={release.image}
        alt={release.title}
        className="w-full max-w-[16rem] aspect-square rounded-xl mb-4 mx-auto"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">{release.artist}</h2>
          <p className="text-base text-fg/75">{release.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <StarRow up={up} down={down} size="md" showWhenUnrated />
            <GenreDotChip genres={release.genres} />
          </div>
        </div>
        <ReactionButton release={release} onRequireLogin={onRequireLogin} />
      </div>

      <MetaBar release={release} />

      {showSource && (() => {
        const platform = sourcePlatform(release);
        return (
          <a
            href={release.source}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-accent underline break-all"
            style={platform ? { color: platform.color } : undefined}
          >
            {platform?.label ?? hostnameOf(release.source) ?? release.source}
          </a>
        );
      })()}

      {release.externalIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {release.externalIds.map((i) => {
            const ref = externalRef(i);
            return ref ? (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/[0.16] px-2 py-1 text-[11px] font-mono text-white/75 hover:text-white transition-colors"
              >
                {ref.label} ↗
              </a>
            ) : (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-mono text-white/45"
              >
                {i}
              </span>
            );
          })}
        </div>
      )}

      {release.notes && (
        <p className="mt-4 text-sm text-fg/80 whitespace-pre-wrap">
          {release.notes}
        </p>
      )}
    </main>
  );
}

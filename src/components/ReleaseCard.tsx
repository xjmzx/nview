import { CoverArt } from "./CoverArt";
import { StarRow } from "./StarRow";
import { GenreDotChip } from "./GenreDotChip";
import { useReactions } from "../hooks/useReactions";
import { RELEASE_KIND } from "../config";
import type { Release } from "../lib/nostr";

// A release counts as "newly published" if its event is younger than this.
const NEW_WINDOW_DAYS = 1;

// Physical/digital indicator — mirrors the desktop RELEASES medium badge.
function MediumBadge({ medium }: { medium: string }) {
  const m = medium.trim().toLowerCase();
  const tone =
    m === "physical"
      ? "bg-physical/20 text-physical"
      : m === "digital"
        ? "bg-digital/20 text-digital"
        : "bg-surfaceHover text-muted";
  return (
    <span
      className={
        "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold " +
        "uppercase tracking-wide " +
        tone
      }
    >
      {medium}
    </span>
  );
}

// Nostr-published mark. Every release here is published by definition, so the
// default is a quiet provenance dot; a recently-published one is promoted to
// a "new" pill.
function PublishMark({ createdAt }: { createdAt: number }) {
  const ageDays = (Date.now() / 1000 - createdAt) / 86400;
  if (ageDays >= 0 && ageDays < NEW_WINDOW_DAYS) {
    return (
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase
                   tracking-wide bg-accent/20 text-accent"
      >
        new
      </span>
    );
  }
  return (
    <span
      title="published to Nostr"
      aria-label="published to Nostr"
      className="w-1.5 h-1.5 rounded-full bg-mauve/70"
    />
  );
}

interface Props {
  release: Release;
  onSelect: () => void;
}

// One row in the discography list — cover thumb, artist / title / meta, and a
// right rail with the published mark and reaction count.
export function ReleaseCard({ release, onSelect }: Props) {
  const { forAddr } = useReactions();
  const addr = `${RELEASE_KIND}:${release.pubkey}:${release.d}`;
  const { up, down } = forAddr(addr);

  const meta = [release.year, release.formatGroup ?? release.format, release.label]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-stretch gap-3 p-2 rounded-lg bg-surface
                   active:bg-surfaceHover transition-colors text-left"
      >
        <CoverArt
          src={release.image}
          alt={release.title}
          className="shrink-0 w-14 h-14 rounded-md self-center"
        />
        <div className="min-w-0 flex-1 self-center">
          <p className="text-sm font-medium truncate">{release.artist}</p>
          <p className="text-sm text-fg/75 truncate">{release.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {release.medium && <MediumBadge medium={release.medium} />}
            <GenreDotChip genres={release.genres} />
            {meta && (
              <span className="text-[11px] text-muted truncate">{meta}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end justify-between py-0.5">
          <PublishMark createdAt={release.createdAt} />
          <div className="flex flex-col items-end gap-0.5">
            <StarRow up={up} down={down} size="xs" />
            {up > 0 && (
              <span className="text-[11px] whitespace-nowrap">
                <span className="text-mauve">♥</span>{" "}
                <span className="text-muted tabular-nums">{up}</span>
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

import { CoverArt } from "./CoverArt";
import { StarRow } from "./StarRow";
import { GenreDotChip } from "./GenreDotChip";
import { useReactions } from "../hooks/useReactions";
import { RELEASE_KIND } from "../config";
import type { Release } from "../lib/nostr";

interface Props {
  release: Release;
  onSelect: () => void;
}

// Dense single-line list row — the `list` view-mode counterpart to the
// roomier ReleaseCard. Thumb + artist/title on one line + a right rail of
// genre dots, star rating, and reaction count.
export function ReleaseRow({ release, onSelect }: Props) {
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
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md
                   bg-surface active:bg-surfaceHover transition-colors text-left"
      >
        <CoverArt
          src={release.image}
          alt={release.title}
          className="shrink-0 w-9 h-9 rounded"
        />
        <span className="min-w-0 flex-1 truncate" title={meta || undefined}>
          <span className="text-sm font-medium">{release.artist}</span>
          <span className="text-sm text-fg/55"> — {release.title}</span>
        </span>
        <GenreDotChip genres={release.genres} />
        <StarRow up={up} down={down} size="xs" className="shrink-0" />
        {up > 0 && (
          <span className="shrink-0 text-[11px] whitespace-nowrap">
            <span className="text-mauve">♥</span>{" "}
            <span className="text-muted tabular-nums">{up}</span>
          </span>
        )}
      </button>
    </li>
  );
}

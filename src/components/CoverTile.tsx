import { CoverArt } from "./CoverArt";
import type { Release } from "../lib/nostr";

interface Props {
  release: Release;
  onSelect: () => void;
}

// Image-only cover-wall tile: just the artwork and a tiny medium dot. Every
// other detail expands on tap. Mirrors the glmps `grid-xs` view.
export function CoverTile({ release, onSelect }: Props) {
  const isPhysical = release.medium?.trim().toLowerCase() === "physical";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        title={`${release.artist} – ${release.title}`}
        className="group relative block w-full aspect-square rounded-md
                   overflow-hidden bg-surface active:opacity-80 transition"
      >
        <CoverArt
          src={release.image}
          alt={release.title}
          className="w-full h-full"
        />
        <span
          aria-hidden="true"
          title={isPhysical ? "physical release" : "digital release"}
          className={
            "absolute top-1 left-1 w-1.5 h-1.5 rounded-full " +
            (isPhysical ? "bg-physical" : "bg-digital")
          }
        />
      </button>
    </li>
  );
}

import { genreColor, genreLabel, type GenreSlug } from "../lib/genre";

type Props = {
  genres: readonly GenreSlug[];
  className?: string;
};

// Compact pill of up-to-3 coloured dots for a release's genre slots. Returns
// null when there are no genres. Ported from the glmps web viewer.
export function GenreDotChip({ genres, className = "" }: Props) {
  if (genres.length === 0) return null;
  return (
    <span
      className={
        "inline-flex items-center gap-px shrink-0 px-1.5 py-0.5 rounded-full " +
        "border border-fg/10 bg-black/40 " +
        className
      }
      title={genres.map(genreLabel).join(" · ")}
    >
      {genres.map((g) => (
        <span
          key={g}
          className="w-2 h-2 rounded-full ring-1 ring-fg/10"
          style={{ backgroundColor: genreColor(g) }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

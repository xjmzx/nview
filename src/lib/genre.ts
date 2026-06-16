/**
 * release.v2 genre slug constants + helpers. Ported from the glmps web viewer
 * so genre handling stays identical across the websites and this app.
 *
 * Source of truth: schema/release.v2.json. Validation policy is strict-but-
 * recoverable: unknown slugs are dropped silently, never thrown.
 */

export const GENRE_MAINS = [
  "ambient",
  "classical-folk",
  "downtempo",
  "electronic",
  "experimental",
  "funk",
  "hip-hop",
  "jazz",
  "pop",
  "reggae",
  "rock",
  "soundtrack",
] as const;

export const GENRE_ELECTRONIC_SUBS = [
  "acid",
  "bass",
  "breaks",
  "dnb-jungle",
  "drone-noise",
  "dub",
  "electro",
  "footwork-trap",
  "house",
  "techno",
] as const;

export type GenreMain = (typeof GENRE_MAINS)[number];
export type GenreElectronicSub = (typeof GENRE_ELECTRONIC_SUBS)[number];
export type GenreSlug = GenreMain | GenreElectronicSub;

// Canonical display/sort order — mains first, then electronic subs.
export const GENRE_ORDER: readonly GenreSlug[] = [
  ...GENRE_MAINS,
  ...GENRE_ELECTRONIC_SUBS,
];

const KNOWN: ReadonlySet<string> = new Set<string>(GENRE_ORDER);

export function isGenreSlug(s: string): s is GenreSlug {
  return KNOWN.has(s);
}

// Wire-to-display: `soundtrack` reads as "film"; a fixed set of compound
// slugs render with a slash. `hip-hop` is a single name and passes verbatim.
const DISPLAY_OVERRIDES: Record<string, string> = {
  soundtrack: "film",
};
const SLASH_DISPLAY_SLUGS = new Set<string>([
  "classical-folk",
  "dnb-jungle",
  "drone-noise",
  "footwork-trap",
]);

export function genreLabel(slug: string): string {
  const override = DISPLAY_OVERRIDES[slug];
  if (override) return override;
  return SLASH_DISPLAY_SLUGS.has(slug) ? slug.replace(/-/g, "/") : slug;
}

/** CSS colour for a genre slug — see the `--c-g-*` vars in index.css. */
export function genreColor(slug: string): string {
  return `rgb(var(--c-g-${slug}))`;
}

/**
 * Apply release.v2 slot semantics on read: unknown slugs dropped, duplicates
 * collapsed to first occurrence, capped at 3 slots, order preserved.
 */
export function normaliseGenres(raw: readonly string[]): GenreSlug[] {
  const out: GenreSlug[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (out.length >= 3) break;
    if (!isGenreSlug(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

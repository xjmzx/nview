/**
 * release.v2 genre slug constants + helpers. Ported from the glmps web viewer
 * so genre handling stays identical across the websites and this app.
 *
 * Source of truth: schema/release.v2.json — keep this file in sync with the
 * grouped `genreSlugs` (acoustic / electronic / bridge / tertiary). The
 * grouping is semantic + palette ONLY — not a hierarchy; all 41 active slugs
 * are pure peers. Validation policy is strict-but-recoverable: unknown slugs
 * are dropped silently, never thrown.
 *
 * The four original compound slash-pairs were retired in the 2026-06
 * restructure (split/collapsed into atomic slugs). They live on in
 * GENRE_DEPRECATED: never emitted on new events, but still VALID for reading
 * legacy events and cross-relay copies, where they render with a slash (see
 * genreLabel).
 */

// Primary / acoustic family — muted, earthy.
export const GENRE_ACOUSTIC = [
  "ambient",
  "blues",
  "classical",
  "disco",
  "experimental",
  "folk",
  "funk",
  "hip-hop",
  "jazz",
  "latin",
  "metal",
  "pop",
  "reggae",
  "rnb",
  "rock",
  "soul",
  "soundtrack",
  "spoken",
] as const;

// Secondary / electronic family — vivid, spread across the hue wheel.
export const GENRE_ELECTRONIC = [
  "acid",
  "bass",
  "breaks",
  "dnb",
  "downtempo",
  "electro",
  "electronic",
  "footwork",
  "garage",
  "house",
  "jungle",
  "minimal",
  "techno",
] as const;

// Bridge — sit between the acoustic and electronic families, own hues.
export const GENRE_BRIDGE = ["dub", "noise"] as const;

// Tertiary / optional — cross-cutting styles.
export const GENRE_TERTIARY = [
  "abstract",
  "boom-bap",
  "conscious",
  "lo-fi",
  "trance",
  "trap",
  "turntablism",
  "world",
] as const;

// Retired slugs — never emitted; valid for legacy reads only. The four compound
// slash-pairs (display with a slash) plus the 2026-06b 1:1 renames poetry and
// spiritual (display verbatim; remapped to spoken / conscious).
export const GENRE_DEPRECATED = [
  "classical-folk",
  "dnb-jungle",
  "drone-noise",
  "footwork-trap",
  "poetry",
  "spiritual",
] as const;

// Picker / display order: acoustic → electronic → bridge → tertiary.
export const GENRE_ORDER = [
  ...GENRE_ACOUSTIC,
  ...GENRE_ELECTRONIC,
  ...GENRE_BRIDGE,
  ...GENRE_TERTIARY,
] as const;

export type GenreSlug =
  | (typeof GENRE_ORDER)[number]
  | (typeof GENRE_DEPRECATED)[number];

// Readable set = active (emittable) + deprecated (legacy-only).
const KNOWN: ReadonlySet<string> = new Set<string>([
  ...GENRE_ORDER,
  ...GENRE_DEPRECATED,
]);

export function isGenreSlug(s: string): s is GenreSlug {
  return KNOWN.has(s);
}

/**
 * Wire-to-display rule for human-facing UI.
 *
 * 1. Per-slug overrides: the wire keeps the schema-canonical slug; only the
 *    displayed label changes. `soundtrack` reads as "film" (glmps-side
 *    cosmetic — doesn't affect filter matching) and `rnb` reads as "R&B".
 * 2. Legacy slash-display: the retired compound pairs render with a slash
 *    (`classical-folk` → `classical/folk`, etc.) when encountered in legacy
 *    events. Set-gated, not a blind regex, so atomic hyphen slugs like
 *    `hip-hop`, `lo-fi`, and `boom-bap` render verbatim.
 * 3. Everything else passes through unchanged.
 */
const DISPLAY_OVERRIDES: Record<string, string> = {
  soundtrack: "film",
  rnb: "R&B",
};

const LEGACY_SLASH = new Set<string>([
  "classical-folk",
  "dnb-jungle",
  "drone-noise",
  "footwork-trap",
]);

export function genreLabel(slug: string): string {
  const override = DISPLAY_OVERRIDES[slug];
  if (override) return override;
  return LEGACY_SLASH.has(slug) ? slug.replace(/-/g, "/") : slug;
}

/** CSS colour for a genre slug — see the `--c-g-*` vars in index.css. */
export function genreColor(slug: string): string {
  return `rgb(var(--c-g-${slug}))`;
}

/**
 * Apply release.v2 slot semantics on read: unknown slugs dropped, duplicates
 * collapsed to first occurrence, capped at 5 slots (release.v2 `genreInvariants.slotCap`), order preserved.
 *
 * All slugs are pure peers — no parent/sub gating. Deprecated compound pairs
 * still parse (they're in KNOWN) so legacy events keep their genres.
 */
export function normaliseGenres(raw: readonly string[]): GenreSlug[] {
  const out: GenreSlug[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (out.length >= 5) break;
    if (!isGenreSlug(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

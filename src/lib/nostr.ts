// Release.v1 event parsing — ported verbatim from the glmps web viewer so the
// mobile viewer and the websites parse the kind:31237 / kind:5 events through
// exactly the same code. Canonical contract: ndisc schema/release.v1.json.
import type { Event as NostrEvent } from "nostr-tools";
import { nip19 } from "nostr-tools";
import { type GenreSlug, normaliseGenres } from "./genre";

export type Release = {
  id: string;
  pubkey: string;
  createdAt: number;
  d: string;
  title: string;
  artist: string;
  medium?: string;
  format?: string; // raw Discogs descriptor, e.g. `12", EP, Ltd, Num, Cle`
  formatGroup?: string; // collapsed bucket from FORMAT_GROUP_ORDER
  year?: string;
  tracks?: number; // release.v2 additive — expected total tracks for the release
  discs?: number; // release.v2 additive — total disc count (Discogs-derived); surfaced only when > 1
  video?: number; // release.v2 additive — count of A/V files; presence is the signal (surfaced when ≥ 1)
  label?: string;
  catalog?: string;
  country?: string;
  condition?: string;
  type?: string; // music | sample | stem | field-recording | message | other
  category?: string; // album | ep | single | compilation | mix | live | soundtrack | bootleg | miscellaneous
  source?: string; // outbound http(s) URL: Discogs release, Bandcamp, label store, etc.
  externalIds: string[];
  tags: string[];
  // release.v2 — ordered 0–3 genre slots (slot 0 = primary). Empty on v1.
  genres: GenreSlug[];
  image?: string;
  notes: string;
  event: NostrEvent;
};

export type Profile = {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  website?: string;
  lud16?: string;
};

export function getTag(event: NostrEvent, name: string): string | undefined {
  const tag = event.tags.find((t) => t[0] === name);
  return tag?.[1] || undefined;
}

function sourceUrlOf(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type ExternalRef = { kind: string; label: string; url: string };

// Map a release `i` external-id (e.g. "discogs:release:12345") to a labelled
// outbound link, or null when the scheme isn't recognised so the caller can
// fall back to the raw string. Discogs is the only catalog scheme ndisc emits;
// platform provenance like Bandcamp lives in the `source` tag (see source.ts),
// not here.
export function externalRef(id: string): ExternalRef | null {
  const m = id.match(/^discogs:release:(.+)$/i);
  if (!m) return null;
  const ref = m[1].trim();
  if (!ref) return null;
  return {
    kind: "discogs",
    label: "Discogs",
    url: `https://www.discogs.com/release/${encodeURIComponent(ref)}`,
  };
}

export function getAllTags(event: NostrEvent, name: string): string[] {
  return event.tags
    .filter((t) => t[0] === name)
    .map((t) => t[1])
    .filter((v): v is string => Boolean(v));
}

export const FORMAT_GROUP_ORDER = [
  '7"',
  '10"',
  '12"',
  "Vinyl Box-set",
  "CD",
  "Cassette",
  "Lossless",
  "MP3",
];

/**
 * Collapse a raw Discogs format descriptor (`12", EP, Ltd, Num, Cle`) into
 * one of the eight display buckets in FORMAT_GROUP_ORDER. Returns undefined
 * for an empty/unrecognized descriptor so it drops out of the facet
 * entirely. Pressing-variant qualifiers (colored, limited, promo, reissue,
 * multi-disc) all fold into the size bucket — this is a display-layer
 * sieve, not a re-tagging of the underlying release.
 */
export function formatGroup(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();

  // Digital — keyed off the codec name, not the medium tag.
  if (/\b(?:flac|aiff|wav)\b/.test(lower)) return "Lossless";
  if (/\bmp3\b/.test(lower)) return "MP3";

  // Physical — split the descriptor into whole tokens.
  const tokens = s
    .split(/[,+]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const has = (...needles: string[]) =>
    tokens.some((t) => needles.includes(t));

  if (has("box")) return "Vinyl Box-set";
  if (has("cass")) return "Cassette";
  if (has("cd")) return "CD";

  // Multi-disc folds into the base size bucket; `lp` is a 12" alias.
  for (const t of tokens) {
    const m = t.match(/^(\d+)x(12"|lp|10"|7")$/);
    if (m) {
      const size = m[2];
      if (size === '7"') return '7"';
      if (size === '10"') return '10"';
      return '12"';
    }
  }

  if (has('7"')) return '7"';
  if (has('10"')) return '10"';
  if (has('12"') || has("lp")) return '12"';

  return undefined;
}

export function parseRelease(event: NostrEvent): Release | null {
  const d = getTag(event, "d");
  // Only `d` is structurally guaranteed by release.v1 — every other tag,
  // title/artist included, is omitted when its value is empty. Conform to
  // the wire: gate on `d` alone, fall back for display.
  if (!d) return null;
  return {
    id: event.id,
    pubkey: event.pubkey,
    createdAt: event.created_at,
    d,
    title: getTag(event, "title") || "Untitled",
    artist: getTag(event, "artist") || "Unknown Artist",
    medium: getTag(event, "medium"),
    format: getTag(event, "format"),
    formatGroup: formatGroup(getTag(event, "format")),
    year: getTag(event, "year"),
    // release.v2 additive: expected total tracks (integer-as-string on the
    // wire). Strict-but-recoverable — a non-positive/garbage value drops out.
    tracks: ((): number | undefined => {
      const t = getTag(event, "tracks");
      const n = t ? parseInt(t, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    // release.v2 additive: total disc count (integer-as-string on the wire).
    // Derived ndisc-side from the release's Discogs format breakdown (2x LP →
    // 2), so it is present only on enriched releases. Strict-but-recoverable —
    // a non-positive/garbage value drops out. ndisc emits it when > 0; the UI
    // surfaces it only for genuine multi-disc releases (> 1).
    discs: ((): number | undefined => {
      const t = getTag(event, "discs");
      const n = t ? parseInt(t, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    // release.v2 additive: count of audio-visual files (integer-as-string on
    // the wire). Extension-detected ndisc-side and may over-count, so treat
    // presence as the signal rather than the exact number. ndisc emits it only
    // when > 0; strict-but-recoverable — garbage drops out.
    video: ((): number | undefined => {
      const t = getTag(event, "video");
      const n = t ? parseInt(t, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    label: getTag(event, "label"),
    catalog: getTag(event, "catalog"),
    country: getTag(event, "country"),
    condition: getTag(event, "condition"),
    type: getTag(event, "type"),
    category: getTag(event, "category"),
    source: sourceUrlOf(getTag(event, "source")),
    externalIds: getAllTags(event, "i"),
    tags: getAllTags(event, "t"),
    genres: normaliseGenres(getAllTags(event, "genre")),
    image: getTag(event, "image"),
    notes: event.content,
    event,
  };
}

export function parseProfile(event: NostrEvent): Profile {
  try {
    const parsed = JSON.parse(event.content);
    return parsed && typeof parsed === "object" ? (parsed as Profile) : {};
  } catch {
    return {};
  }
}

// ---- labels.v1 (kind:31238) ---------------------------------------------
//
// Owner-published record-label image library: a single addressable event per
// owner (d-tag `disco-vault:labels`) carrying a JSON map of label name →
// image URL. Wire schema vendored at `schema/labels.v1.json`. Mirror of
// glmps's parser + hook; ndisc.view is the third consumer of this contract.

/** Entry in the owner's record-label image library (labels.v1). */
export type LabelLibraryEntry = {
  image: string;
};

export type LabelLibrary = {
  schemaVersion: "labels.v1";
  labels: Record<string, LabelLibraryEntry>;
};

/**
 * Parse a kind:31238 event into a [`LabelLibrary`]. Tolerates extra fields
 * inside each entry (forward-compat per the labels.v1 contract). Returns
 * `null` if the event isn't a valid labels.v1 manifest.
 */
export function parseLabelLibrary(event: NostrEvent): LabelLibrary | null {
  try {
    const parsed = JSON.parse(event.content);
    if (parsed?.schemaVersion !== "labels.v1") return null;
    if (!parsed.labels || typeof parsed.labels !== "object") return null;
    const labels: Record<string, LabelLibraryEntry> = {};
    for (const [name, entry] of Object.entries(parsed.labels)) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as { image?: unknown }).image === "string"
      ) {
        labels[name] = { image: (entry as { image: string }).image };
      }
    }
    return { schemaVersion: "labels.v1", labels };
  } catch {
    return null;
  }
}

/**
 * NIP-01 replaceable winner rule: higher created_at wins; tie-break to lower
 * lexicographic event id. Returns true iff `next` should replace `current`.
 */
export function isNewerReplaceable(
  current: NostrEvent | undefined,
  next: NostrEvent,
): boolean {
  if (!current) return true;
  if (next.created_at !== current.created_at)
    return next.created_at > current.created_at;
  return next.id < current.id;
}

export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type !== "npub") throw new Error("Not an npub");
  return decoded.data;
}

/**
 * Bucket a 4-digit year into a decade label ("1980s", "1990s", …).
 * Pre-1970 collapses to "pre-1970s". Returns null on malformed input.
 */
export function decadeOf(year: string | undefined): string | null {
  if (!year) return null;
  const n = parseInt(year, 10);
  if (!Number.isFinite(n)) return null;
  if (n < 1970) return "pre-1970s";
  const base = Math.floor(n / 10) * 10;
  return `${base}s`;
}

/** Case-insensitive substring search across a release's freetext fields. */
export function matchesSearch(r: Release, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    r.title,
    r.artist,
    r.label,
    r.country,
    r.catalog,
    r.notes,
    r.format,
    r.formatGroup,
    r.year,
    r.type,
    r.category,
    r.condition,
    ...r.tags,
  ]
    .filter(Boolean)
    .join("  ")
    .toLowerCase();
  return hay.includes(q);
}

/** artist → year → title; missing year sorts last. */
export function compareReleases(a: Release, b: Release): number {
  const byArtist = a.artist.localeCompare(b.artist, undefined, {
    sensitivity: "base",
  });
  if (byArtist !== 0) return byArtist;
  const ya = a.year ?? "￿";
  const yb = b.year ?? "￿";
  const byYear = ya.localeCompare(yb);
  if (byYear !== 0) return byYear;
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

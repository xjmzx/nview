import type { Release } from "./nostr";

// Source platforms recognised from a release's published `source` tag (an
// http(s) URL) and, for Bandcamp, a `bandcamp …` receipt left in the notes
// (the event content) — so custom Bandcamp stores with no bandcamp.com URL
// light up too. Mirrors the desktop ndisc app's lib/source.ts so a release's
// origin reads identically across the suite. Colours are platform BRAND
// colours — a shared constant, NOT the site palette — so this file is kept in
// lockstep (byte-identical) across every viewer; the single place to add a
// platform or recolour one.
export interface SourcePlatform {
  key: string;
  label: string;
  domain: string; // matched as a substring of the lowercased source URL
  color: string;
}

export const SOURCE_PLATFORMS: SourcePlatform[] = [
  { key: "bandcamp", label: "Bandcamp", domain: "bandcamp.com", color: "#1da0c3" },
  { key: "soundcloud", label: "SoundCloud", domain: "soundcloud.com", color: "#ff5500" },
  { key: "mixcloud", label: "Mixcloud", domain: "mixcloud.com", color: "#5000ff" },
  { key: "wavlake", label: "Wavlake", domain: "wavlake.com", color: "#00c853" },
  { key: "tidal", label: "Tidal", domain: "tidal.com", color: "#e8eaed" },
];

// The platform a release came from, or null. Source-URL domain wins; the
// Bandcamp receipt-in-notes is a fallback for custom stores with no
// bandcamp.com URL.
export function sourcePlatform(r: Release): SourcePlatform | null {
  const src = (r.source ?? "").toLowerCase();
  for (const p of SOURCE_PLATFORMS) {
    if (src.includes(p.domain)) return p;
  }
  if ((r.notes ?? "").toLowerCase().includes("bandcamp")) {
    return SOURCE_PLATFORMS[0];
  }
  return null;
}

// True when the release also carries a Bandcamp purchase receipt in its notes —
// used only to enrich the source tooltip (a confirmed purchase vs a bare link).
export function hasBandcampReceipt(r: Release): boolean {
  return (r.notes ?? "").toLowerCase().includes("bandcamp");
}

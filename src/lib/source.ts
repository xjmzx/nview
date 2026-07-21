import type { Release } from "./nostr";

// Source platforms recognised from a release's published `source` tag (an
// http(s) URL) and, for Bandcamp, a `bandcamp …` receipt left in the notes
// (the event content) — so custom Bandcamp stores with no bandcamp.com URL
// light up too. Mirrors the desktop ndisc app's lib/source.ts so a release's
// origin reads identically across the suite. Colours are platform BRAND
// colours — a shared constant, NOT the site palette. The medium glyph SHAPE
// already encodes digital-vs-physical, so colour is free to answer a single
// question — *which store* — rather than the bucket. A small, curated roster
// (~10 max) is the intent: recognisable stores, not one hue per label. This
// SOURCE_PLATFORMS constant is kept in lockstep with the ndisc desktop app.
export interface SourcePlatform {
  key: string;
  label: string;
  domain?: string; // matched as a substring of the lowercased source URL; omit for manual-only sources
  color: string;
}

export const SOURCE_PLATFORMS: SourcePlatform[] = [
  // Digital stores — a download you own, each recognisable at a glance.
  { key: "bandcamp", label: "Bandcamp", domain: "bandcamp.com", color: "#1da0c3" },
  { key: "boomkat", label: "Boomkat", domain: "boomkat.com", color: "#e0913a" },
  { key: "bleep", label: "Bleep", domain: "bleep.com", color: "#e05a9c" },
  { key: "warp", label: "Warp", domain: "warp.net", color: "#8b6be8" },
  { key: "planetmu", label: "Planet Mu", domain: "planet.mu", color: "#a8c94a" },
  // Physical marketplace — no domain inference: a Discogs catalogue link is a
  // pairing signal (discogsId), not an acquisition source to auto-tint. Its
  // muted grey applies only when "Discogs" is the chosen sourceLabel.
  { key: "discogs", label: "Discogs", color: "#5e5c64" },
];

// Custom Bandcamp storefronts on their own domain (label stores that don't use
// a *.bandcamp.com URL). These have no receipt of their own to key off, so they
// need explicit recognition. Add a domain here when a label's own shop is
// Bandcamp-backed.
const BANDCAMP_CUSTOM_DOMAINS = ["shop.cpurecords.net"];

// The platform a release came from, or null. A source-URL domain match wins.
// Failing that, a release is Bandcamp if it sits on a known custom Bandcamp
// storefront OR carries a Bandcamp purchase receipt in its notes — both mark a
// Bandcamp origin without a *.bandcamp.com URL.
export function sourcePlatform(r: Release): SourcePlatform | null {
  const src = (r.source ?? "").toLowerCase();
  for (const p of SOURCE_PLATFORMS) {
    if (p.domain && src.includes(p.domain)) return p;
  }
  const hasReceipt = (r.notes ?? "").toLowerCase().includes("bandcamp");
  if (hasReceipt || BANDCAMP_CUSTOM_DOMAINS.some((d) => src.includes(d))) {
    return SOURCE_PLATFORMS[0]; // Bandcamp
  }
  return null;
}

// True when the release also carries a Bandcamp purchase receipt in its notes —
// used only to enrich the source tooltip (a confirmed purchase vs a bare link).
export function hasBandcampReceipt(r: Release): boolean {
  return (r.notes ?? "").toLowerCase().includes("bandcamp");
}

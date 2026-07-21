import { sourcePlatform, hasBandcampReceipt } from "../lib/source";
import type { Release } from "../lib/nostr";

type Props = {
  release: Release;
  className?: string;
};

/**
 * A small platform-coloured dot marking a release's origin (Bandcamp,
 * Boomkat, Bleep, Warp, Planet Mu) when one is detected from its published
 * `source` tag. Companion to the medium glyph: shape there encodes
 * physical/digital, this dot's colour carries the origin platform. Returns null
 * when no platform is recognised. Mirrors the desktop ndisc source indicator.
 */
export function SourceDot({ release, className = "" }: Props) {
  const platform = sourcePlatform(release);
  if (!platform) return null;
  const purchased = platform.key === "bandcamp" && hasBandcampReceipt(release);
  const label = purchased ? `${platform.label} · purchased` : platform.label;
  return (
    <span
      title={`source: ${label}`}
      aria-label={`source: ${label}`}
      className={`inline-flex shrink-0 ${className}`}
      style={{ color: platform.color }}
    >
      <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden="true">
        <circle cx="3.5" cy="3.5" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

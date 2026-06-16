import { useMemo } from "react";
import type { Release } from "../lib/nostr";

type Props = {
  releases: Release[];
  className?: string;
};

// Compact one-line library stats — releases / artists / labels. A slimmed,
// horizontal take on the glmps StatsSummary card, sized for the mobile header.
export function StatsSummary({ releases, className = "" }: Props) {
  const stats = useMemo(
    () => ({
      total: releases.length,
      artists: new Set(releases.map((r) => r.artist).filter(Boolean)).size,
      labels: new Set(releases.map((r) => r.label).filter(Boolean)).size,
    }),
    [releases],
  );

  return (
    <div
      className={
        "flex items-center gap-x-2 font-mono text-[11px] text-muted " +
        "tabular-nums whitespace-nowrap " +
        className
      }
    >
      <Stat n={stats.total} label="releases" tone="text-accent" />
      <span className="text-muted/40">·</span>
      <Stat n={stats.artists} label="artists" tone="text-mauve" />
      <span className="text-muted/40">·</span>
      <Stat n={stats.labels} label="labels" tone="text-fg/80" />
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <span>
      <span className={`font-semibold ${tone}`}>{n}</span> {label}
    </span>
  );
}

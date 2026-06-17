import { useMemo } from "react";
import type { Release } from "../lib/nostr";
import { decadeOf, formatGroup, FORMAT_GROUP_ORDER } from "../lib/nostr";
import { genreLabel, genreColor } from "../lib/genre";

type Row = { key: string; label: string; count: number; color: string };

// Monochrome ramp from a themed `--c-*` var (mint/coral for --c-accent, mauve
// for --c-mauve — both swap with the fizx/upleb theme toggle). Rank 0 = full
// strength, fading down the tail. Genre keeps its own semantic `--c-g-*`
// colours. Mirrors the glmps web viewer's StatsBreakdown, adapted to this
// app's Tailwind tokens.
function ramp(varName: string, rank: number, total: number): string {
  const alpha = total <= 1 ? 1 : 0.4 + 0.6 * (1 - rank / (total - 1));
  return `rgb(var(${varName}) / ${alpha.toFixed(3)})`;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  const total = rows.reduce((a, r) => a + r.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">
          {title}
        </h3>
        <span className="font-mono text-[10px] text-muted/40 tabular-nums">
          {rows.length}
        </span>
      </div>
      {/* Proportional stacked bar — honest widths (counts shown in the legend). */}
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm">
        {rows.map((r) => (
          <div
            key={r.key}
            style={{
              width: `${(r.count / total) * 100}%`,
              minWidth: "2px",
              backgroundColor: r.color,
            }}
            title={`${r.label}: ${r.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px]">
        {rows.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 shrink-0 rounded-[1px]"
              style={{ backgroundColor: r.color }}
              aria-hidden="true"
            />
            <span className="text-fg/75">{r.label}</span>
            <span className="text-muted tabular-nums">{r.count}</span>
            <span className="text-muted/40 tabular-nums">
              {Math.round((r.count / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal discography breakdown — genre, decade, and format, each a
 * proportional stacked bar plus a counted legend. All data is tallied
 * client-side from the already-loaded releases. Genre uses any-slot tallying
 * (a release with N slugs contributes N tallies).
 */
export function StatsBreakdown({ releases }: { releases: Release[] }) {
  const genre = useMemo<Row[]>(() => {
    const m = new Map<string, number>();
    for (const r of releases)
      for (const g of r.genres) m.set(g, (m.get(g) ?? 0) + 1);
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([slug, count]) => ({
        key: slug,
        label: genreLabel(slug),
        count,
        color: genreColor(slug),
      }));
  }, [releases]);

  const decade = useMemo<Row[]>(() => {
    const m = new Map<string, number>();
    for (const r of releases) {
      const d = decadeOf(r.year);
      if (d) m.set(d, (m.get(d) ?? 0) + 1);
    }
    const decKey = (d: string) => (d.startsWith("pre") ? 0 : parseInt(d, 10));
    const sorted = Array.from(m.entries()).sort(
      (a, b) => decKey(a[0]) - decKey(b[0]),
    );
    return sorted.map(([d, count], i) => ({
      key: d,
      label: d,
      count,
      color: ramp("--c-accent", i, sorted.length),
    }));
  }, [releases]);

  const format = useMemo<Row[]>(() => {
    const m = new Map<string, number>();
    for (const r of releases) {
      const f = formatGroup(r.format);
      if (f) m.set(f, (m.get(f) ?? 0) + 1);
    }
    const ordered = FORMAT_GROUP_ORDER.filter((f) => m.has(f));
    return ordered.map((f, i) => ({
      key: f,
      label: f,
      count: m.get(f) ?? 0,
      color: ramp("--c-mauve", i, ordered.length),
    }));
  }, [releases]);

  const empty =
    genre.length === 0 && decade.length === 0 && format.length === 0;
  if (empty) {
    return (
      <p className="font-mono text-[11px] text-muted">no breakdown data yet</p>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Genre" rows={genre} />
      <Section title="Decade" rows={decade} />
      <Section title="Format" rows={format} />
    </div>
  );
}

import { useState } from "react";

export type CycleFacet = {
  key: string;
  name: string; // display name, e.g. "genre"
  options: string[]; // values in display order (sorted by count)
  counts: Map<string, number>;
  selected: Set<string>;
  onToggle: (value: string) => void;
  labelFor?: (value: string) => string;
  colorFor?: (value: string) => string; // dot colour (genre)
};

// State + handlers for the cycling facet filter: which facet is active, the
// value cursor within each facet, and toggle. Kept as a hook so the square
// "cycle facet" button and the value pager can be laid out separately.
export function useCycler(facets: CycleFacet[]) {
  const [facetIdx, setFacetIdx] = useState(0);
  // One value-cursor per facet so paging position survives a facet switch.
  const [idxs, setIdxs] = useState<number[]>(() => facets.map(() => 0));

  const len = facets.length;
  const fi = len ? facetIdx % len : 0;
  const facet: CycleFacet | undefined = facets[fi];
  const n = facet ? facet.options.length : 0;
  const vi = n > 0 ? (((idxs[fi] ?? 0) % n) + n) % n : 0;
  const value = n > 0 ? facet!.options[vi] : undefined;
  const on = value != null && !!facet?.selected.has(value);
  const count = value != null ? (facet?.counts.get(value) ?? 0) : 0;

  const cycleFacet = () => setFacetIdx((i) => (i + 1) % Math.max(1, len));
  const step = (dir: number) =>
    setIdxs((prev) => {
      const next = [...prev];
      next[fi] = (idxs[fi] ?? 0) + dir;
      return next;
    });
  // "Play next filter": advance the value cursor within the current facet and,
  // when it runs off the end, reset to the top value and move to the next
  // facet. Lets a single button walk every (facet, value) candidate.
  const cycleNext = () => {
    const cur = idxs[fi] ?? 0;
    if (cur + 1 < n) {
      setIdxs((prev) => {
        const next = [...prev];
        next[fi] = cur + 1;
        return next;
      });
    } else {
      setIdxs((prev) => {
        const next = [...prev];
        next[fi] = 0;
        return next;
      });
      setFacetIdx((i) => (i + 1) % Math.max(1, len));
    }
  };
  const toggle = () => {
    if (value != null && facet) facet.onToggle(value);
  };

  return { facet, value, on, count, n, cycleFacet, step, cycleNext, toggle };
}

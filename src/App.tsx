import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Home, KeyRound, LineChart, LogIn, RotateCw } from "lucide-react";
import { decadeOf, matchesSearch, npubToHex, type Release } from "./lib/nostr";
import { GENRE_ORDER, genreColor, genreLabel } from "./lib/genre";
import { OWNER_NPUB } from "./config";
import { useReleases } from "./hooks/useReleases";
import { useSigner } from "./hooks/useSigner";
import { ReleaseCard } from "./components/ReleaseCard";
import { ReleaseRow } from "./components/ReleaseRow";
import { ReleaseDetail } from "./components/ReleaseDetail";
import { useCycler, type CycleFacet } from "./hooks/useCycler";
import { ViewToggle, type ViewMode } from "./components/ViewToggle";
import { LoginModal } from "./components/LoginModal";
import { Footer } from "./components/Footer";

type Theme = "fizx" | "upleb";
const THEME_KEY = "ndisc-mobile.theme";
const VIEW_KEY = "ndisc-mobile.view";

// Returns a chip-toggle handler for one facet's Set state.
function makeToggle(setter: Dispatch<SetStateAction<Set<string>>>) {
  return (value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };
}

export default function App() {
  // The owner npub is fixed config; decode to hex once.
  const hex = useMemo(() => {
    try {
      return npubToHex(OWNER_NPUB);
    } catch {
      return undefined;
    }
  }, []);

  const { releases, loading } = useReleases(hex);
  const { status, logout } = useSigner();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Release | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Facet filters — a Set of selected values each; chips OR within a facet,
  // facets AND together (and with the search).
  const [labelSel, setLabelSel] = useState<Set<string>>(new Set());
  const [countrySel, setCountrySel] = useState<Set<string>>(new Set());
  const [decadeSel, setDecadeSel] = useState<Set<string>>(new Set());
  const [genreSel, setGenreSel] = useState<Set<string>>(new Set());

  // Grid vs dense-list view — remembered across sessions.
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // Colour theme — toggled by tapping the ndisc title, mirrors the desktop.
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "upleb" ? "upleb" : "fizx";
    } catch {
      return "fizx";
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("theme-upleb", theme === "upleb");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Facet options + per-value counts derived from the whole library. Values
  // are sorted by count (most-released first) so the cycler isn't arbitrary;
  // decade is chronological and genre follows the canonical slug order.
  const facets = useMemo(() => {
    const labelCount = new Map<string, number>();
    const countryCount = new Map<string, number>();
    const decadeCount = new Map<string, number>();
    const genreCount = new Map<string, number>();
    for (const r of releases) {
      if (r.label) {
        labelCount.set(r.label, (labelCount.get(r.label) ?? 0) + 1);
      }
      if (r.country) {
        countryCount.set(r.country, (countryCount.get(r.country) ?? 0) + 1);
      }
      const d = decadeOf(r.year);
      if (d) decadeCount.set(d, (decadeCount.get(d) ?? 0) + 1);
      for (const g of r.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
    const byCountDesc = (a: [string, number], b: [string, number]) =>
      b[1] - a[1] || a[0].localeCompare(b[0]);
    const decadeKey = (d: string) => (d.startsWith("pre") ? 0 : parseInt(d, 10));
    return {
      label: {
        options: [...labelCount.entries()].sort(byCountDesc).map((e) => e[0]),
        counts: labelCount,
      },
      country: {
        options: [...countryCount.entries()].sort(byCountDesc).map((e) => e[0]),
        counts: countryCount,
      },
      decade: {
        options: [...decadeCount.keys()].sort((a, b) => decadeKey(a) - decadeKey(b)),
        counts: decadeCount,
      },
      genre: {
        // Canonical slug order, limited to slugs actually present.
        options: GENRE_ORDER.filter((g) => genreCount.has(g)) as string[],
        counts: genreCount,
      },
    };
  }, [releases]);

  // One descriptor per facet for the cycling selector + active-chip strip.
  const facetDefs: CycleFacet[] = [
    {
      key: "genre",
      name: "genre",
      options: facets.genre.options,
      counts: facets.genre.counts,
      selected: genreSel,
      onToggle: makeToggle(setGenreSel),
      labelFor: genreLabel,
      colorFor: genreColor,
    },
    {
      key: "label",
      name: "label",
      options: facets.label.options,
      counts: facets.label.counts,
      selected: labelSel,
      onToggle: makeToggle(setLabelSel),
    },
    {
      key: "country",
      name: "country",
      options: facets.country.options,
      counts: facets.country.counts,
      selected: countrySel,
      onToggle: makeToggle(setCountrySel),
    },
    {
      key: "decade",
      name: "decade",
      options: facets.decade.options,
      counts: facets.decade.counts,
      selected: decadeSel,
      onToggle: makeToggle(setDecadeSel),
    },
  ];

  const cyc = useCycler(facetDefs);

  // Library-wide artist/label totals for the consolidated counts strip.
  const libStats = useMemo(
    () => ({
      artists: new Set(releases.map((r) => r.artist).filter(Boolean)).size,
      labels: new Set(releases.map((r) => r.label).filter(Boolean)).size,
    }),
    [releases],
  );

  const filtered = useMemo(
    () =>
      releases.filter((r) => {
        if (!matchesSearch(r, query)) return false;
        if (labelSel.size > 0 && (!r.label || !labelSel.has(r.label))) {
          return false;
        }
        if (
          countrySel.size > 0 &&
          (!r.country || !countrySel.has(r.country))
        ) {
          return false;
        }
        if (decadeSel.size > 0) {
          const d = decadeOf(r.year);
          if (!d || !decadeSel.has(d)) return false;
        }
        // Genre: any-slot match — release passes if any of its slots is picked.
        if (genreSel.size > 0 && !r.genres.some((g) => genreSel.has(g))) {
          return false;
        }
        return true;
      }),
    [releases, query, labelSel, countrySel, decadeSel, genreSel],
  );

  const anyFilter =
    query.trim() !== "" ||
    labelSel.size > 0 ||
    countrySel.size > 0 ||
    decadeSel.size > 0 ||
    genreSel.size > 0;

  function clearFilters() {
    setQuery("");
    setLabelSel(new Set());
    setCountrySel(new Set());
    setDecadeSel(new Set());
    setGenreSel(new Set());
  }

  // Home — back to the list, search + facet filters cleared.
  function goHome() {
    setSelected(null);
    clearFilters();
  }

  return (
    <div
      className="min-h-screen w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto
                 bg-bg text-fg flex flex-col"
    >
      <header
        className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b
                   border-surface px-4 pt-[env(safe-area-inset-top)]"
      >
        {/* Permanent bar — stays on screen in both the list and detail view. */}
        <div className="flex items-center justify-between gap-3 py-3">
          <button
            type="button"
            onClick={() =>
              setTheme((t) => (t === "fizx" ? "upleb" : "fizx"))
            }
            title="Switch colour theme"
            aria-label="Switch colour theme"
            className="text-xl font-bold tracking-tight leading-none
                       transition-opacity hover:opacity-70"
          >
            n<span className="text-accent">disc</span>
            <span className="font-normal text-muted"> view</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {/* Placeholder stats button — sourced from ndisc's LineChart
                toolbar button. Not yet wired to a stats view. */}
            <button
              type="button"
              onClick={() => {}}
              title="Stats"
              aria-label="Stats"
              className="shrink-0 p-2 rounded-md bg-mauve/15 text-mauve
                         hover:bg-mauve hover:text-bg transition-colors"
            >
              <LineChart size={16} />
            </button>
            {status === "in" ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Log out of Nostr?")) logout();
                }}
                title="Signed in — tap to log out"
                aria-label="Signed in — tap to log out"
                className="shrink-0 p-2 rounded-md bg-accent/20 text-accent
                           hover:bg-accent hover:text-bg transition-colors"
              >
                <KeyRound size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                title="Log in with a Nostr signer"
                aria-label="Log in with a Nostr signer"
                className="shrink-0 p-2 rounded-md bg-mauve/15 text-mauve
                           hover:bg-mauve hover:text-bg transition-colors"
              >
                <LogIn size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={goHome}
              title="Home"
              aria-label="Home"
              className="shrink-0 p-2 rounded-md bg-mauve/15 text-mauve
                         hover:bg-mauve hover:text-bg transition-colors"
            >
              <Home size={16} />
            </button>
          </div>
        </div>
        {/* Contextual row beneath the bar — search in list view, back in
            detail view. */}
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="block w-full text-left text-sm font-medium text-accent
                       pb-3"
          >
            ‹ back
          </button>
        ) : releases.length > 0 ? (
          <div className="pb-3 flex flex-col gap-2">
            {/* Row 1 — refresh ("play next filter"), search, view toggle. */}
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={cyc.cycleNext}
                title={
                  cyc.value != null
                    ? `Next filter — currently ${cyc.facet?.name}: ${cyc.value}`
                    : "Next filter"
                }
                aria-label="Next filter"
                className="relative shrink-0 self-stretch w-[44px] grid place-items-center
                           rounded-lg bg-surface text-muted hover:text-accent transition-colors"
              >
                <RotateCw size={20} />
                {cyc.facet && cyc.facet.selected.size > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full
                               bg-accent text-bg text-[9px] font-bold leading-[14px] text-center"
                  >
                    {cyc.facet.selected.size}
                  </span>
                )}
              </button>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search releases…"
                spellCheck={false}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface text-fg
                           text-sm outline-none placeholder:text-muted"
              />
              <ViewToggle value={view} onChange={setView} className="self-stretch" />
            </div>
            {/* Row 2 — discography + filter stats only. The leading chip is the
                current filter candidate; tap it to apply / remove (the refresh
                button above steps through candidates). */}
            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 font-mono
                            text-[10px] text-muted tabular-nums">
              <button
                type="button"
                onClick={cyc.toggle}
                disabled={cyc.value == null}
                title={
                  cyc.value != null
                    ? cyc.on
                      ? `Remove ${cyc.facet?.name} filter`
                      : `Filter by ${cyc.value}`
                    : undefined
                }
                className={
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors " +
                  (cyc.on
                    ? "bg-accent text-bg font-medium"
                    : "text-fg/80 hover:text-fg")
                }
              >
                {cyc.value == null ? (
                  <span className="text-muted">no {cyc.facet?.name}</span>
                ) : (
                  <>
                    {cyc.facet?.colorFor && (
                      <span
                        className="w-2 h-2 rounded-full ring-1 ring-fg/10 shrink-0"
                        style={{ backgroundColor: cyc.facet.colorFor(cyc.value) }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-semibold tabular-nums">{cyc.count}</span>
                    <span>
                      {cyc.facet?.labelFor
                        ? cyc.facet.labelFor(cyc.value)
                        : cyc.value}
                    </span>
                  </>
                )}
              </button>
              <span className="text-muted/40">/</span>
              <span>
                <span className="text-fg/80 font-semibold">{releases.length}</span> releases
              </span>
              <span>
                <span className="text-fg/80 font-semibold">{libStats.artists}</span> artists
              </span>
              <span>
                <span className="text-fg/80 font-semibold">{libStats.labels}</span> labels
              </span>
              {anyFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-accent ml-1"
                >
                  clear
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pb-3 flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search releases…"
              spellCheck={false}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface text-fg
                         text-sm outline-none placeholder:text-muted"
            />
            <ViewToggle value={view} onChange={setView} />
          </div>
        )}
      </header>

      {selected ? (
        <ReleaseDetail
          release={selected}
          onRequireLogin={() => setLoginOpen(true)}
        />
      ) : (
        <main className="flex-1 px-4 py-3">
          {loading && releases.length === 0 ? (
            <p className="text-muted text-sm py-12 text-center">loading…</p>
          ) : releases.length === 0 ? (
            <p className="text-muted text-sm py-12 text-center">
              no releases found
            </p>
          ) : view === "grid" ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((r) => (
                <ReleaseCard
                  key={r.d}
                  release={r}
                  onSelect={() => setSelected(r)}
                />
              ))}
              {filtered.length === 0 && (
                <li className="col-span-full text-muted text-sm py-8 text-center">
                  no matches
                </li>
              )}
            </ul>
          ) : (
            <ul className="flex flex-col gap-1">
              {filtered.map((r) => (
                <ReleaseRow
                  key={r.d}
                  release={r}
                  onSelect={() => setSelected(r)}
                />
              ))}
              {filtered.length === 0 && (
                <li className="text-muted text-sm py-8 text-center">
                  no matches
                </li>
              )}
            </ul>
          )}
        </main>
      )}

      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

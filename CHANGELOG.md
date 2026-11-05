# Changelog

**Contract:** `release.v2` @ `03f312cfc5f9b4906211de41d7d0142e34330925cd56a8808ed119d4fd34fb42`
(2026-11 genre round — 41 active slugs, 5 genre slots + additive `discs` tag)

**Feed contract:** `feed.v1` @ `077fe7a6f70831ccf7c9640185c29e0b9c289ea22a1e4283064a1803ed1ea50c`
(kind:31239 feed-note channel — frozen 2026-06-23, pinned by `schema/feed.v1.json.sha256`)

ndisc-mobile is a read-only consumer of the **ndisc** Nostr wire contract. The
contract is vendored verbatim under `schema/` and pinned by SHA-256. Source of
truth: [xjmzx/ndisc](https://github.com/xjmzx/ndisc) — ndisc wins on any
discrepancy. A change to the emitted event format is a coordinated
`release.vN+1.json` bump, never an edit to a shipped version. This file tracks
the shared `release.vN` contract; the app's own version lives in `package.json`.

## Unreleased

### relay.fizx.uk is gone — relay.nfunc.xyz is the only default (2026-11-05)

- The fizx box was decommissioned and `relay.fizx.uk` no longer resolves. `DEFAULT_RELAYS` is now `relay.nfunc.xyz` alone.
- Saved relay lists are migrated on launch: a stored `relay.fizx.uk` becomes `relay.nfunc.xyz` in the same place, no duplicates, written back to storage (`migrateRetiredRelays` in `useRelays`, with tests).
- Onboarding no longer claims the discography is published on relay.fizx.uk. README updated.

### release.v2 — 2026-11 genre round, re-vendored 2026-11-05

- Source: [xjmzx/ndisc](https://github.com/xjmzx/ndisc). `schema/release.v2.json` SHA-256 `91e16cf1…` → `03f312cf…`; `.sha256` re-pinned. Additive, **not** a v3 bump.
- Genre vocabulary 38 → **41 active slugs**: **`minimal`** (electronic), **`abstract`** + **`world`** (tertiary). Labels display verbatim.
- `genreInvariants.slotCap` 3 → **5**: `normaliseGenres` now keeps up to five ordered `genre` tags (first = highest priority). `GenreDotChip` already renders every slot, so rows, cards and the detail view show up to five dots.
- `index.css` gains theme-neutral `--c-g-{minimal,abstract,world}` hue vars.

## feed.v1 — feed-note channel (kind:31239), vendored 2026-06-23

- Source: [xjmzx/ndisc](https://github.com/xjmzx/ndisc) `schema/feed.v1.json`, frozen 2026-06-23. `schema/feed.v1.json` pinned by `schema/feed.v1.json.sha256` (`077fe7a6…`).
- Adds the **feed-note channel**: kind:31239 notes (`d=glmps:<id>`, optional `a` release reference, repeatable `image`/`r`/`t`, `alt` fallback, body in `content`), the NIP-51 contributor registry (kind:30000, `d=glmps:contributors`), the NIP-72 per-note sign-off (kind:4550), and the client-side trust gate + NIP-09 kind:5 deletes. All authority roots on the single owner key.
- Shared read template `src/lib/feed.ts` (`parseFeedNote`/`resolveFeed`/`releaseIdFromRef`) is byte-identical across ndisc / ndisc.view / glmps.
- Surfaced as the **Current** view — kind:31239 notes matched against the discography; a note's `a` hydrates artist/title/cover from the local kind:31237, with a "release not in view" affordance when unmatched. Owner-only in v1.
- Coordinated wave with glmps×2 — all consumers + ndisc cite the same SHA.

## release.v2 — 2026-06b genre round, re-vendored 2026-06-23

- Source: [xjmzx/ndisc @ 28cc116](https://github.com/xjmzx/ndisc). `schema/release.v2.json` SHA-256 `179fd563…` → `91e16cf1…`; `.sha256` re-pinned. Additive, **not** a v3 bump.
- Genre vocabulary 35 → **38 active slugs**. Two 1:1 renames done additively (new slug active, old retired to `deprecated`, kept valid for legacy reads): **`poetry` → `spoken`**, **`spiritual` → `conscious`**. New slugs: **`disco`** + **`spoken`** (acoustic), **`garage`** (electronic), **`conscious`** + **`turntablism`** (tertiary).
- `genre.ts` slug arrays updated (helpers unchanged); `index.css` gains `--c-g-{disco,spoken,garage,conscious,turntablism}` hue vars. `poetry`/`spiritual` colours retained for legacy rendering.

## release.v2 — `discs` tag amendment, re-vendored 2026-06-20

- Source: [xjmzx/ndisc @ 018eb34](https://github.com/xjmzx/ndisc/blob/018eb34/schema/release.v2.json).
- `schema/release.v2.json` SHA-256 `179fd563…` (was `99a9b269…`, the 2026-06 genre restructure); `schema/release.v2.json.sha256` re-pinned to match.
- Adds the `discs` tag — optional, integer-as-string: the release's **total disc count**. A release property like `tracks`, NOT a per-device count. ndisc derives it from the Discogs format breakdown (2x LP → 2; digital folder imports carry no disc count). Additive + backward-compatible (old consumers ignore it); **not** a v3 bump.
- Parser: `parseRelease` reads `discs` → `Release.discs?: number` (strict-but-recoverable — a non-positive/garbage value drops out). Surfaced only for genuine multi-disc releases (`> 1`): an "N discs" entry in the card/row meta line + a `discs` cell in the detail metadata strip. ndisc emits when `> 0`; single-disc is kept off the UI.

## release.v2 — vendored (genre restructure, 2026-06-20)

- `schema/release.v2.json` SHA-256 `99a9b269…` — the 35-slug genre restructure (acoustic / electronic / bridge / tertiary; four compound slash-pairs deprecated). Vendored verbatim from xjmzx/ndisc.
- Parser ports the glmps `normaliseGenres` invariants (distinct slugs, slot cap 3, dense ordering; unknown slugs dropped).

## release.v1 — vendored

- `schema/release.v1.json` retained in-tree as the historic fixture; some events on the relays predate v2. Covers kind:31237 releases and kind:5 (NIP-09) deletions.

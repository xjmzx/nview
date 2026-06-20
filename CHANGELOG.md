# Changelog

**Contract:** `release.v2` @ `179fd5631454aa6c8feac5b20a27257f96b73413953e663c52ae7516f6a843fd`
(2026-06 `discs` tag amendment)

ndisc-mobile is a read-only consumer of the **ndisc** Nostr wire contract. The
contract is vendored verbatim under `schema/` and pinned by SHA-256. Source of
truth: [xjmzx/ndisc](https://github.com/xjmzx/ndisc) — ndisc wins on any
discrepancy. A change to the emitted event format is a coordinated
`release.vN+1.json` bump, never an edit to a shipped version. This file tracks
the shared `release.vN` contract; the app's own version lives in `package.json`.

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

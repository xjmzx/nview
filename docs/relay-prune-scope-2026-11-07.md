# Pruning the public relays from saved lists — scope

Written 2026-11-07, against `v0.1.0-beta.9` (`39adce7`), to ride along with the
next `release.v2` genre re-vendor so the relay change and the schema bump reach
the devices in one build.

**Built on 2026-11-08**, on top of the 2026-11b genre round (74 slugs,
`1c3169bb`). Kept as the reasoning behind the shape of the change — in
particular why the drop is flagged rather than recognised by value, and why it
is a separate function from `migrateRetiredRelays`. The CHANGELOG entry is the
summary; this is the argument. One deviation from the plan below: the load
decision was extracted into a pure `resolveStoredRelays`, so the flag behaviour
could be tested in this repo's node-environment vitest without adding jsdom.

## The symptom

An installed nview shows three relays in its Relays panel:

```
wss://relay.nfunc.xyz
wss://nos.lol
wss://relay.primal.net
```

nfunc sits first, which is correct, but the two public relays hold none of this
discography's events and have not since 2026-10-02. They were checked then: the
owner key's releases were not retained on either.

## Why, exactly — onboarding is not involved

The first-run seed in May 2026 (`e46566e`) was:

```ts
export const DEFAULT_RELAYS = [
  "wss://relay.fizx.uk",
  "wss://nos.lol",
  "wss://relay.primal.net",
] as const;
```

`Onboarding` wrote that list to `localStorage` under `ndisc-mobile.relays` and
set `ndisc-mobile.onboarded = "1"`. Two things follow, and together they are the
whole explanation:

1. **Onboarding never runs again.** It is gated on that flag, so an installed
   app never consults `DEFAULT_RELAYS` at startup — `loadRelays()` returns the
   stored list and only falls back to the default when storage is empty or
   corrupt (`useRelays.tsx`, `loadRelays`). beta.9 ships a single-relay default;
   an upgrade cannot deliver it.
2. **The migration rewrites, it never prunes.** `migrateRetiredRelays` maps each
   entry through `RETIRED_RELAYS` and keeps everything else in place. It did its
   one job — `relay.fizx.uk` → `relay.nfunc.xyz`, in the same position, which is
   why nfunc is now first — and has no concept of removing an entry.

So the stored list on an upgraded device is `[nfunc, nos.lol, primal]`: the May
seed with one substitution.

## There is a fix that needs no build

Relays panel → **Reset**, then **Save**. `Reset` seeds the draft from
`DEFAULT_RELAYS`, which is `relay.nfunc.xyz` alone; `Save` commits it and
re-subscribes the data hooks. **Both taps are required** — `Reset` only sets the
draft (`RelaySettings.tsx`), so closing the panel after it changes nothing.

This is per-device and per-install. The code change below is what makes it
unnecessary.

## The change

Add a one-shot prune beside `migrateRetiredRelays` in `src/hooks/useRelays.tsx`,
behind a flag key in `localStorage`:

- A list of public hosts to drop once: `nos.lol`, `relay.primal.net`.
- A flag, e.g. `ndisc-mobile.migrated.publicRelaysDropped`, written after the
  prune runs.
- A list left empty by the prune follows `DEFAULT_RELAYS`, as `loadRelays`
  already does for an empty stored list.

**Take nping's flagged shape, not nsmpl's seed-recognition.** nsmpl's
`isOldDefault()` asks whether a saved list is *exactly* the old seed and treats a
match as "never a choice, so follow the default". That test cannot pass here:
our migration has already rewritten fizx, so the stored list is no longer the
old seed. Matching the post-migration shape instead would work, but
`[nfunc, nos.lol, primal]` is also exactly what the list looks like when someone
adds those two back deliberately — the two cases are indistinguishable by value.
A flag separates them by *time*: prune once, record it, and anything re-added
afterwards survives. nping already does this for its own fizx drop.

### Keep the prune a separate function

Folding the hosts into `RETIRED_RELAYS` would be shorter and is the wrong move:

- A retired relay has a **replacement**; these have none. The map's value type
  has nowhere to say "drop".
- It would break the third existing test, `leaves a current list unchanged`,
  which passes `["wss://relay.nfunc.xyz", "wss://nos.lol"]` and expects it back
  untouched. That test is correct about `migrateRetiredRelays` and should keep
  passing.
- The prune is flagged and the migration is idempotent-by-value. Different
  lifetimes, so different functions.

One new vitest case alongside the three in `src/hooks/useRelays.test.ts`.

## Copy that contradicts a one-relay default

Both strings were written when the seed was three relays and now point users at
hosts that keep nothing:

- `RelaySettings.tsx:55` — "At least one relay. Two are helpful for coverage;
  three is a good spread." **Wrapped across lines 55-56**, so a grep for the
  whole sentence finds nothing; search for `At least one relay`.
- `Onboarding.tsx:57` — "Others can be added for coverage."

Reword in the same change. Adding a relay is still supported and still
reasonable for someone mirroring the catalogue; what is no longer true is that
the suite recommends it.

## Do not touch nping

`nping`'s `DEFAULT_RELAYS` deliberately includes `nos.lol` and `relay.damus.io`.
It is a relay tester — public relays are the subject, not a leak. The same
reasoning does not carry across the suite; this scope is nview only.

## Gate

Ride with the `release.v2` genre re-vendor. The change is source-only in this
repo and needs no iOS rebuild to be *correct* — only to reach a device, which
the contract wave will do anyway.

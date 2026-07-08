# nview — mobile viewer

> Part of the **n-suite**. Shared conventions, the Nostr wire contract, the
> design language, and the roadmap live in the hub doc:
> **[ndisc/SUITE.md](https://github.com/xjmzx/ndisc/blob/main/SUITE.md)**
> (locally: `../ndisc/SUITE.md`). This file covers **nview** specifically.

`nview` is the **viewer-first** member of the suite — a phone/tablet app for
browsing what `ndisc` publishes and reacting to it on the go. The only
Capacitor (mobile) app in the family.

## What it does
- Browses **releases** and **labels** pulled from Nostr, rendering the same
  contract `glmps` shows on the web.
- **Reacts** to releases (the suite's reference reaction implementation).
- Adaptive phone/tablet layout; relay cold-launch handling for a reliable first
  paint.

## Tech stack & build
**Capacitor** (iOS + Android) · React + Vite + TypeScript · `nostr-tools` ·
**NIP-46 `BunkerSigner`** for remote signing (no local key on device). AGP 9
toolchain; iOS platform present. Release signing is wired (keystore secrets not
yet set → CI currently yields a debug APK).

## Suite integration
- **Consumes** the shared contract from `ndisc`: `release.v2` (31237),
  `labels.v1` (31238), `feed.v1` (31239), reactions (7). Vendors the pinned
  contract SHAs like every other consumer.
- Shares `lib/source.ts` (source-platform indicators) **byte-identically** with
  `ndisc` and `glmps`, plus the suite palette and reaction/aggregation logic.

## Nostr surface
**Reader + reactor.** Reads `31237 / 31238 / 31239` and reaction data; publishes
**reactions (kind 7)** signed through a **NIP-46 remote bunker** (no `nsec` on
the phone). Must read from a superset-compatible relay set.

## Styling notes
Shared design language, adapted to touch and to adaptive phone/tablet
breakpoints. Uses the common palette and source dots.

## Backlog & direction
- Set release-signing keystore secrets so CI emits signed release builds.
- Track the v3 direction + source-palette-as-shared-vocab when it lands in the
  publishers.
- See **[SUITE.md → Direction](https://github.com/xjmzx/ndisc/blob/main/SUITE.md#direction--roadmap)**
  — a mobile surface for the eventual share/comment/collaboration flow.

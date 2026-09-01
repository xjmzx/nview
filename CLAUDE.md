# nview — notes for Claude

Mobile viewer (read + react) for the discography. **Capacitor**, not Tauri —
React + Vite web build wrapped for iOS and Android. See
[`nview-introduction.md`](nview-introduction.md).

## Read SUITE.md first

[`../ndisc/SUITE.md`](https://github.com/xjmzx/ndisc/blob/main/SUITE.md) is
authoritative for anything shared across the suite — in particular the Nostr
wire contract this app **consumes**. `ndisc` owns the schema shape; when a
contract SHA moves there, this repo re-vendors in the same wave.

Read it **before making a platform-sensitive choice**. It records constraints
invisible on the machine you are working on: `nchat` shipped Web Audio tones
that worked on macOS and were silent on Linux, which SUITE.md had documented.

## Build and verify

There is **no Makefile** here — this is the Capacitor toolchain.

```
npm run build          # tsc -b && vite build  <- the real typecheck
npm test               # vitest
npm run ios:sync       # npm run build && cap sync ios
npm run android:sync   # npm run build && cap sync android
```

**Verify with `npm run build`, never a bare `tsc --noEmit`.** A type error
shipped once because a bare `tsc` did nothing useful against this project's
tsconfig layout; `tsc -b` is what actually checks the app sources.

## Traps specific to this repo

- **`cap sync` only stages `dist/` into the native project.** It does not build
  an app. iOS then needs a real Xcode build/archive.
- **iOS can only be built on a Mac with Xcode** — `npm run ios:open` then
  Archive. This is the one piece of the suite that cannot move to the Linux box.
- **Android is automated in CI** on a `v*` tag, and can also be built locally on
  Linux. **Standing preference: keep Android on debug/development APKs.** Do not
  wire the `ANDROID_KEYSTORE_*` secrets or push toward a signed Play Store
  release unless explicitly asked. Without those secrets the workflow correctly
  falls back to a sideloadable debug APK.
- **Signing is a NIP-46 remote bunker**, not a local key — unlike the desktop
  tools, which hold an `nsec` in the OS keyring.
- Both platforms ship the **same web `dist/`**, so feature parity is guaranteed
  at the web layer; only the native binaries are versioned and shipped
  separately.
- The Android **adaptive icon** is a known open design problem: all three
  `@capacitor/assets` sources are the same flat artwork, so the foreground is
  full-bleed and Android's ~66% mask clips the wordmark. Fixing it means
  splitting background/foreground layers — a design call, not a regeneration.
- **The icon is half-migrated, and the remaining half is authoring rather than
  export.** `public/icon.svg` and everything derived from it — `assets/*.png`,
  `pwa-192x192`/`pwa-512x512`, the seven `icons/*.webp` — carry the current
  Figma design (`nview-sq`, node `3373:44`): the suite's variant-2 style, a
  large `n` as the backdrop with `view` set over it, matching ndisc, nplay,
  nsmpl and ntree. Still on the **pre-refresh artwork**: `icon-maskable.svg`,
  `pwa-maskable-512x512.png`, the iOS `AppIcon.appiconset` and the Android
  `res/` set. So the web and PWA layers look like the rest of the suite and the
  installed app icons do not.
- **Neither leftover is a regeneration, which is why they were left.** There is
  no maskable counterpart to `nview-sq` in the Figma file, so a maskable variant
  has to be *drawn*, not exported — and it is the one that must survive the
  ~66% mask above. The native sets additionally need `@capacitor/assets`
  (declared in `package.json`, not installed) and, for iOS, alpha flattened to
  RGB, since the App Store rejects an icon with an alpha channel.
- **Generate nview's icons from `icon.svg`, not from a PNG master** — the
  reverse of the rule the Tauri apps follow. Their rule exists because resvg
  falls back to serif on live text; nview has none, its wordmark being outlined
  paths. Meanwhile the PNG export of `nview-sq` bakes the `#E5E5E5` artboard in
  **opaque to the corners**, so generating from it puts grey corners on every
  size. Regenerating from the SVG keeps them transparent — spot-check a corner
  pixel for alpha near 0, not 255, and *look at the 48px output* before
  committing.

## Not here

Machine-local paths, device provisioning, credentials and per-box ops belong in
a machine-local `CLAUDE.md`, never in this file. **This repo is public.**

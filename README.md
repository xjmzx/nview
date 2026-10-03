# nview

(formerly `ndisc-mobile`)

A mobile companion viewer for [ndisc](https://github.com/xjmzx/ndisc) — browse
a Nostr-published music discography on Android and iOS, and react to it.

## What it is

nview reads the owner's `kind:31237` release events (and `kind:5` deletions)
from Nostr relays and renders them in a mobile UI, with the label library
(`kind:31238`) and the suite's feed (`kind:31239`).

It holds no Nostr key. Reactions — `kind:7`, and `kind:5` to take one back —
are signed by a **NIP-46 remote signer**: log in with a `bunker://` string from
nsign, nsec.app, Amber in bunker mode or similar. The app keeps only a
throwaway key for the channel to the signer, and the signer decides what to
sign.

It is a sibling of the glmps web viewers — another consumer of ndisc's frozen
release contract (`release.v2`; the CHANGELOG has the pinned SHA). `schema/`
holds vendored copies; the canonical versions live in the ndisc repo.

Adding / editing / deleting releases is intentionally **out of scope for now**
— a possible later phase.

## Stack

- React 19 + Vite + TypeScript + Tailwind
- `nostr-tools` for relay access and the NIP-46 signer
- Capacitor 8 for the Android and iOS builds

## Develop

```sh
npm install
npm run dev      # browser preview
npm run build    # type-check + production build into dist/
```

## Android (Capacitor)

```sh
npm run build
npx cap sync android   # copy the web build into the native project
npx cap open android   # open in Android Studio to run / build an APK
```

Each GitHub release also carries a debug APK, to sideload.

Requires Android Studio + the Android SDK. The `android/` project is committed;
build outputs inside it are gitignored.

## iOS (Capacitor)

```sh
npm run ios:sync   # build, then copy the web build into ios/App
npm run ios:open   # open in Xcode to run on a device or Archive
```

Mac + Xcode only. There is no public iOS build yet.

## Configuration

`src/config.ts` — the owner npub whose discography is shown, the default relay
set (`relay.fizx.uk` + `relay.nfunc.xyz`), and the release event kind (31237).
Relays are chosen at first-run onboarding and in the relay settings, and saved
on the device; an update does not change a saved list — **Reset** in the relay
settings restores the defaults.

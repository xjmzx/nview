// The discography this viewer shows — the ndisc owner's Nostr identity.
// Mirrors glmps's config; the mobile viewer is another read-only consumer of
// the same release.v1 events (see schema/release.v1.json).
export const OWNER_NPUB =
  "npub1j9kztnc85ednd7ncqhe37ag0evnltn8z6wd84jfqx4ts4gn89gks0vxesa";

export const DEFAULT_RELAYS = [
  "wss://relay.fizx.uk",
  "wss://relay.nfunc.xyz",
] as const;

export const RELEASE_KIND = 31237;

// Record-label image library — single addressable event per owner with
// fixed d-tag `disco-vault:labels`. Wire schema vendored at
// `schema/labels.v1.json`, canonical in xjmzx/ndisc. Consumer-side parser
// + dedicated `useLabelLibrary` hook.
export const LABEL_LIBRARY_KIND = 31238;
export const LABEL_LIBRARY_D = "disco-vault:labels";

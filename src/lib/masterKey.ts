import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// Canonical master-release-key — the content-derived hash that groups "the same
// work" across users and media formats. This is the JS port of the Rust
// reference (ndisc: src-tauri/src/master_key.rs); the two MUST compute
// byte-identical keys. The pinned algorithm and rationale live in ndisc's
// schema/master-release-key-design-2026-07-19.md; the conformance vectors are
// vendored alongside at schema/master-key.vectors.json and asserted in
// masterKey.test.ts.
//
// Phase 1 — PROVE BEFORE WIRE. Nothing here reads or writes a Nostr tag yet;
// emitting `master:` on kind:31237 is a separate coordinated wave (the contract
// is still master-key.v1 UNFROZEN). This module exists so ndisc (Rust) and the
// JS viewers (glmps / nview) can be proven identical ahead of that wave.
//
// Deliberately regex-free for tokenisation (char-category tests + whitespace
// split, no word-boundary regex) so Rust and JS cannot diverge on regex dialect.
// This file is kept BYTE-IDENTICAL across nview + both glmps forks.

const DROP_TOKENS = new Set(["feat", "ft", "featuring"]);

// Normalise one field (artist or title). Mirrors Rust `normalize_field`:
//   1. NFKD, delete combining marks (Unicode category M), THEN lowercase —
//      order matters: a mark surviving to step 3 would become a space and split
//      the word ("Perälä" → "pera la").
//   2. `&` / `+` → " and " (conjunction variants) — MUST precede step 3, else
//      `&`/`+` are dropped as non-alphanumeric and never become "and".
//   3. keep Unicode alphanumerics, everything else → a space. The test is
//      `\p{Alphabetic}` + `\p{N}` (NOT `\p{L}`) to match Rust `is_alphanumeric`
//      = `is_alphabetic() || is_numeric()`; `\p{L}` alone would drop a handful
//      of Other_Alphabetic code points that Rust keeps.
//   4. tokenise on whitespace; drop feat/ft/featuring; drop a single leading
//      "the"; join with single spaces.
export function normalizeField(s: string): string {
  const base = s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

  let cleaned = "";
  // Iterate by CODE POINT (Rust chars()), not UTF-16 unit, so astral scripts
  // are not split into surrogate halves.
  for (const c of base) {
    if (c === "&" || c === "+") cleaned += " and ";
    else if (/[\p{Alphabetic}\p{N}]/u.test(c)) cleaned += c;
    else cleaned += " ";
  }

  // Only ASCII spaces exist post-clean, so split(" ") is exact (avoids any
  // \s Unicode-whitespace subtlety). Drop empties + featured-artist noise.
  const toks = cleaned.split(" ").filter((t) => t !== "" && !DROP_TOKENS.has(t));
  if (toks[0] === "the") toks.shift();
  return toks.join(" ");
}

// The raw content key `norm(artist)|norm(title)`. null when BOTH fields
// normalise to empty — a release with no normalisable content must not group
// with other empties. "|" is a safe separator: step 3 guarantees it never
// appears inside a normalised field.
export function masterKey(artist: string, title: string): string | null {
  const a = normalizeField(artist);
  const t = normalizeField(title);
  if (a === "" && t === "") return null;
  return `${a}|${t}`;
}

// The wire tag value: `master:` + the first 32 lowercase-hex chars (128 bits)
// of SHA-256(utf8(key)). null when there is no key.
export function masterTag(artist: string, title: string): string | null {
  const k = masterKey(artist, title);
  if (k === null) return null;
  const hex = bytesToHex(sha256(new TextEncoder().encode(k)));
  return `master:${hex.slice(0, 32)}`;
}

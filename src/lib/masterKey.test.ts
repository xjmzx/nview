import { describe, it, expect } from "vitest";
import vectors from "../../schema/master-key.vectors.json";
import { masterKey, masterTag } from "./masterKey";

// The vendored fixture IS the contract, shared verbatim with the Rust reference
// (ndisc: src-tauri/src/master_key.rs) and the sibling JS viewers. This suite
// asserts the JS port reproduces every key AND tag, so the implementations
// cannot silently drift. key === null means no key (both fields empty).
type Vector = { artist: string; title: string; key: string | null; tag?: string | null };

const CASES: Vector[] = (vectors as { vectors: Vector[] }).vectors;

describe("master-key normalization (conformance vectors)", () => {
  it("has vectors to check", () => {
    expect(CASES.length).toBeGreaterThan(0);
  });

  for (const v of CASES) {
    it(`key: ${JSON.stringify(v.artist)} / ${JSON.stringify(v.title)}`, () => {
      expect(masterKey(v.artist, v.title)).toBe(v.key ?? null);
    });
    if (v.tag !== undefined) {
      it(`tag: ${JSON.stringify(v.artist)} / ${JSON.stringify(v.title)}`, () => {
        expect(masterTag(v.artist, v.title)).toBe(v.tag ?? null);
      });
    }
  }

  it("Vol 1 and Vol 2 never collide (regression guard)", () => {
    expect(masterKey("X", "Vol 1")).not.toBe(masterKey("X", "Vol 2"));
    expect(masterKey("A", "Level 10")).not.toBe(masterKey("A", "Level 11"));
  });

  it("conjunction variants produce one hash", () => {
    const plus = masterTag("Coldcut", "More Beats + Pieces");
    const amp = masterTag("Coldcut", "More Beats & Pieces");
    const and = masterTag("Coldcut", "More Beats and Pieces");
    expect(plus).toBe(amp);
    expect(amp).toBe(and);
    expect(plus?.startsWith("master:")).toBe(true);
  });

  it("tag is master: + 32 lowercase hex", () => {
    const tag = masterTag("Aphex Twin", "Windowlicker");
    const hex = tag?.slice("master:".length) ?? "";
    expect(hex).toHaveLength(32);
    expect(hex).toMatch(/^[0-9a-f]{32}$/);
  });
});

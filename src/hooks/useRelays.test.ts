import { describe, expect, it } from "vitest";
import {
  migrateRetiredRelays,
  prunePublicRelays,
  resolveStoredRelays,
} from "./useRelays";
import { DEFAULT_RELAYS } from "../config";

describe("migrateRetiredRelays", () => {
  it("rewrites relay.fizx.uk to relay.nfunc.xyz without a duplicate", () => {
    expect(
      migrateRetiredRelays(["wss://relay.fizx.uk", "wss://relay.nfunc.xyz"]),
    ).toEqual(["wss://relay.nfunc.xyz"]);
  });

  it("keeps the replaced relay's position and other relays", () => {
    expect(
      migrateRetiredRelays(["wss://nos.lol", "wss://relay.fizx.uk"]),
    ).toEqual(["wss://nos.lol", "wss://relay.nfunc.xyz"]);
  });

  it("leaves a current list unchanged", () => {
    const list = ["wss://relay.nfunc.xyz", "wss://nos.lol"];
    expect(migrateRetiredRelays(list)).toEqual(list);
  });
});

describe("prunePublicRelays", () => {
  it("drops the seeded public relays and keeps the rest in order", () => {
    expect(
      prunePublicRelays([
        "wss://relay.nfunc.xyz",
        "wss://nos.lol",
        "wss://relay.primal.net",
      ]),
    ).toEqual(["wss://relay.nfunc.xyz"]);
  });

  it("leaves a list without them unchanged", () => {
    const list = ["wss://relay.nfunc.xyz", "wss://relay.example.test"];
    expect(prunePublicRelays(list)).toEqual(list);
  });

  it("can empty a list", () => {
    expect(prunePublicRelays(["wss://nos.lol"])).toEqual([]);
  });
});

describe("resolveStoredRelays", () => {
  const stored = (list: string[]) => JSON.stringify(list);

  it("prunes the May 2026 seed on the first load after the upgrade", () => {
    // What an installed app actually holds: the original seed, with fizx
    // already rewritten in place by migrateRetiredRelays on an earlier load.
    expect(
      resolveStoredRelays(
        stored([
          "wss://relay.nfunc.xyz",
          "wss://nos.lol",
          "wss://relay.primal.net",
        ]),
        false,
      ),
    ).toEqual({
      relays: ["wss://relay.nfunc.xyz"],
      writeBack: ["wss://relay.nfunc.xyz"],
    });
  });

  it("migrates and prunes in one pass", () => {
    expect(
      resolveStoredRelays(
        stored([
          "wss://relay.fizx.uk",
          "wss://nos.lol",
          "wss://relay.primal.net",
        ]),
        false,
      ),
    ).toEqual({
      relays: ["wss://relay.nfunc.xyz"],
      writeBack: ["wss://relay.nfunc.xyz"],
    });
  });

  it("keeps a public relay added back after the prune has run", () => {
    // The point of the flag: by value this is indistinguishable from the seed.
    const list = ["wss://relay.nfunc.xyz", "wss://nos.lol"];
    expect(resolveStoredRelays(stored(list), true)).toEqual({
      relays: list,
      writeBack: null,
    });
  });

  it("still migrates a retired relay once the prune has run", () => {
    expect(resolveStoredRelays(stored(["wss://relay.fizx.uk"]), true)).toEqual({
      relays: ["wss://relay.nfunc.xyz"],
      writeBack: ["wss://relay.nfunc.xyz"],
    });
  });

  it("writes nothing back when the stored list is already current", () => {
    expect(
      resolveStoredRelays(stored(["wss://relay.nfunc.xyz"]), false),
    ).toEqual({ relays: ["wss://relay.nfunc.xyz"], writeBack: null });
  });

  it("falls back to the default when the prune empties the list", () => {
    expect(
      resolveStoredRelays(stored(["wss://nos.lol", "wss://relay.primal.net"]), false),
    ).toEqual({ relays: [...DEFAULT_RELAYS], writeBack: [...DEFAULT_RELAYS] });
  });

  it("uses the default, and writes nothing, with nothing stored", () => {
    expect(resolveStoredRelays(null, false)).toEqual({
      relays: [...DEFAULT_RELAYS],
      writeBack: null,
    });
  });

  it("uses the default, and writes nothing, for corrupt storage", () => {
    expect(resolveStoredRelays("not json", false)).toEqual({
      relays: [...DEFAULT_RELAYS],
      writeBack: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import { migrateRetiredRelays } from "./useRelays";

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

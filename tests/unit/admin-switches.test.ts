import { describe, expect, it } from "vitest";
import { SWITCH_KEYS, isSwitchKey } from "@/lib/admin/switches";
import { copy } from "@/lib/copy";
import { SMALL_FIXTURE } from "../fixtures/catalog";

describe("the switchboard (008 FR-012, R11)", () => {
  it("has every one of the store's 14 switches, once", () => {
    const booleans = Object.entries(SMALL_FIXTURE.settings)
      .filter(([, value]) => typeof value === "boolean")
      .map(([key]) => key)
      .sort();
    expect([...SWITCH_KEYS].sort()).toEqual(booleans);
    expect(SWITCH_KEYS).toHaveLength(14); // 007 added the pattern generator
    expect(new Set(SWITCH_KEYS).size).toBe(14);
  });

  it("gives each one a label and one plain line on what it does", () => {
    for (const key of SWITCH_KEYS) {
      const { label, description } = copy.console.settings.switches[key];
      expect(label.trim(), key).not.toBe("");
      expect(description.trim().length, key).toBeGreaterThan(20);
    }
  });

  it("knows its own keys and nothing else", () => {
    expect(isSwitchKey("roachMotel")).toBe(true);
    expect(isSwitchKey("msrp")).toBe(false);
    expect(isSwitchKey("mediaBaseUrl")).toBe(false);
    expect(isSwitchKey("__proto__")).toBe(false);
  });
});

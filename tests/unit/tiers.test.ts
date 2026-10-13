import { describe, expect, it } from "vitest";
import type { Tier } from "@/lib/catalog/types";
import { isBlandTier, tierOf, validateTiers } from "@/lib/catalog/tiers";

const tier = (id: number, name: string, minScore: number): Tier => ({
  id,
  name,
  tagline: null,
  minScore,
  badgeBgColor: "#FF00AA",
  badgeTextColor: "#000000",
});

// Deliberately out of order: tierOf must not depend on input order.
const DEFAULT_TIERS: Tier[] = [
  tier(4, "Seriously Complicated", 45),
  tier(1, "BLAND", 0),
  tier(6, "Too Complicated for Most Men", 100),
  tier(2, "Complicated", 10),
  tier(5, "Dangerously Complicated", 70),
  tier(3, "Very Complicated", 25),
];

describe("tierOf", () => {
  it.each([
    [0, "BLAND"],
    [9, "BLAND"],
    [10, "Complicated"],
    [24, "Complicated"],
    [25, "Very Complicated"],
    [69, "Seriously Complicated"],
    [99, "Dangerously Complicated"],
    [100, "Too Complicated for Most Men"],
    [10000, "Too Complicated for Most Men"],
  ])("score %i → %s", (score, name) => {
    expect(tierOf(score, DEFAULT_TIERS).name).toBe(name);
  });

  it("throws when no tier starts at 0", () => {
    expect(() => tierOf(5, [tier(2, "Complicated", 10)])).toThrow();
  });
});

describe("isBlandTier", () => {
  it("is true only for the tier starting at 0", () => {
    expect(isBlandTier(tierOf(3, DEFAULT_TIERS))).toBe(true);
    expect(isBlandTier(tierOf(30, DEFAULT_TIERS))).toBe(false);
  });
});

describe("validateTiers", () => {
  it("accepts the defaults", () => {
    expect(validateTiers(DEFAULT_TIERS)).toEqual([]);
  });

  it("requires at least one tier", () => {
    expect(validateTiers([])).not.toEqual([]);
  });

  it("requires a tier at min score 0 (the BLAND tier)", () => {
    expect(validateTiers([tier(2, "Complicated", 10)]).join(" ")).toMatch(/0/);
  });

  it("rejects duplicate min scores and duplicate names", () => {
    expect(validateTiers([tier(1, "BLAND", 0), tier(2, "Other", 0)])).not.toEqual([]);
    expect(validateTiers([tier(1, "BLAND", 0), tier(2, "bland", 10)])).not.toEqual([]);
  });

  it("rejects negative or fractional min scores and empty names", () => {
    expect(validateTiers([tier(1, "BLAND", 0), tier(2, "X", -5)])).not.toEqual([]);
    expect(validateTiers([tier(1, "BLAND", 0), tier(2, "X", 2.5)])).not.toEqual([]);
    expect(validateTiers([tier(1, " ", 0)])).not.toEqual([]);
  });

  it("rejects colors that aren't #RRGGBB", () => {
    const bad = { ...tier(1, "BLAND", 0), badgeBgColor: "pink" };
    expect(validateTiers([bad])).not.toEqual([]);
    const badText = { ...tier(1, "BLAND", 0), badgeTextColor: "#FFF" };
    expect(validateTiers([badText])).not.toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { isBlandTier, sortTiers, tierOf } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { cmp, sub } from "@/lib/money";
import { mulberry32 } from "@/lib/pattern/rng";
import { DEFAULT_MSRP_SETTINGS, msrpUsd, realShirtStartUsd } from "@/lib/pricing/msrp";

const tier = (id: number, minScore: number, name = `T${id}`): Tier => ({
  id,
  name,
  tagline: null,
  minScore,
  badgeBgColor: "#000000",
  badgeTextColor: "#FFFFFF",
});

const TIERS = [
  tier(1, 0, "BLAND"),
  tier(2, 10, "Complicated"),
  tier(3, 25),
  tier(4, 45),
  tier(5, 70),
  tier(6, 100),
];

/** A random amount from $0.01 to $1,000,000.00, as dollars and cents. */
function randomUsd(rand: () => number): string {
  const cents = 1 + Math.floor(rand() * 100_000_000);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

describe("msrpUsd at the defaults ($50.00 + $25.00 a point; 010 FR-001, FR-004)", () => {
  it("defaults to a $50.00 base and $25.00 a point", () => {
    expect(DEFAULT_MSRP_SETTINGS).toEqual({ basePriceUsd: "50.00", perPointUsd: "25.00" });
  });

  it.each([
    [0, "50.00"],
    [2, "100.00"],
    [10, "300.00"],
    [130, "3300.00"],
    [9_000, "225050.00"],
    [10_249, "256275.00"],
    [1_000_000, "25000050.00"],
  ])("score %i → %s", (score, expected) => {
    expect(msrpUsd(score, DEFAULT_MSRP_SETTINGS)).toBe(expected);
  });

  it("follows the dials", () => {
    expect(msrpUsd(10, { basePriceUsd: "0.01", perPointUsd: "0.01" })).toBe("0.11");
    expect(msrpUsd(3, { basePriceUsd: "199.99", perPointUsd: "33.33" })).toBe("299.98");
  });
});

describe("msrpUsd properties over random tunings (constitution VI, 010 SC-004)", () => {
  const rand = mulberry32(2026_10_20);
  const cases = Array.from({ length: 1_000 }, () => {
    const settings: MsrpSettings = { basePriceUsd: randomUsd(rand), perPointUsd: randomUsd(rand) };
    return { settings, score: Math.floor(rand() * 10_000_000) };
  });

  it("is deterministic, whole cents, and climbs by exactly the price per point", () => {
    for (const { settings, score } of cases) {
      const here = msrpUsd(score, settings);
      expect(msrpUsd(score, settings)).toBe(here);
      expect(here).toMatch(/^\d+\.\d{2}$/);
      const next = msrpUsd(score + 1, settings);
      expect(sub(next, here)).toBe(settings.perPointUsd);
      expect(cmp(next, here)).toBe(1);
    }
  });

  it("starts at the base price", () => {
    for (const { settings } of cases.slice(0, 100)) {
      expect(msrpUsd(0, settings)).toBe(settings.basePriceUsd);
    }
  });

  it("keeps every BLAND score below a real shirt's start, for any tiers (analysis C1)", () => {
    for (const { settings } of cases.slice(0, 200)) {
      const count = 2 + Math.floor(rand() * 5);
      const mins = new Set([0]);
      while (mins.size < count) mins.add(1 + Math.floor(rand() * 200));
      const tiers = [...mins].map((min, i) => tier(i + 1, min));
      const start = realShirtStartUsd(tiers, settings)!;
      const firstReal = sortTiers(tiers)[1].minScore;
      for (let score = 0; score < firstReal; score++) {
        expect(isBlandTier(tierOf(score, tiers))).toBe(true);
        expect(cmp(msrpUsd(score, settings), start)).toBe(-1);
      }
    }
  });
});

describe("msrpUsd input validation", () => {
  it.each([-1, 1.5, Number.NaN])("rejects score %s", (score) => {
    expect(() => msrpUsd(score, DEFAULT_MSRP_SETTINGS)).toThrow(RangeError);
  });

  it("rejects a malformed amount in the dials", () => {
    expect(() => msrpUsd(1, { basePriceUsd: "lots", perPointUsd: "25.00" })).toThrow();
    expect(() => msrpUsd(1, { basePriceUsd: "50.00", perPointUsd: "2.5" })).toThrow();
  });
});

describe("realShirtStartUsd (010 FR-006, R4)", () => {
  it("is the MSRP where the first tier above BLAND begins", () => {
    expect(realShirtStartUsd(TIERS, DEFAULT_MSRP_SETTINGS)).toBe("300.00");
  });

  it("sorts the tiers first", () => {
    expect(realShirtStartUsd([...TIERS].reverse(), DEFAULT_MSRP_SETTINGS)).toBe("300.00");
  });

  it("moves with the tier", () => {
    const moved = TIERS.map((t) => (t.minScore === 10 ? { ...t, minScore: 20 } : t));
    expect(realShirtStartUsd(moved, DEFAULT_MSRP_SETTINGS)).toBe("550.00");
  });

  it("is null when BLAND is the only tier", () => {
    expect(realShirtStartUsd([tier(1, 0, "BLAND")], DEFAULT_MSRP_SETTINGS)).toBeNull();
  });
});

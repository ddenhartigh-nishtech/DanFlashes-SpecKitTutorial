import { describe, expect, it } from "vitest";
import { cmp } from "@/lib/money";
import { DEFAULT_MSRP_SETTINGS, msrpUsd } from "@/lib/pricing/msrp";

describe("msrpUsd with default settings (start 300.00, anchor 10, interval 10)", () => {
  it.each([
    [0, "150.00"],
    [10, "300.00"],
    [15, "424.26"],
    [20, "600.00"],
    [30, "1200.00"],
    [50, "4800.00"],
  ])("score %i → %s", (score, expected) => {
    expect(msrpUsd(score, DEFAULT_MSRP_SETTINGS)).toBe(expected);
  });

  it("is deterministic", () => {
    expect(msrpUsd(37, DEFAULT_MSRP_SETTINGS)).toBe(msrpUsd(37, DEFAULT_MSRP_SETTINGS));
  });

  it("never decreases as the score rises (0..400)", () => {
    let previous = msrpUsd(0, DEFAULT_MSRP_SETTINGS);
    for (let score = 1; score <= 400; score++) {
      const current = msrpUsd(score, DEFAULT_MSRP_SETTINGS);
      expect(cmp(current, previous)).toBeGreaterThanOrEqual(0);
      previous = current;
    }
  });

  it("has no ceiling and never uses exponent notation", () => {
    const huge = msrpUsd(1000, DEFAULT_MSRP_SETTINGS);
    expect(huge).toMatch(/^\d{30,}\.\d{2}$/);
  });
});

describe("msrpUsd with owner-tuned settings", () => {
  it("responds to a different start price, anchor, and interval", () => {
    const settings = { startPriceUsd: "199.99", anchorScore: 0, doublingInterval: 5 };
    expect(msrpUsd(0, settings)).toBe("199.99");
    expect(msrpUsd(5, settings)).toBe("399.98");
    expect(msrpUsd(10, settings)).toBe("799.96");
  });
});

describe("msrpUsd input validation", () => {
  it.each([-1, 1.5, Number.NaN])("rejects score %s", (score) => {
    expect(() => msrpUsd(score, DEFAULT_MSRP_SETTINGS)).toThrow();
  });

  it("rejects a non-positive doubling interval", () => {
    expect(() => msrpUsd(10, { ...DEFAULT_MSRP_SETTINGS, doublingInterval: 0 })).toThrow();
  });
});

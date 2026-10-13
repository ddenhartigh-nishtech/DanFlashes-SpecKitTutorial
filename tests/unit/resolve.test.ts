import { describe, expect, it } from "vitest";
import { DEFAULT_MSRP_SETTINGS } from "@/lib/pricing/msrp";
import { resolvePrice } from "@/lib/pricing/resolve";

describe("resolvePrice", () => {
  it("uses the MSRP when the owner hasn't set a final price", () => {
    expect(resolvePrice({ complexity: 15, finalPriceUsd: null }, DEFAULT_MSRP_SETTINGS)).toEqual({
      finalPriceUsd: "424.26",
      msrpUsd: "424.26",
    });
  });

  it("uses the owner's final price when set, still reporting the MSRP", () => {
    expect(
      resolvePrice({ complexity: 15, finalPriceUsd: "999.99" }, DEFAULT_MSRP_SETTINGS),
    ).toEqual({ finalPriceUsd: "999.99", msrpUsd: "424.26" });
  });

  it("follows retuned MSRP settings for shirts without an owner price", () => {
    const retuned = { ...DEFAULT_MSRP_SETTINGS, startPriceUsd: "500.00" };
    expect(resolvePrice({ complexity: 10, finalPriceUsd: null }, retuned).finalPriceUsd).toBe(
      "500.00",
    );
  });

  it("rejects a malformed owner price", () => {
    expect(() =>
      resolvePrice({ complexity: 10, finalPriceUsd: "12.5" }, DEFAULT_MSRP_SETTINGS),
    ).toThrow();
  });
});

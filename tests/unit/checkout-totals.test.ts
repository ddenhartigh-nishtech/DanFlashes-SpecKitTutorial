import { describe, expect, it } from "vitest";
import { orderTotals } from "@/lib/checkout/totals";

const zero = { shippingUsd: "0.00", taxUsd: "0.00" };

describe("orderTotals", () => {
  it("is the shirts alone with no add-ons", () => {
    expect(orderTotals({ subtotalUsd: "344.61", addOnPrices: [], ...zero })).toEqual({
      addOnsUsd: "0.00",
      totalUsd: "344.61",
    });
  });

  it("adds every add-on exactly: Geo Riot plus the four starting add-ons", () => {
    expect(
      orderTotals({
        subtotalUsd: "344.61",
        addOnPrices: ["49.99", "89.99", "29.99", "19.99"],
        ...zero,
      }),
    ).toEqual({ addOnsUsd: "189.96", totalUsd: "534.57" });
  });

  it("never drifts a cent: 0.10 + 0.20 is 0.30", () => {
    expect(orderTotals({ subtotalUsd: "0.10", addOnPrices: ["0.20"], ...zero }).totalUsd).toBe(
      "0.30",
    );
    expect(
      orderTotals({ subtotalUsd: "1228800.00", addOnPrices: ["0.01", "0.02"], ...zero }),
    ).toEqual({ addOnsUsd: "0.03", totalUsd: "1228800.03" });
  });

  it("still adds shipping and tax", () => {
    expect(
      orderTotals({
        subtotalUsd: "100.00",
        addOnPrices: ["10.00"],
        shippingUsd: "5.50",
        taxUsd: "0.25",
      }),
    ).toEqual({ addOnsUsd: "10.00", totalUsd: "115.75" });
  });
});

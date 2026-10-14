import { describe, expect, it } from "vitest";
import { splitPayment } from "@/lib/checkout/split";

describe("splitPayment", () => {
  it.each([
    // balance, total → credit applied, on the card, method
    ["1000.00", "344.61", "344.61", "0.00", "flash_credit"],
    ["344.61", "344.61", "344.61", "0.00", "flash_credit"], // exactly covered: no split
    ["155.39", "344.61", "155.39", "189.22", "split"],
    ["0.01", "344.61", "0.01", "344.60", "split"],
    ["0.00", "344.61", "0.00", "344.61", "card"],
  ] as const)(
    "balance %s, total %s → %s credit + %s card (%s)",
    (balance, total, credit, card, method) => {
      expect(splitPayment(balance, total)).toEqual({ creditUsd: credit, cardUsd: card, method });
    },
  );

  it("never applies more than the balance or the total, and always adds up exactly", () => {
    for (const [balance, total] of [
      ["0.10", "0.30"],
      ["99999999.99", "0.01"],
      ["12.34", "56.78"],
    ] as const) {
      const { creditUsd, cardUsd } = splitPayment(balance, total);
      expect(Number(creditUsd)).toBeLessThanOrEqual(Number(balance));
      expect(Number(creditUsd)).toBeLessThanOrEqual(Number(total));
      expect((Math.round(Number(creditUsd) * 100) + Math.round(Number(cardUsd) * 100)) / 100).toBe(
        Number(total),
      );
    }
  });
});

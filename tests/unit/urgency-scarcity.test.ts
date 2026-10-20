import { describe, expect, it } from "vitest";
import { cartStockLine, foundAnother, makesAnother, stockLine } from "@/lib/urgency/scarcity";

describe("stockLine", () => {
  const shirt = (patch: Partial<{ isBland: boolean; active: boolean; boughtBefore: boolean }>) => ({
    isBland: false,
    active: true,
    boughtBefore: false,
    ...patch,
  });

  it("is always 1 left for an active, non-bland shirt", () => {
    expect(stockLine(shirt({}), true)).toBe("scarce");
  });

  it("admits it found another one once he's bought it", () => {
    expect(stockLine(shirt({ boughtBefore: true }), true)).toBe("again");
  });

  it("has plenty of a bland shirt, bought or not", () => {
    expect(stockLine(shirt({ isBland: true }), true)).toBe("plenty");
    expect(stockLine(shirt({ isBland: true, boughtBefore: true }), true)).toBe("plenty");
  });

  it("says nothing with the switch off, or for a retired shirt", () => {
    expect(stockLine(shirt({}), false)).toBeNull();
    expect(stockLine(shirt({ isBland: true }), false)).toBeNull();
    expect(stockLine(shirt({ active: false }), true)).toBeNull();
  });
});

describe("foundAnother", () => {
  it.each([
    [{ previous: 0, next: 1, isBland: false }, true, true], // a new line
    [{ previous: 1, next: 2, isBland: false }, true, true], // another add, or a raise
    [{ previous: 2, next: 7, isBland: false }, true, true],
    [{ previous: 3, next: 2, isBland: false }, true, false], // a cut
    [{ previous: 2, next: 2, isBland: false }, true, false], // unchanged
    [{ previous: 2, next: 0, isBland: false }, true, false], // removed
    [{ previous: 99, next: 99, isBland: false }, true, false], // already at the cap
    [{ previous: 0, next: 1, isBland: true }, true, false], // nobody wants these
    [{ previous: 0, next: 1, isBland: false }, false, false], // switch off
  ] as const)("%o (on: %s) → %s", (change, on, expected) => {
    expect(foundAnother(change, on)).toBe(expected);
  });
});

describe("cartStockLine (owner, 2026-10-16)", () => {
  it.each([
    ["scarce", 1, "scarce"], // the last one, in his cart
    ["again", 1, "again"],
    ["scarce", 2, "few"], // more than one in the cart: Dan found a few more
    ["again", 5, "few"],
    ["scarce", 99, "few"],
    ["plenty", 5, "plenty"], // nobody wants these, however many
    [null, 5, null], // switch off, or retired
  ] as const)("%s at quantity %i → %s", (line, quantity, expected) => {
    expect(cartStockLine(line, quantity)).toBe(expected);
  });
});

describe("made to order (007 FR-026, R16)", () => {
  const made = { isBland: false, active: true, boughtBefore: false, madeToOrder: true };

  it("says it's made to order instead of 1 left, bought before or not, even when it's bland", () => {
    expect(stockLine(made, true)).toBe("made");
    expect(stockLine({ ...made, boughtBefore: true }, true)).toBe("made");
    expect(stockLine({ ...made, isBland: true }, true)).toBe("made");
  });

  it("says nothing with the switch off, or for a retired one", () => {
    expect(stockLine(made, false)).toBeNull();
    expect(stockLine({ ...made, active: false }, true)).toBeNull();
  });

  it("makes every one of them, however many are in the cart", () => {
    expect(cartStockLine("made", 1)).toBe("made");
    expect(cartStockLine("made", 3)).toBe("madeMany");
  });

  it("makes another one instead of finding one", () => {
    const add = { previous: 0, next: 1, isBland: false, madeToOrder: true };
    expect(foundAnother(add, true)).toBe(false);
    expect(makesAnother(add, true)).toBe(true);
    expect(makesAnother({ ...add, previous: 2, next: 2 }, true)).toBe(false);
    expect(makesAnother(add, false)).toBe(false);
    expect(makesAnother({ ...add, madeToOrder: false }, true)).toBe(false);
  });
});

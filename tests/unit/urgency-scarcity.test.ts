import { describe, expect, it } from "vitest";
import { foundAnother, stockLine } from "@/lib/urgency/scarcity";

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

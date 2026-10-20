import { describe, expect, it } from "vitest";
import { copy } from "@/lib/copy";
import { buyerFor, lookingNow, socialProofFor } from "@/lib/urgency/social-proof";

const START = Date.parse("2026-10-15T00:00:00.000Z");
const MINUTE = 60_000;
const cast = copy.urgency.cast;

describe("lookingNow", () => {
  it("stays a believable 3–40, never 0, all day, for every shirt", () => {
    for (const shirtId of [1, 2, 7, 15, 42, 999]) {
      for (let m = 0; m < 24 * 60; m++) {
        const n = lookingNow(shirtId, START + m * MINUTE);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(3);
        expect(n).toBeLessThanOrEqual(40);
      }
    }
  });

  it("drifts gradually: at most 3 people a minute", () => {
    for (const shirtId of [1, 2, 15]) {
      for (let m = 0; m < 24 * 60; m++) {
        const step =
          lookingNow(shirtId, START + (m + 1) * MINUTE) - lookingNow(shirtId, START + m * MINUTE);
        expect(Math.abs(step)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("is the same for everyone at the same moment, and actually moves over time", () => {
    expect(lookingNow(15, START + 5 * MINUTE)).toBe(lookingNow(15, START + 5 * MINUTE));
    const seen = new Set(Array.from({ length: 60 }, (_, m) => lookingNow(15, START + m * MINUTE)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("buyerFor", () => {
  it("is someone from the cast, holding still for 10 minutes", () => {
    const at = START + 3 * MINUTE;
    expect(cast).toContainEqual(buyerFor(15, at));
    expect(buyerFor(15, at + 6 * MINUTE)).toEqual(buyerFor(15, at));
    const over = new Set(
      Array.from({ length: 30 }, (_, w) => buyerFor(15, START + w * 10 * MINUTE).name),
    );
    expect(over.size).toBeGreaterThan(1); // somebody new buys it later
  });
});

describe("the fake cast", () => {
  it("has at least 8 different coworkers, each with a department", () => {
    expect(cast.length).toBeGreaterThanOrEqual(8);
    expect(new Set(cast.map((c) => `${c.name}/${c.department}`)).size).toBe(cast.length);
    for (const c of cast) {
      expect(c.name.trim()).not.toBe("");
      expect(c.department.trim()).not.toBe("");
    }
  });
});

describe("socialProofFor", () => {
  const on = { socialProof: true };
  const shirt = { id: 15, isBland: false, active: true };

  it("says who's looking and who just bought it", () => {
    const proof = socialProofFor(on, shirt, START)!;
    expect(proof.looking).toBe(lookingNow(15, START));
    expect(proof.buyer).toEqual(buyerFor(15, START));
  });

  it("says nobody wants a bland shirt", () => {
    expect(socialProofFor(on, { ...shirt, isBland: true }, START)).toEqual({
      looking: 0,
      buyer: null,
    });
  });

  it("says nothing with the switch off, or for a retired shirt", () => {
    expect(socialProofFor({ socialProof: false }, shirt, START)).toBeNull();
    expect(socialProofFor(on, { ...shirt, active: false }, START)).toBeNull();
  });
});

describe("socialProofFor a one-of-a-kind shirt (007 FR-026, R16)", () => {
  it("says nothing: nobody else is looking at his, and nobody else bought it", () => {
    const shirt = { id: 15, isBland: false, active: true, oneOfAKind: true };
    expect(socialProofFor({ socialProof: true }, shirt, START)).toBeNull();
  });
});

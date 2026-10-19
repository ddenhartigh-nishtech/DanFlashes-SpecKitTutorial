import { describe, expect, it } from "vitest";
import { pickPoster } from "@/lib/admin/posters";
import { copy } from "@/lib/copy";

const posters = copy.console.posters;

describe("the motivational posters (008 FR-005a)", () => {
  it("has at least 12, each one word in capitals with a serene line under it", () => {
    expect(posters.length).toBeGreaterThanOrEqual(12);
    for (const poster of posters) {
      expect(poster.word).toMatch(/^[A-Z]+$/);
      expect(poster.line.trim().length).toBeGreaterThan(10);
    }
    expect(new Set(posters.map((p) => p.word)).size).toBe(posters.length);
  });
});

describe("pickPoster (008 R5)", () => {
  const randoms = [0, 0.0001, 0.25, 0.5, 0.75, 0.9999];

  it("never repeats the last poster, and always stays in range", () => {
    for (let last = 0; last < posters.length; last++) {
      for (const r of randoms) {
        const i = pickPoster(posters.length, last, () => r);
        expect(i).not.toBe(last);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(posters.length);
      }
    }
  });

  it("can land on every poster, the first visit included", () => {
    const seen = new Set<number>();
    for (let k = 0; k < posters.length; k++) {
      seen.add(pickPoster(posters.length, null, () => k / posters.length));
    }
    expect(seen.size).toBe(posters.length);
  });

  it.each([[null], [-1], [99], [Number.NaN]])("treats a last index of %s as no memory", (last) => {
    expect(pickPoster(12, last, () => 0.999)).toBe(11);
  });

  it("copes with a set of one", () => {
    expect(pickPoster(1, 0, () => 0.5)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { countPattern } from "@/lib/pattern/count";
import { buildPattern, generate } from "@/lib/pattern/generate";
import { ART_MAX_SCORE } from "@/lib/pattern/dial";
import { BLAND_PALETTE, LOUD_PALETTE } from "@/lib/pattern/silhouette";
import { mulberry32 } from "@/lib/pattern/rng";
import type { Recipe } from "@/lib/pattern/recipe";

/** 1,000 recipes from a fixed sequence: scores 0–600, both styles, any seed. */
function recipes(n = 1000): Recipe[] {
  const rand = mulberry32(7);
  return Array.from({ length: n }, () => ({
    score: Math.floor(rand() * 601),
    style: rand() < 0.5 ? "polo" : "button-down",
    seed: Math.floor(rand() * 2 ** 32),
  }));
}

const colorsIn = (svg: string) =>
  new Set(svg.match(/#[0-9A-Fa-f]{6}/g)?.map((c) => c.toUpperCase()));
const FURNITURE = ["#111111", "#FFFFFF"]; // the outline ink and the collar

describe("generate: the same recipe, the same shirt (007 FR-002, SC-001)", () => {
  it("is byte-identical twice over 1,000 recipes", () => {
    for (const recipe of recipes()) {
      expect(generate(recipe, { bland: false }).svg).toBe(generate(recipe, { bland: false }).svg);
    }
  });

  it("changes with the seed and the style", () => {
    const base: Recipe = { score: 60, style: "polo", seed: 1 };
    const svg = generate(base, { bland: false }).svg;
    expect(generate({ ...base, seed: 2 }, { bland: false }).svg).not.toBe(svg);
    expect(generate({ ...base, style: "button-down" }, { bland: false }).svg).not.toBe(svg);
  });
});

describe("the count is exactly the target (007 FR-003, R1 as amended)", () => {
  it("is a point for every 10 drawn, plus 5 a color and 10 a layer past the first", () => {
    const shapes = (points: number[], colors: string[]) =>
      points.map((p, i) => ({ points: p, color: colors[i % colors.length] }));
    expect(countPattern({ shapes: shapes([9], ["#000000"]), layers: 1 })).toBe(0);
    expect(countPattern({ shapes: shapes([4, 6], ["#000000"]), layers: 1 })).toBe(1);
    expect(countPattern({ shapes: shapes([25, 5], ["#000000", "#FFFFFF"]), layers: 3 })).toBe(
      3 + 5 + 20,
    );
  });

  it("over 1,000 recipes, and on up to the art limit", () => {
    for (const recipe of recipes()) {
      expect(countPattern(buildPattern(recipe, { bland: recipe.score < 10 }))).toBe(recipe.score);
      expect(generate(recipe, { bland: false }).count).toBe(recipe.score);
    }
    for (const score of [1_000, 5_000, 10_249, 20_000, ART_MAX_SCORE]) {
      const recipe: Recipe = { score, style: "polo", seed: score };
      expect(countPattern(buildPattern(recipe, { bland: false }))).toBe(score);
    }
  });

  it("never goes down when a shape, a color or a layer is added", () => {
    const pattern = buildPattern({ score: 300, style: "polo", seed: 9 }, { bland: false });
    const base = countPattern(pattern);
    const shape = { ...pattern.shapes[0], points: 1 };
    const big = { ...shape, points: 10 };
    expect(countPattern({ ...pattern, shapes: [...pattern.shapes, shape] })).toBeGreaterThanOrEqual(
      base,
    );
    expect(countPattern({ ...pattern, shapes: [...pattern.shapes, big] })).toBeGreaterThan(base);
    expect(
      countPattern({ ...pattern, shapes: [...pattern.shapes, { ...shape, color: "#ABCDEF" }] }),
    ).toBeGreaterThan(base);
    expect(countPattern({ ...pattern, layers: pattern.layers + 1 })).toBeGreaterThan(base);
  });

  it("is zero for a plain shirt", () => {
    const plain = buildPattern({ score: 0, style: "polo", seed: 3 }, { bland: true });
    expect(plain.shapes).toEqual([]);
    expect(countPattern(plain)).toBe(0);
  });
});

describe("as busy as the seed shirts, and busier as it climbs (007 FR-003, owner review Q8)", () => {
  it("draws at least 200 shapes at 130, where Dan's Masterpiece sits", () => {
    for (const seed of [1, 2, 3]) {
      const { shapes } = buildPattern({ score: 130, style: "polo", seed }, { bland: false });
      expect(shapes.length).toBeGreaterThanOrEqual(200);
    }
  });

  it("draws more the higher it goes", () => {
    for (const seed of [1, 2, 3]) {
      const counts = [12, 52, 130, 500, 2_000, 10_249].map(
        (score) => buildPattern({ score, style: "polo", seed }, { bland: false }).shapes.length,
      );
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
    }
  });
});

describe("loud above BLAND, muted in it (007 FR-005, constitution III)", () => {
  it("uses only the bland palette for a BLAND pattern, and only loud colors above", () => {
    for (const recipe of recipes(200)) {
      const bland = colorsIn(generate(recipe, { bland: true }).svg);
      for (const c of bland) expect([...BLAND_PALETTE, ...FURNITURE], c).toContain(c);
      const loud = colorsIn(generate(recipe, { bland: false }).svg);
      for (const c of loud) expect([...LOUD_PALETTE, ...FURNITURE], c).toContain(c);
    }
  });
});

describe("the art says nothing about the score (007 FR-008)", () => {
  it("has one svg root and no title, description, metadata or comments", () => {
    for (const recipe of recipes(100)) {
      const { svg } = generate(recipe, { bland: false });
      expect(svg.match(/<svg[\s>]/g)).toHaveLength(1);
      expect(svg).not.toMatch(/<title|<desc|<metadata|<!--|data-/i);
    }
  });
});

describe("the art budget (007 SC-005, R13)", () => {
  it("stays under 1 MB at the default top, and under 2 MB at the art limit (24,000)", () => {
    const size = (score: number) =>
      new TextEncoder().encode(
        generate({ score, style: "button-down", seed: 11 }, { bland: false }).svg,
      ).length;
    expect(ART_MAX_SCORE).toBe(24_000);
    expect(size(10_249)).toBeLessThan(1024 * 1024);
    expect(size(ART_MAX_SCORE)).toBeLessThan(2 * 1024 * 1024);
  });
});

import { describe, expect, it } from "vitest";
import {
  ART_MAX_SCORE,
  BEYOND,
  DIAL_STEPS,
  maxDialScore,
  maxPriceableScore,
  scoreAtStep,
} from "@/lib/pattern/dial";
import { nameFor, slugFor, uniqueName } from "@/lib/pattern/names";
import { decodeRecipe, encodeRecipe, recipeKey, type Recipe } from "@/lib/pattern/recipe";
import { mulberry32 } from "@/lib/pattern/rng";
import { DEFAULT_MSRP_SETTINGS, msrpUsd } from "@/lib/pricing/msrp";

describe("the dial's steps (007 FR-004, FR-007, R2)", () => {
  it("has 102 steps, the last one beyond", () => {
    expect(DIAL_STEPS).toBe(102);
    expect(BEYOND).toBe(101);
    expect(scoreAtStep(BEYOND, 10_249)).toBeNull();
  });

  it.each([[10_249], [ART_MAX_SCORE], [120], [0]])(
    "never goes down from step to step (maxDial %i), from 0 to the top",
    (maxDial) => {
      const scores = Array.from({ length: 101 }, (_, step) => scoreAtStep(step, maxDial)!);
      expect(scores[0]).toBe(0);
      expect(scores[100]).toBe(maxDial);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
      expect(Math.max(...scores)).toBe(maxDial);
    },
  );

  it("gives the tiers fine steps: 2.5 points a step up to 200", () => {
    expect(scoreAtStep(4, 10_249)).toBe(10);
    expect(scoreAtStep(40, 10_249)).toBe(100);
    expect(scoreAtStep(80, 10_249)).toBe(200);
  });
});

describe("maxPriceableScore (007 R2)", () => {
  it("is the most the MSRP can price at the default tuning", () => {
    const max = maxPriceableScore(DEFAULT_MSRP_SETTINGS);
    expect(max).toBe(10_249);
    expect(() => msrpUsd(max, DEFAULT_MSRP_SETTINGS)).not.toThrow();
    expect(() => msrpUsd(max + 1, DEFAULT_MSRP_SETTINGS)).toThrow();
  });

  it("drops when prices double faster, and the dial stops at the art limit when they barely climb", () => {
    expect(maxPriceableScore({ ...DEFAULT_MSRP_SETTINGS, doublingInterval: 1 })).toBeLessThan(
      2_000,
    );
    const slow = { ...DEFAULT_MSRP_SETTINGS, doublingInterval: 1_000 };
    expect(maxPriceableScore(slow)).toBeGreaterThan(ART_MAX_SCORE);
    expect(maxDialScore(slow)).toBe(ART_MAX_SCORE);
    expect(maxDialScore(DEFAULT_MSRP_SETTINGS)).toBe(10_249);
  });
});

describe("recipe codes (007 FR-008, FR-011, R3)", () => {
  const rand = mulberry32(42);
  const sample: Recipe[] = Array.from({ length: 1000 }, () => ({
    score: Math.floor(rand() * (ART_MAX_SCORE + 1)),
    style: rand() < 0.5 ? "polo" : "button-down",
    seed: Math.floor(rand() * 2 ** 32),
  }));

  it("round-trips 1,000 recipes, and is letters only, so no score can show", () => {
    for (const recipe of sample) {
      const code = encodeRecipe(recipe);
      expect(code).toMatch(/^[a-z]+$/);
      expect(decodeRecipe(code)).toEqual(recipe);
    }
  });

  it.each([
    ["", "empty"],
    ["abc123", "digits"],
    ["zzzzzzzzzzzzzzzzzzzz", "too long"],
    ["aaaaaaaaaaaaa", "junk"],
  ])("rejects %j (%s)", (code) => {
    expect(decodeRecipe(code)).toBeNull();
  });

  it("names the recipe server-side as v1:<style>:<score>:<seed>", () => {
    expect(recipeKey({ score: 48, style: "polo", seed: 7 })).toBe("v1:polo:48:7");
  });
});

describe("names in Dan's voice (007 R10)", () => {
  it("are the same for the same recipe, have no digits, and are bland for BLAND", () => {
    const recipe: Recipe = { score: 300, style: "polo", seed: 5 };
    expect(nameFor(recipe, false)).toBe(nameFor(recipe, false));
    for (let seed = 0; seed < 200; seed++) {
      const loud = nameFor({ ...recipe, seed }, false);
      expect(loud).not.toMatch(/\d/);
      expect(loud.length).toBeLessThanOrEqual(70);
      expect(nameFor({ score: 3, style: "polo", seed }, true)).not.toMatch(/\d/);
    }
  });

  it("gets II, III and so on when a name is taken", () => {
    const taken = new Set(["Khaki Compromise", "Khaki Compromise II"]);
    expect(uniqueName("Khaki Compromise", (n) => taken.has(n))).toBe("Khaki Compromise III");
    expect(uniqueName("Fresh Name", (n) => taken.has(n))).toBe("Fresh Name");
  });

  it("makes a URL name from the name and the code, letters, digits and hyphens only", () => {
    expect(slugFor("Load-Bearing Kaleidoscope Supreme™", "qwertyuiop")).toBe(
      "load-bearing-kaleidoscope-supreme-qwert",
    );
  });
});

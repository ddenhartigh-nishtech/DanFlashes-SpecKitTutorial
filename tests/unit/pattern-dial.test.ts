import { describe, expect, it } from "vitest";
import { BEYOND, DIAL_MAX_SCORE, DIAL_STEPS, maxDialScore, scoreAtStep } from "@/lib/pattern/dial";
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

  it.each([[10_249], [24_000], [120], [0]])(
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

describe("the dial's top (010 FR-011, R5)", () => {
  it("is a fixed 10,249, where the old exponential ran out of numbers", () => {
    expect(DIAL_MAX_SCORE).toBe(10_249);
    expect(maxDialScore()).toBe(10_249);
  });

  it("is priced in full at the defaults: $256,275.00", () => {
    expect(msrpUsd(DIAL_MAX_SCORE, DEFAULT_MSRP_SETTINGS)).toBe("256275.00");
  });

  it("keeps every step's score from before 010, so old links open the same shirts (FR-012)", () => {
    const steps = Array.from({ length: 101 }, (_, step) => scoreAtStep(step, maxDialScore()));
    expect(steps.slice(0, 5)).toEqual([0, 3, 5, 8, 10]);
    expect(steps[80]).toBe(200);
    expect(steps[90]).toBe(1432);
    expect(steps[100]).toBe(10_249);
  });
});

describe("recipe codes (007 FR-008, FR-011, R3)", () => {
  const rand = mulberry32(42);
  const sample: Recipe[] = Array.from({ length: 1000 }, () => ({
    score: Math.floor(rand() * (DIAL_MAX_SCORE + 1)),
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

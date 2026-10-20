import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cmp } from "@/lib/money";
import { BEYOND, DIAL_STEPS } from "@/lib/pattern/dial";
import { buildDial } from "@/lib/pattern/dial-view";
import { materialize } from "@/lib/pattern/materialize";
import { decodeRecipe, encodeRecipe } from "@/lib/pattern/recipe";
import { msrpUsd, DEFAULT_MSRP_SETTINGS } from "@/lib/pricing/msrp";
import { createSeededTestDb, setSwitches } from "../helpers/db";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-dial-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("buildDial: what the browser gets (007 R4)", () => {
  it("is 102 steps of codes, tiers and prices, with no score anywhere", () => {
    const { db } = createSeededTestDb();
    const view = buildDial(db, {})!;
    expect(view.steps).toHaveLength(DIAL_STEPS);
    const keys = new Set(view.steps.flatMap((step) => Object.keys(step)));
    expect([...keys].filter((k) => /score|complexity/i.test(k))).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/score|complexity/i);
    expect(view).toMatchObject({ current: 20, style: "polo", seed: 1 });
  });

  it("never lowers the price on the way up, and has no price beyond the top", () => {
    const { db } = createSeededTestDb();
    const { steps } = buildDial(db, {})!;
    for (let i = 1; i < BEYOND; i++) {
      expect(cmp(steps[i].priceUsd!, steps[i - 1].priceUsd!)).toBeGreaterThanOrEqual(0);
    }
    expect(steps[BEYOND]).toMatchObject({ code: null, priceUsd: null });
    expect(steps[0].tier.isBland).toBe(true);
    expect(steps[100].tier.isBland).toBe(false);
  });

  it("follows a link to its exact shirt, snapping the dial to the nearest step", () => {
    const { db } = createSeededTestDb();
    const r = encodeRecipe({ score: 51, style: "button-down", seed: 99 });
    const view = buildDial(db, { r })!;
    expect(view).toMatchObject({ current: 20, style: "button-down", seed: 99 });
    expect(view.steps[20].code).toBe(r);
    expect(view.steps[20].priceUsd).toBe(msrpUsd(51, DEFAULT_MSRP_SETTINGS));
  });

  it("shuffles and restyles from a link, keeping the level", () => {
    const { db } = createSeededTestDb();
    const r = encodeRecipe({ score: 100, style: "polo", seed: 5 });
    const view = buildDial(db, { r, seed: "6", style: "button-down" })!;
    expect(view).toMatchObject({ current: 40, style: "button-down", seed: 6 });
    expect(decodeRecipe(view.steps[40].code!)).toEqual({
      score: 100,
      style: "button-down",
      seed: 6,
    });
  });

  it("falls back to the default for a link that isn't one", () => {
    const { db } = createSeededTestDb();
    expect(buildDial(db, { r: "not-a-recipe", seed: "-4", style: "tank" })).toMatchObject({
      current: 20,
      style: "polo",
      seed: 1,
    });
  });

  it("shows a setting that's already a shirt as that shirt, priced as it is now", () => {
    const { db, sqlite } = createSeededTestDb();
    const { steps } = buildDial(db, {})!;
    const recipe = decodeRecipe(steps[40].code!)!;
    const made = materialize(db, recipe, { origin: "dial" });
    if (!made.ok) throw new Error("not made");
    // Dan re-scores it (constitution II, v4.2.0): the dial shows his call.
    sqlite.prepare("UPDATE shirts SET complexity = 30 WHERE id = ?").run(made.shirtId);
    const again = buildDial(db, {})!.steps[40];
    expect(again.made).toMatchObject({ slug: made.slug });
    expect(again.made!.priceUsd).toBe(msrpUsd(30, DEFAULT_MSRP_SETTINGS));
  });

  it("is gone while the switch is off", () => {
    const { db } = createSeededTestDb();
    setSwitches(db, { patternGenerator: false });
    expect(buildDial(db, {})).toBeNull();
  });
});

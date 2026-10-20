import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { artForCode } from "@/lib/pattern/dial-view";
import { generate } from "@/lib/pattern/generate";
import { materialize } from "@/lib/pattern/materialize";
import { encodeRecipe } from "@/lib/pattern/recipe";
import { createSeededTestDb, setSwitches } from "../helpers/db";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-art-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("a recipe's art (007 R4, contracts: /how-complicated/art/[code])", () => {
  it("draws a fresh recipe exactly as the generator does, muted when it's BLAND", () => {
    const { db } = createSeededTestDb();
    const loud = { score: 60, style: "polo" as const, seed: 4 };
    expect(text(artForCode(db, encodeRecipe(loud))!)).toBe(generate(loud, { bland: false }).svg);
    const bland = { score: 3, style: "polo" as const, seed: 4 };
    expect(text(artForCode(db, encodeRecipe(bland))!)).toBe(generate(bland, { bland: true }).svg);
  });

  it("serves a made shirt's stored art", () => {
    const { db } = createSeededTestDb();
    const recipe = { score: 80, style: "button-down" as const, seed: 8 };
    materialize(db, recipe, { origin: "dial" });
    expect(text(artForCode(db, encodeRecipe(recipe))!)).toBe(
      generate(recipe, { bland: false }).svg,
    );
  });

  it("has nothing for junk, for beyond the top, or while the switch is off", () => {
    const { db } = createSeededTestDb();
    expect(artForCode(db, "nonsense")).toBeNull();
    expect(artForCode(db, encodeRecipe({ score: 900_000, style: "polo", seed: 1 }))).toBeNull();
    setSwitches(db, { patternGenerator: false });
    expect(artForCode(db, encodeRecipe({ score: 60, style: "polo", seed: 4 }))).toBeNull();
    expect(
      artForCode(db, encodeRecipe({ score: 60, style: "polo", seed: 4 }), { ignoreSwitch: true }),
    ).not.toBeNull();
  });
});

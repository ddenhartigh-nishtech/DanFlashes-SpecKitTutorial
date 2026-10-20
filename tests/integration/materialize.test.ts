import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auditCatalog } from "@/lib/catalog/audit";
import { getSettings, saveSettings } from "@/lib/data/settings";
import { getShirtBySlug } from "@/lib/data/shirts";
import type { Sqlite } from "@/lib/db/client";
import { DIAL_MAX_SCORE } from "@/lib/pattern/dial";
import { generate } from "@/lib/pattern/generate";
import { materialize } from "@/lib/pattern/materialize";
import type { Recipe } from "@/lib/pattern/recipe";
import { createSeededTestDb } from "../helpers/db";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-generated-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const recipe = (score: number, seed = 7, style: Recipe["style"] = "polo"): Recipe => ({
  score,
  style,
  seed,
});
const row = (sqlite: Sqlite, id: number) =>
  sqlite.prepare("SELECT * FROM shirts WHERE id = ?").get(id) as Record<string, unknown>;
const counts = (sqlite: Sqlite) =>
  sqlite
    .prepare(
      "SELECT (SELECT COUNT(*) FROM shirts) AS shirts, (SELECT COUNT(*) FROM media) AS media, (SELECT COUNT(*) FROM shirt_images) AS images",
    )
    .get();

describe("materialize: a recipe becomes the one shirt (007 R6)", () => {
  it("makes a dial recipe an active, unlisted shirt at its counted score and MSRP", () => {
    const { db, sqlite } = createSeededTestDb();
    const made = materialize(db, recipe(60), { origin: "dial" });
    expect(made).toMatchObject({ ok: true, created: true });
    if (!made.ok) return;
    expect(row(sqlite, made.shirtId)).toMatchObject({
      origin: "dial",
      recipe: "v1:polo:60:7",
      listed: 0,
      status: "active",
      complexity: 60,
      final_price_usd: null,
      style: "polo",
    });
    const shirt = getShirtBySlug(db, made.slug)!;
    expect(shirt.finalPriceUsd).toBe(shirt.msrpUsd);
    expect(shirt.name).not.toMatch(/\d/);
    expect(made.slug).toMatch(/^[a-z-]+-[a-z]{5}$/);
  });

  it("makes an owner recipe a resting, listed shirt", () => {
    const { db, sqlite } = createSeededTestDb();
    const made = materialize(db, recipe(48), { origin: "owner", name: "Spreadsheet Rapture" });
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(row(sqlite, made.shirtId)).toMatchObject({
      origin: "owner",
      listed: 1,
      status: "inactive",
      name: "Spreadsheet Rapture",
    });
  });

  it("stores its art as an upload, byte for byte the generator's, as the main picture", () => {
    const { db, sqlite } = createSeededTestDb();
    const made = materialize(db, recipe(60, 3, "button-down"), { origin: "dial" });
    if (!made.ok) throw new Error("not made");
    const image = sqlite
      .prepare(
        "SELECT m.key, m.alt, m.kind, i.position FROM shirt_images i JOIN media m ON m.id = i.media_id WHERE i.shirt_id = ?",
      )
      .get(made.shirtId) as { key: string; alt: string; kind: string; position: number };
    expect(image).toMatchObject({ kind: "shirt", position: 0 });
    expect(image.key).toMatch(/^uploads\/[0-9a-f-]{36}\.svg$/);
    const file = fs.readFileSync(path.join(dir, image.key.slice("uploads/".length)), "utf8");
    expect(file).toBe(generate(recipe(60, 3, "button-down"), { bland: false }).svg);
  });

  it("finds the same shirt for the same recipe, and writes nothing new", () => {
    const { db, sqlite } = createSeededTestDb();
    const first = materialize(db, recipe(75), { origin: "dial" });
    const before = [counts(sqlite), fs.readdirSync(dir).length];
    const again = materialize(db, recipe(75), { origin: "dial" });
    expect(again).toMatchObject({ ok: true, created: false });
    expect(first.ok && again.ok && again.shirtId === first.shirtId).toBe(true);
    expect([counts(sqlite), fs.readdirSync(dir).length]).toEqual(before);
  });

  it("refuses past the dial's fixed top under any tuning, writing nothing (010 FR-011)", () => {
    const { db, sqlite } = createSeededTestDb();
    const before = [counts(sqlite), fs.readdirSync(dir).length];
    expect(materialize(db, recipe(DIAL_MAX_SCORE + 1), { origin: "dial" })).toMatchObject({
      ok: false,
      code: "BEYOND",
    });
    saveSettings(db, { ...getSettings(db), msrp: { basePriceUsd: "0.01", perPointUsd: "0.01" } });
    expect(materialize(db, recipe(DIAL_MAX_SCORE + 1), { origin: "dial" })).toMatchObject({
      ok: false,
      code: "BEYOND",
    });
    expect([counts(sqlite), fs.readdirSync(dir).length]).toEqual(before);
    expect(materialize(db, recipe(DIAL_MAX_SCORE), { origin: "dial" }).ok).toBe(true);
  });

  it("makes a BLAND pattern under any dials: on a climbing line it's always under a real shirt", () => {
    const { db, sqlite } = createSeededTestDb();
    saveSettings(db, {
      ...getSettings(db),
      msrp: { basePriceUsd: "9999.99", perPointUsd: "0.01" },
    });
    const made = materialize(db, recipe(5), { origin: "dial" });
    if (!made.ok) throw new Error("not made");
    expect(row(sqlite, made.shirtId).final_price_usd).toBeNull();
  });

  it("gives a taken name a numeral, and keeps the catalog check clean after 50 shirts (SC-006)", () => {
    const { db, sqlite } = createSeededTestDb();
    const a = materialize(db, recipe(30, 1), { origin: "owner", name: "Khaki Compromise" });
    const b = materialize(db, recipe(31, 1), { origin: "owner", name: "Khaki Compromise" });
    if (!a.ok || !b.ok) throw new Error("not made");
    expect(row(sqlite, b.shirtId).name).toBe("Khaki Compromise II");
    for (let i = 0; i < 50; i++) {
      expect(materialize(db, recipe((i * 977) % 3000, 100 + i), { origin: "dial" }).ok).toBe(true);
    }
    expect(auditCatalog(db).errors).toEqual([]);
  });
});

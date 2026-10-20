import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  generatorArt,
  saveGeneratedShirtCore,
  setShirtListedCore,
} from "@/lib/actions/admin/generator";
import { makeItMineCore } from "@/lib/actions/dial";
import { copy } from "@/lib/copy";
import { getAdminShirt, listAdminShirts } from "@/lib/data/admin-shirts";
import { getShirtBySlug, listCatalogShirts } from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { SESSION_COOKIE } from "@/lib/http/cookies";
import { msrpUsd, DEFAULT_MSRP_SETTINGS } from "@/lib/pricing/msrp";
import { buildDial } from "@/lib/pattern/dial-view";
import { generate } from "@/lib/pattern/generate";
import { generatorPreview } from "@/lib/pattern/generator-view";
import { encodeRecipe } from "@/lib/pattern/recipe";
import { form } from "../helpers/cookies";
import { createSeededTestDb, setSwitches } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-gen-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

const g = copy.console.generator;
const owner = (db: Db) => person(db, { admin: true });
const fields = (over: Record<string, string> = {}) => ({
  score: "48",
  style: "polo",
  seed: "7",
  name: "Spreadsheet Rapture",
  ...over,
});

/** A shirt a shopper made at the dial (unlisted, one of a kind). */
function dialShirt(db: Db) {
  const made = makeItMineCore(
    db,
    form({ code: buildDial(db, {})!.steps[40].code! }),
    person(db).id,
  );
  if (!made.ok) throw new Error("not made");
  return getShirtBySlug(db, made.slug)!;
}

describe("the console's generator preview (007 FR-019)", () => {
  it("shows the art's code, the counted score, tier, MSRP and a name for Dan to keep", () => {
    const { db } = createSeededTestDb();
    const view = generatorPreview(db, { score: "48", style: "button-down", seed: "3" });
    expect(view).toMatchObject({
      ok: true,
      recipe: { score: 48, style: "button-down", seed: 3 },
      code: encodeRecipe({ score: 48, style: "button-down", seed: 3 }),
      count: 48,
      msrpUsd: msrpUsd(48, DEFAULT_MSRP_SETTINGS),
      made: null,
    });
    if (!view.ok) return;
    expect(view.count).toBe(generate(view.recipe, { bland: false }).count);
    expect(view.name).toMatch(/^[A-Za-z' -]+$/);
    expect(view.tier.name).not.toBe("");
  });

  it("starts from seed 1 and polo, and says when a recipe is already a shirt", () => {
    const { db, sqlite } = createSeededTestDb();
    const { jar } = owner(db);
    saveGeneratedShirtCore(db, jar, form(fields({ seed: "1" })));
    const view = generatorPreview(db, { score: "48" });
    expect(view).toMatchObject({ ok: true, recipe: { style: "polo", seed: 1 } });
    const row = sqlite.prepare("SELECT id FROM shirts WHERE name = ?").get("Spreadsheet Rapture");
    expect(view.ok && view.made).toEqual({
      id: (row as { id: number }).id,
      name: "Spreadsheet Rapture",
    });
  });

  it.each([
    ["nothing asked yet", {}, "empty"],
    ["not a whole number", { score: "4.5" }, "range"],
    ["too complicated to price", { score: "10250" }, "unpriceable"],
  ] as const)("has no preview for %s", (_n, query, reason) => {
    const { db } = createSeededTestDb();
    expect(generatorPreview(db, query)).toMatchObject({ ok: false, reason, maxScore: 10_249 });
  });
});

describe("saveGeneratedShirt (007 FR-020, contracts: the console)", () => {
  it("makes a resting, listed shirt with Dan's name and the counted score, art in the library", () => {
    const { db, sqlite } = createSeededTestDb();
    const state = saveGeneratedShirtCore(db, owner(db).jar, form(fields()));
    expect(state).toMatchObject({ ok: true, id: expect.any(Number) });
    if (!state.ok) return;
    const row = sqlite.prepare("SELECT * FROM shirts WHERE id = ?").get(state.id) as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({
      name: "Spreadsheet Rapture",
      complexity: 48,
      status: "inactive",
      origin: "owner",
      listed: 1,
      recipe: "v1:polo:48:7",
    });
    const media = sqlite
      .prepare(
        "SELECT m.kind FROM media m JOIN shirt_images i ON i.media_id = m.id WHERE i.shirt_id = ?",
      )
      .all(state.id);
    expect(media).toEqual([{ kind: "shirt" }]);
  });

  it.each([
    ["a score that isn't one", { score: "lots" }, g.scoreRange(10_249)],
    ["a score past the top", { score: "200000" }, copy.console.shirts.preview.cantPrice],
    ["one it can't price", { score: "10250" }, copy.console.shirts.preview.cantPrice],
    ["a style we don't make", { style: "tank" }, g.badStyle],
    ["a seed that isn't one", { seed: "-2" }, g.badSeed],
    ["no name", { name: "   " }, g.nameLength],
    ["a name past 80 characters", { name: "x".repeat(81) }, g.nameLength],
  ])("refuses %s, and changes nothing", (_n, over, message) => {
    const { db, sqlite } = createSeededTestDb();
    const { jar } = owner(db);
    const before = sqlite.prepare("SELECT COUNT(*) AS n FROM shirts").get();
    const state = saveGeneratedShirtCore(db, jar, form(fields(over)));
    expect(state.ok).toBe(false);
    if (state.ok) return;
    expect(state.issues?.map((i) => i.message)).toContain(message);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM shirts").get()).toEqual(before);
  });

  it("refuses a recipe that's already a shirt, and links to it", () => {
    const { db } = createSeededTestDb();
    const { jar } = owner(db);
    const first = saveGeneratedShirtCore(db, jar, form(fields()));
    if (!first.ok) throw new Error("not saved");
    expect(saveGeneratedShirtCore(db, jar, form(fields({ name: "Again" })))).toEqual({
      ok: false,
      message: g.alreadyMade("Spreadsheet Rapture"),
      link: { href: `/admin/shirts/${first.id}`, label: g.openIt },
    });
  });
});

describe("setShirtListed (007 FR-018, FR-021)", () => {
  it("lists a shopper-made shirt in the store, and unlists it again", () => {
    const { db } = createSeededTestDb();
    const { jar } = owner(db);
    const shirt = dialShirt(db);
    const inListing = () => listCatalogShirts(db).some((s) => s.slug === shirt.slug);
    expect(inListing()).toBe(false);

    expect(setShirtListedCore(db, jar, form({ id: String(shirt.id), listed: "1" }))).toEqual({
      ok: true,
      message: g.listedNow,
    });
    expect(inListing()).toBe(true);
    expect(setShirtListedCore(db, jar, form({ id: String(shirt.id), listed: "0" }))).toEqual({
      ok: true,
      message: g.unlistedNow,
    });
    expect(inListing()).toBe(false);
  });

  it.each([
    ["a shirt Dan drew", () => "1", "0", g.notDial],
    ["a shirt that isn't there", () => "9999", "1", copy.console.shirts.notFound],
    ["a choice that isn't one", (db: Db) => String(dialShirt(db).id), "maybe", g.badListed],
  ])("refuses %s, and changes nothing", (_n, idOf, listed, message) => {
    const { db, sqlite } = createSeededTestDb();
    const { jar } = owner(db);
    const shirtId = idOf(db);
    const before = sqlite.prepare("SELECT id, listed FROM shirts ORDER BY id").all();
    expect(setShirtListedCore(db, jar, form({ id: shirtId, listed }))).toEqual({
      ok: false,
      message,
    });
    expect(sqlite.prepare("SELECT id, listed FROM shirts ORDER BY id").all()).toEqual(before);
  });
});

describe("listAdminShirts knows where each shirt came from (007 FR-021)", () => {
  it("marks the origin and filters by it, generated meaning Dan's and the shoppers'", () => {
    const { db } = createSeededTestDb();
    const saved = saveGeneratedShirtCore(db, owner(db).jar, form(fields()));
    if (!saved.ok) throw new Error("not saved");
    const made = dialShirt(db);

    const all = listAdminShirts(db, {});
    expect(all.find((r) => r.id === saved.id)).toMatchObject({ origin: "owner", listed: true });
    expect(all.find((r) => r.id === made.id)).toMatchObject({ origin: "dial", listed: false });
    expect(new Set(listAdminShirts(db, { origin: "catalog" }).map((r) => r.origin))).toEqual(
      new Set(["catalog"]),
    );
    expect(listAdminShirts(db, { origin: "owner" }).map((r) => r.id)).toEqual([saved.id]);
    expect(listAdminShirts(db, { origin: "dial" }).map((r) => r.id)).toEqual([made.id]);
    expect(
      listAdminShirts(db, { origin: "generated" })
        .map((r) => r.id)
        .sort(),
    ).toEqual([saved.id, made.id].sort());
  });
});

describe("GET /admin/generator/art/[code] (007 contracts: the console)", () => {
  const recipe = { score: 60, style: "polo" as const, seed: 4 };
  const request = (token?: string) =>
    new Request(`http://localhost/admin/generator/art/${encodeRecipe(recipe)}`, {
      headers: token
        ? { cookie: `theme=loud; ${SESSION_COOKIE}=${encodeURIComponent(token)}` }
        : {},
    });
  const text = (bytes: Uint8Array | null) => (bytes ? new TextDecoder().decode(bytes) : null);

  it("draws for an admin, even while the pattern generator is off", () => {
    const { db } = createSeededTestDb();
    const token = owner(db).jar.get(SESSION_COOKIE)!;
    setSwitches(db, { patternGenerator: false });
    expect(text(generatorArt(db, request(token), encodeRecipe(recipe)))).toBe(
      generate(recipe, { bland: false }).svg,
    );
  });

  it("has nothing for a shopper, a guest, or a code that isn't one", () => {
    const { db } = createSeededTestDb();
    const shopper = person(db).jar.get(SESSION_COOKIE)!;
    const admin = owner(db).jar.get(SESSION_COOKIE)!;
    expect(generatorArt(db, request(shopper), encodeRecipe(recipe))).toBeNull();
    expect(generatorArt(db, request(), encodeRecipe(recipe))).toBeNull();
    expect(generatorArt(db, request("not-a-session"), encodeRecipe(recipe))).toBeNull();
    expect(generatorArt(db, request(admin), "nonsense")).toBeNull();
  });
});

describe("the editor knows who made a shopper's shirt (007 FR-021, R18)", () => {
  it("names its maker for Dan, and nobody for his own or the catalog's", () => {
    const { db } = createSeededTestDb();
    const shopper = person(db, { email: "maker@danflashes.test", displayName: "Craig" });
    const made = makeItMineCore(db, form({ code: buildDial(db, {})!.steps[40].code! }), shopper.id);
    if (!made.ok || !("slug" in made)) throw new Error("not made");
    const shirt = listAdminShirts(db, { origin: "dial" })[0];
    expect(getAdminShirt(db, shirt.id)?.maker).toEqual({ id: shopper.id, label: "Craig" });
    expect(getAdminShirt(db, 1)?.maker).toBeNull();
  });
});

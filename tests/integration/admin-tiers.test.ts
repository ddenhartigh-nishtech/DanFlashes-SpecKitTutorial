import { describe, expect, it } from "vitest";
import { saveTiersCore } from "@/lib/actions/admin/tiers";
import { listCatalogShirts } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

function setup() {
  const test = createSeededTestDb();
  return { ...test, jar: person(test.db, { admin: true }).jar };
}

const drafts = (db: Db) => listTiers(db).map((t) => ({ ...t }));
const save = (tiers: unknown) => form({ tiers: JSON.stringify(tiers) });

describe("saveTiers (008 FR-027–FR-030)", () => {
  it("updates, adds and removes in one save, and the store's badges follow", () => {
    const { db, jar } = setup();
    const [bland, complicated] = drafts(db);
    const state = saveTiersCore(
      db,
      jar,
      save([
        { ...bland, tagline: "Beige is a choice." },
        { ...complicated, name: "Rather Complicated", minScore: 12 },
        // "Very Complicated" is left out: removed.
        {
          name: "Off the Charts",
          tagline: "Most men couldn't.",
          minScore: 28,
          badgeBgColor: "#7A00FF",
          badgeTextColor: "#FFE600",
        },
      ]),
    );
    expect(state.ok).toBe(true);
    expect(listTiers(db).map((t) => [t.name, t.minScore, t.tagline])).toEqual([
      ["BLAND", 0, "Beige is a choice."],
      ["Rather Complicated", 12, null],
      ["Off the Charts", 28, "Most men couldn't."],
    ]);
    const fury = listCatalogShirts(db).find((s) => s.slug === "fractal-fury")!;
    expect(fury.tier.name).toBe("Off the Charts");
  });

  it("can swap two tiers' names in one save", () => {
    const { db, jar } = setup();
    const [bland, a, b] = drafts(db);
    const state = saveTiersCore(
      db,
      jar,
      save([bland, { ...a, name: b.name }, { ...b, name: a.name }]),
    );
    expect(state.ok).toBe(true);
    expect(listTiers(db).map((t) => t.name)).toEqual(["BLAND", b.name, a.name]);
  });

  it("refuses a change that drops Dan's own price into BLAND at or above a real shirt's start, naming it", () => {
    const { db, sqlite, jar } = setup();
    // At its MSRP, Geo Riot (15) would be BLAND under a $550.00 start (010 R4); at Dan's $600.00, no.
    sqlite.prepare("UPDATE shirts SET final_price_usd = '600.00' WHERE slug = 'geo-riot'").run();
    const before = listTiers(db);
    const [bland, complicated, very] = drafts(db);
    const state = saveTiersCore(db, jar, save([bland, { ...complicated, minScore: 20 }, very]));
    expect(state.ok).toBe(false);
    expect(!state.ok && state.issues?.map((i) => i.field)).toEqual(["geo-riot"]);
    expect(listTiers(db)).toEqual(before);
  });

  it.each([
    ["not JSON", "{oops"],
    ["not a list", JSON.stringify({ name: "x" })],
    ["BLAND renamed", null],
  ])("refuses %s and changes nothing", (_name, raw) => {
    const { db, jar } = setup();
    const before = listTiers(db);
    const tiers = drafts(db);
    tiers[0].name = "Understated";
    const state = saveTiersCore(db, jar, form({ tiers: raw ?? JSON.stringify(tiers) }));
    expect(state.ok).toBe(false);
    expect(listTiers(db)).toEqual(before);
  });
});

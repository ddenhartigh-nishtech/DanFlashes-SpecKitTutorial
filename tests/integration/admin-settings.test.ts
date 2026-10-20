import { describe, expect, it } from "vitest";
import {
  saveMediaSettingsCore,
  savePresetsCore,
  saveTuningCore,
  setSwitchCore,
} from "@/lib/actions/admin/settings";
import { SWITCH_KEYS } from "@/lib/admin/switches";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/settings";
import type { Sqlite } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

function setup() {
  const test = createSeededTestDb();
  return { ...test, jar: person(test.db, { admin: true }).jar };
}

const row = (sqlite: Sqlite) =>
  sqlite.prepare("SELECT * FROM store_settings WHERE id = 1").get() as Record<string, unknown>;

/** Everything but the named columns, to prove a save touched only its own. */
function rest(sqlite: Sqlite, ...columns: string[]) {
  const all = { ...row(sqlite) };
  for (const c of columns) delete all[c];
  return all;
}

describe("setSwitch (008 FR-012, FR-013)", () => {
  it.each(SWITCH_KEYS)("flips %s off and on again, and touches nothing else", (key) => {
    const { db, sqlite, jar } = setup();
    const column = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const others = rest(sqlite, column);
    expect(setSwitchCore(db, jar, form({ key, on: "0" })).ok).toBe(true);
    expect(getSettings(db)[key]).toBe(false);
    expect(rest(sqlite, column)).toEqual(others);
    expect(setSwitchCore(db, jar, form({ key, on: "1" })).ok).toBe(true);
    expect(getSettings(db)[key]).toBe(true);
  });

  it.each([
    [{ key: "msrpPerPointUsd", on: "0" }],
    [{ key: "__proto__", on: "0" }],
    [{ key: "roachMotel", on: "maybe" }],
  ])("refuses %j and changes nothing", (fields) => {
    const { db, sqlite, jar } = setup();
    const before = row(sqlite);
    expect(setSwitchCore(db, jar, form(fields)).ok).toBe(false);
    expect(row(sqlite)).toEqual(before);
  });
});

describe("saveTuning (008 FR-014, FR-015; 010 FR-003, FR-013)", () => {
  const tuning = (base: string, perPoint = "25.00") =>
    form({ basePriceUsd: base, perPointUsd: perPoint });
  const t = copy.console.settings.tuning;

  it("saves only the two dials, and keeps whole dollars as dollars and cents", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(sqlite, "msrp_base_price_usd", "msrp_per_point_usd");
    expect(saveTuningCore(db, jar, tuning("40", "30.5")).ok).toBe(true);
    expect(getSettings(db).msrp).toEqual({ basePriceUsd: "40.00", perPointUsd: "30.50" });
    expect(rest(sqlite, "msrp_base_price_usd", "msrp_per_point_usd")).toEqual(others);
  });

  it.each([
    ["a blank base", tuning(""), "basePriceUsd", t.baseFormat],
    ["a free base", tuning("0"), "basePriceUsd", t.baseFormat],
    ["a negative base", tuning("-5"), "basePriceUsd", t.baseFormat],
    ["a base that isn't money", tuning("lots"), "basePriceUsd", t.baseFormat],
    ["a base past the cent", tuning("50.001"), "basePriceUsd", t.baseFormat],
    ["a blank point", tuning("50", ""), "perPointUsd", t.perPointFormat],
    ["a free point", tuning("50", "0"), "perPointUsd", t.perPointFormat],
    ["a negative point", tuning("50", "-5"), "perPointUsd", t.perPointFormat],
    ["a point that isn't money", tuning("50", "lots"), "perPointUsd", t.perPointFormat],
  ])("refuses %s, saving nothing", (_name, fields, field, message) => {
    const { db, jar } = setup();
    const before = getSettings(db).msrp;
    const state = saveTuningCore(db, jar, fields);
    expect(state.ok).toBe(false);
    expect(!state.ok && state.issues).toEqual([{ field, message }]);
    expect(getSettings(db).msrp).toEqual(before);
  });

  it("refuses dials that would put Dan's own BLAND price at a real shirt's start, naming it", () => {
    const { db, sqlite, jar } = setup();
    sqlite
      .prepare("UPDATE shirts SET final_price_usd = '250.00' WHERE slug = 'beige-regret'")
      .run();
    // $10 + $30 a point: a real shirt starts at $310.00, still above Dan's $250.00.
    expect(saveTuningCore(db, jar, tuning("10", "30")).ok).toBe(true);
    // $10 + $20 a point: a real shirt starts at $210.00, under it.
    const state = saveTuningCore(db, jar, tuning("10", "20"));
    expect(state.ok).toBe(false);
    expect(!state.ok && state.message).toBe(t.breaks);
    expect(!state.ok && state.issues?.map((i) => i.field)).toContain("beige-regret");
    expect(!state.ok && state.issues?.[0].message).toContain("Beige Regret");
    expect(getSettings(db).msrp).toEqual({ basePriceUsd: "10.00", perPointUsd: "30.00" });
  });
});

describe("savePresets (008 FR-016)", () => {
  it("keeps the amounts in the order given, as dollars and cents", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(sqlite, "flash_credit_presets_usd");
    expect(savePresetsCore(db, jar, form({ presetsUsd: "2500, 500.5\n75" })).ok).toBe(true);
    expect(getSettings(db).flashCreditPresetsUsd).toEqual(["2500.00", "500.50", "75.00"]);
    expect(rest(sqlite, "flash_credit_presets_usd")).toEqual(others);
  });

  it.each([["0"], ["-5"], ["abc"], ["500, 500.00"], ["  "]])("refuses %j", (presetsUsd) => {
    const { db, jar } = setup();
    expect(savePresetsCore(db, jar, form({ presetsUsd })).ok).toBe(false);
    expect(getSettings(db).flashCreditPresetsUsd).toEqual(["500.00", "1000.00", "5000.00"]);
  });
});

describe("saveMediaSettings (008 FR-017)", () => {
  it("saves a CDN base URL and a new placeholder, and only those", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(sqlite, "media_base_url", "placeholder_media_id");
    const state = saveMediaSettingsCore(
      db,
      jar,
      form({ mediaBaseUrl: "https://cdn.example.com/media", placeholderMediaId: "2" }),
    );
    expect(state.ok).toBe(true);
    expect(getSettings(db)).toMatchObject({
      mediaBaseUrl: "https://cdn.example.com/media",
      placeholderMediaId: 2,
    });
    expect(rest(sqlite, "media_base_url", "placeholder_media_id")).toEqual(others);
    expect(
      saveMediaSettingsCore(db, jar, form({ mediaBaseUrl: "", placeholderMediaId: "1" })).ok,
    ).toBe(true);
  });

  it.each([
    [{ mediaBaseUrl: "ftp://nope", placeholderMediaId: "1" }],
    [{ mediaBaseUrl: "", placeholderMediaId: "" }],
    [{ mediaBaseUrl: "", placeholderMediaId: "9999" }],
  ])("refuses %j", (fields) => {
    const { db, jar } = setup();
    const before = getSettings(db);
    expect(saveMediaSettingsCore(db, jar, form(fields)).ok).toBe(false);
    expect(getSettings(db)).toEqual(before);
  });
});

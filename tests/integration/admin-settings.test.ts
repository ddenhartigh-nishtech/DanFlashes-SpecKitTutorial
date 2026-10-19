import { describe, expect, it } from "vitest";
import {
  saveMediaSettingsCore,
  savePresetsCore,
  saveTuningCore,
  setSwitchCore,
} from "@/lib/actions/admin/settings";
import { SWITCH_KEYS } from "@/lib/admin/switches";
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
    [{ key: "msrpAnchorScore", on: "0" }],
    [{ key: "__proto__", on: "0" }],
    [{ key: "roachMotel", on: "maybe" }],
  ])("refuses %j and changes nothing", (fields) => {
    const { db, sqlite, jar } = setup();
    const before = row(sqlite);
    expect(setSwitchCore(db, jar, form(fields)).ok).toBe(false);
    expect(row(sqlite)).toEqual(before);
  });
});

describe("saveTuning (008 FR-014, FR-015)", () => {
  const tuning = (start: string, anchor = "10", interval = "10") =>
    form({ startPriceUsd: start, anchorScore: anchor, doublingInterval: interval });

  it("saves only the MSRP dials, and keeps whole dollars as dollars and cents", () => {
    const { db, sqlite, jar } = setup();
    const others = rest(
      sqlite,
      "msrp_start_price_usd",
      "msrp_anchor_score",
      "msrp_doubling_interval",
    );
    expect(saveTuningCore(db, jar, tuning("400", "12", "8")).ok).toBe(true);
    expect(getSettings(db).msrp).toEqual({
      startPriceUsd: "400.00",
      anchorScore: 12,
      doublingInterval: 8,
    });
    expect(
      rest(sqlite, "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval"),
    ).toEqual(others);
  });

  it.each([
    [tuning("0")],
    [tuning("abc")],
    [tuning("300.001")],
    [tuning("300", "-1")],
    [tuning("300", "1.5")],
    [tuning("300", "10", "0")],
  ])("refuses dials that aren't numbers it can use (%#)", (fields) => {
    const { db, jar } = setup();
    const before = getSettings(db).msrp;
    expect(saveTuningCore(db, jar, fields).ok).toBe(false);
    expect(getSettings(db).msrp).toEqual(before);
  });

  it("refuses tuning that would lift a BLAND shirt to the start price, naming it", () => {
    const { db, jar } = setup();
    const state = saveTuningCore(db, jar, tuning("300", "0"));
    expect(state.ok).toBe(false);
    expect(!state.ok && state.issues?.map((i) => i.field)).toContain("beige-regret");
    expect(!state.ok && state.issues?.[0].message).toContain("Beige Regret");
    expect(getSettings(db).msrp.anchorScore).toBe(10);
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

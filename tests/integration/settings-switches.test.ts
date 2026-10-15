import { describe, expect, it } from "vitest";
import { getSettings, saveSettings } from "@/lib/data/settings";
import { createTestDb } from "../helpers/db";

describe("store_settings shaming switches (migration 0001)", () => {
  it("default both switches on for a row written without them", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ blandShaming: true, confirmshaming: true });
  });

  it("round-trip both switches off through saveSettings", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    saveSettings(db, { ...getSettings(db), blandShaming: false, confirmshaming: false });
    expect(getSettings(db)).toMatchObject({ blandShaming: false, confirmshaming: false });
    expect(
      sqlite.prepare("SELECT bland_shaming, confirmshaming FROM store_settings").get(),
    ).toEqual({ bland_shaming: 0, confirmshaming: 0 });
  });
});

describe("store_settings.drain_jokes (003 round 6, migration 0006)", () => {
  it("defaults on, and saves off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ drainJokes: true });
    saveSettings(db, { ...getSettings(db), drainJokes: false });
    expect(getSettings(db)).toMatchObject({ drainJokes: false });
    expect(sqlite.prepare("SELECT drain_jokes FROM store_settings").get()).toEqual({
      drain_jokes: 0,
    });
  });
});

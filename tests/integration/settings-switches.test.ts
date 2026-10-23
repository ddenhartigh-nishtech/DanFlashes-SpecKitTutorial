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

describe("store_settings urgency switches (004, migration 0007)", () => {
  it("default all three on, and round-trip them off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({
      fakeScarcity: true,
      countdownTimers: true,
      socialProof: true,
    });
    saveSettings(db, {
      ...getSettings(db),
      fakeScarcity: false,
      countdownTimers: false,
      socialProof: false,
    });
    expect(getSettings(db)).toMatchObject({
      fakeScarcity: false,
      countdownTimers: false,
      socialProof: false,
    });
    expect(
      sqlite
        .prepare("SELECT fake_scarcity, countdown_timers, social_proof FROM store_settings")
        .get(),
    ).toEqual({ fake_scarcity: 0, countdown_timers: 0, social_proof: 0 });
  });
});

describe("store_settings checkout squeeze switches (005, migration 0008)", () => {
  it("default both on, and round-trip them off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ preCheckedAddOns: true, roachMotel: true });
    saveSettings(db, { ...getSettings(db), preCheckedAddOns: false, roachMotel: false });
    expect(getSettings(db)).toMatchObject({ preCheckedAddOns: false, roachMotel: false });
    expect(
      sqlite.prepare("SELECT pre_checked_add_ons, roach_motel FROM store_settings").get(),
    ).toEqual({ pre_checked_add_ons: 0, roach_motel: 0 });
  });
});

describe("store_settings Flash Mode and Pipes switches (006, migration 0009)", () => {
  it("default both on, and round-trip them off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ flashMode: true, pipesBackground: true });
    saveSettings(db, { ...getSettings(db), flashMode: false, pipesBackground: false });
    expect(getSettings(db)).toMatchObject({ flashMode: false, pipesBackground: false });
    expect(sqlite.prepare("SELECT flash_mode, pipes_background FROM store_settings").get()).toEqual(
      { flash_mode: 0, pipes_background: 0 },
    );
  });
});

describe("store_settings nosy sign-up switch (009, migration 0010)", () => {
  it("defaults on, and round-trips off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ nosySignUp: true });
    saveSettings(db, { ...getSettings(db), nosySignUp: false });
    expect(getSettings(db)).toMatchObject({ nosySignUp: false });
    expect(sqlite.prepare("SELECT nosy_sign_up FROM store_settings").get()).toEqual({
      nosy_sign_up: 0,
    });
  });
});

describe("store_settings pattern generator switch (007, migration 0012)", () => {
  it("defaults on, and round-trips off", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({ patternGenerator: true });
    saveSettings(db, { ...getSettings(db), patternGenerator: false });
    expect(getSettings(db)).toMatchObject({ patternGenerator: false });
    expect(sqlite.prepare("SELECT pattern_generator FROM store_settings").get()).toEqual({
      pattern_generator: 0,
    });
  });
});

describe("store_settings PSSB (012, migration 0016)", () => {
  it("defaults PSSB on with no overrides and no support email, and round-trips them", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({
      pushySalesBot: true,
      pssbModelUrl: null,
      pssbModel: null,
      supportEmail: null,
    });
    saveSettings(db, {
      ...getSettings(db),
      pushySalesBot: false,
      pssbModelUrl: "http://192.168.1.102:11434",
      pssbModel: "qwen2.5:7b",
      supportEmail: "complaints@danflashes.local",
    });
    expect(
      sqlite
        .prepare(
          "SELECT pushy_sales_bot, pssb_model_url, pssb_model, support_email FROM store_settings",
        )
        .get(),
    ).toEqual({
      pushy_sales_bot: 0,
      pssb_model_url: "http://192.168.1.102:11434",
      pssb_model: "qwen2.5:7b",
      support_email: "complaints@danflashes.local",
    });
  });
});

describe("store_settings Uniquity Surcharge (007 owner review, migration 0013)", () => {
  it("defaults on at $499.99, and round-trips off at another amount", () => {
    const { db, sqlite } = createTestDb();
    sqlite.prepare("INSERT INTO store_settings (id) VALUES (1)").run();
    expect(getSettings(db)).toMatchObject({
      uniquitySurcharge: true,
      uniquitySurchargeUsd: "499.99",
    });
    saveSettings(db, {
      ...getSettings(db),
      uniquitySurcharge: false,
      uniquitySurchargeUsd: "0.00",
    });
    expect(
      sqlite.prepare("SELECT uniquity_surcharge, uniquity_surcharge_usd FROM store_settings").get(),
    ).toEqual({ uniquity_surcharge: 0, uniquity_surcharge_usd: "0.00" });
  });
});

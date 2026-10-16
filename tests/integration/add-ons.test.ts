import { describe, expect, it } from "vitest";
import { listOfferedAddOns, resolveAddOns } from "@/lib/data/add-ons";
import { seedCatalog } from "@/lib/data/seed";
import { getSettings } from "@/lib/data/settings";
import { SMALL_FIXTURE } from "../fixtures/catalog";
import { createSeededTestDb, setSwitches } from "../helpers/db";

describe("listOfferedAddOns", () => {
  it("lists the active add-ons, by position then id, with everything checkout shows", () => {
    const { db, sqlite } = createSeededTestDb();
    const offered = listOfferedAddOns(db, getSettings(db));
    expect(offered.map((a) => a.name)).toEqual([
      "Pattern Protection Plan™",
      "Complexity Insurance",
      "Extended Vibrancy Warranty",
      "Priority Compliments Package",
    ]);
    expect(offered[0]).toEqual({
      id: expect.any(Number),
      name: "Pattern Protection Plan™",
      pitch: expect.any(String),
      declineLine: "No thanks, I'd rather my patterns go unprotected.",
      priceUsd: "49.99",
      position: 1,
    });

    sqlite.prepare("UPDATE add_ons SET active = 0 WHERE name = 'Complexity Insurance'").run();
    sqlite
      .prepare("UPDATE add_ons SET position = 0 WHERE name = 'Priority Compliments Package'")
      .run();
    expect(listOfferedAddOns(db, getSettings(db)).map((a) => a.name)).toEqual([
      "Priority Compliments Package",
      "Pattern Protection Plan™",
      "Extended Vibrancy Warranty",
    ]);
  });

  it("is empty while pre-checked add-ons are off", () => {
    const { db } = createSeededTestDb();
    setSwitches(db, { preCheckedAddOns: false });
    expect(listOfferedAddOns(db, getSettings(db))).toEqual([]);
  });
});

describe("resolveAddOns", () => {
  it("returns the offered ones, names the missing or retired ids, and counts a repeat once", () => {
    const { db, sqlite } = createSeededTestDb();
    const [protection, insurance] = listOfferedAddOns(db, getSettings(db));
    sqlite.prepare("UPDATE add_ons SET active = 0 WHERE id = ?").run(insurance.id);
    const { found, missing } = resolveAddOns(db, [protection.id, protection.id, insurance.id, 999]);
    expect(found.map((a) => a.id)).toEqual([protection.id]);
    expect(missing.sort()).toEqual([insurance.id, 999].sort());
    expect(resolveAddOns(db, [])).toEqual({ found: [], missing: [] });
  });
});

describe("seedCatalog and add-ons", () => {
  it("seeds the fixture's add-ons once, and a second run changes nothing", () => {
    const { db, sqlite } = createSeededTestDb();
    const count = () =>
      (sqlite.prepare("SELECT count(*) AS n FROM add_ons").get() as { n: number }).n;
    expect(count()).toBe(SMALL_FIXTURE.addOns.length);
    sqlite.prepare("UPDATE add_ons SET price_usd = '59.99' WHERE position = 1").run();
    const again = seedCatalog(db, SMALL_FIXTURE);
    expect(again.addOns).toBe(0);
    expect(count()).toBe(SMALL_FIXTURE.addOns.length);
    expect(sqlite.prepare("SELECT price_usd FROM add_ons WHERE position = 1").get()).toEqual({
      price_usd: "59.99", // never overwritten: the owner's edit stands
    });
  });
});

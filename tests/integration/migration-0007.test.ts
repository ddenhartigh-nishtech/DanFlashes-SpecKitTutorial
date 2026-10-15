import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0007 (the urgency switches)", () => {
  it("turns all three on for the existing settings row, without touching the rest", () => {
    const { sqlite, db } = databaseBefore("0007");
    sqlite.exec("INSERT INTO store_settings (id, drain_jokes, confirmshaming) VALUES (1, 0, 0);");
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;

    runMigrations(db);

    // Later migrations may add more columns; this one adds the three switches.
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      ...before,
      fake_scarcity: 1,
      countdown_timers: 1,
      social_proof: 1,
    });
  });
});

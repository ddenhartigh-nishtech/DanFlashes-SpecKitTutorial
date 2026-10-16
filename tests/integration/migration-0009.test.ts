import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0009 (the Flash Mode and Pipes switches)", () => {
  it("turns both switches on for the existing settings row, leaving the rest alone", () => {
    const { sqlite, db } = databaseBefore("0009");
    sqlite.exec("INSERT INTO store_settings (id, confirmshaming, roach_motel) VALUES (1, 0, 0)");
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      ...before,
      flash_mode: 1,
      pipes_background: 1,
    });
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });
});

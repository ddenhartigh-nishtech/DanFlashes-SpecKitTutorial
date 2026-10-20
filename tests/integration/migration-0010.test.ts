import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore, withoutOldDials } from "../helpers/migrations";

describe("migration 0010 (the nosy sign-up switch)", () => {
  it("turns the switch on for the existing settings row, leaving the rest alone", () => {
    const { sqlite, db } = databaseBefore("0010");
    sqlite.exec("INSERT INTO store_settings (id, confirmshaming, flash_mode) VALUES (1, 0, 0)");
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      ...withoutOldDials(before),
      nosy_sign_up: 1,
    });
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

describe("migration 0006 (the drain jokes setting)", () => {
  it("turns the jokes on for the existing settings row, without touching the rest", () => {
    const { sqlite, db } = databaseBefore("0006");
    sqlite.exec(
      "INSERT INTO store_settings (id, per_diem_drain, confirmshaming) VALUES (1, 0, 0);",
    );
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;

    runMigrations(db);

    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toEqual({
      ...before,
      drain_jokes: 1,
    });
  });
});

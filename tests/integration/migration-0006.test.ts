import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore, withoutOldDials } from "../helpers/migrations";

describe("migration 0006 (the drain jokes setting)", () => {
  it("turns the jokes on for the existing settings row, without touching the rest", () => {
    const { sqlite, db } = databaseBefore("0006");
    sqlite.exec(
      "INSERT INTO store_settings (id, per_diem_drain, confirmshaming) VALUES (1, 0, 0);",
    );
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;

    runMigrations(db);

    // Later migrations add more columns; this one only adds drain_jokes.
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toMatchObject({
      ...withoutOldDials(before),
      drain_jokes: 1,
    });
  });
});

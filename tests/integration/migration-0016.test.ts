import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

function oldDatabase() {
  const { sqlite, db } = databaseBefore("0016");
  sqlite.exec(
    "INSERT INTO store_settings (id, pattern_generator, uniquity_surcharge_usd) VALUES (1, 0, '12.34');",
  );
  return { sqlite, db };
}

describe("migration 0016 (PSSB)", () => {
  it("adds PSSB's switch (on) and three empty settings, leaving the rest alone", () => {
    const { sqlite, db } = oldDatabase();
    const before = sqlite.prepare("SELECT * FROM store_settings").get() as object;
    runMigrations(db);
    expect(sqlite.prepare("SELECT * FROM store_settings").get()).toEqual({
      ...before,
      pushy_sales_bot: 1,
      pssb_model_url: null,
      pssb_model: null,
      support_email: null,
    });
  });

  it.each([
    ["a model address that isn't http(s)", "UPDATE store_settings SET pssb_model_url = 'ftp://x'"],
    [
      "a model address over 200 characters",
      `UPDATE store_settings SET pssb_model_url = 'http://${"x".repeat(200)}'`,
    ],
    ["an empty model name", "UPDATE store_settings SET pssb_model = ''"],
    [
      "a model name over 80 characters",
      `UPDATE store_settings SET pssb_model = '${"m".repeat(81)}'`,
    ],
    ["an email without an @", "UPDATE store_settings SET support_email = 'dan.example.com'"],
    ["an email with two @", "UPDATE store_settings SET support_email = 'd@n@example.com'"],
  ])("refuses %s", (_name, statement) => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    expect(() => sqlite.prepare(statement).run()).toThrow(/CHECK constraint failed/);
  });

  it("accepts good values and NULLs", () => {
    const { sqlite, db } = oldDatabase();
    runMigrations(db);
    sqlite
      .prepare(
        "UPDATE store_settings SET pssb_model_url = 'http://192.168.1.102:11434', pssb_model = 'qwen2.5:7b', support_email = 'complaints@danflashes.local'",
      )
      .run();
    sqlite
      .prepare(
        "UPDATE store_settings SET pssb_model_url = NULL, pssb_model = NULL, support_email = NULL",
      )
      .run();
  });
});

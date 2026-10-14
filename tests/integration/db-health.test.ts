import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  assertCurrent,
  diagnose,
  journalStamp,
  pendingMigrations,
  startupProblems,
} from "@/lib/db/health";
import { createSeededTestDb, createTestDb } from "../helpers/db";

const TAGS = (
  JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8")) as {
    entries: { tag: string }[];
  }
).entries.map((e) => e.tag);

/** Pretend the newest migration was never applied, as on a database from before a pull. */
function forgetNewestMigration(sqlite: Database.Database) {
  sqlite
    .prepare(
      "DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)",
    )
    .run();
}

describe("pendingMigrations", () => {
  it("is empty for a fully migrated database", () => {
    expect(pendingMigrations(createTestDb().sqlite)).toEqual([]);
  });

  it("names the migrations a database hasn't applied", () => {
    const { sqlite } = createTestDb();
    forgetNewestMigration(sqlite);
    expect(pendingMigrations(sqlite)).toEqual([TAGS.at(-1)]);
  });

  it("lists every migration for a database that was never migrated", () => {
    expect(pendingMigrations(new Database(":memory:"))).toEqual(TAGS);
  });
});

describe("assertCurrent", () => {
  it("passes for a current database", () => {
    expect(() => assertCurrent(createTestDb().sqlite, "data/x.db")).not.toThrow();
  });

  it("throws the file, the missing migrations, and the fix", () => {
    const { sqlite } = createTestDb();
    forgetNewestMigration(sqlite);
    expect(() => assertCurrent(sqlite, "data/x.db")).toThrow(
      new RegExp(`data/x\\.db.*${TAGS.at(-1)}.*npm run db:migrate`),
    );
  });
});

describe("startupProblems", () => {
  it("reports nothing for a migrated, seeded database", () => {
    expect(startupProblems(createSeededTestDb().file)).toEqual([]);
  });

  it("reports a missing database file with the command that creates it", () => {
    const missing = path.join(os.tmpdir(), "danflashes-nope", "missing.db");
    const problems = startupProblems(missing);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/missing\.db.*npm run db:reset/);
    expect(fs.existsSync(missing)).toBe(false); // looking doesn't create it
  });

  it("reports pending migrations and missing store settings", () => {
    const { sqlite, file } = createTestDb();
    forgetNewestMigration(sqlite);
    const problems = startupProblems(file).join("\n");
    expect(problems).toMatch(/npm run db:migrate/);
    expect(problems).toMatch(/Store settings are missing.*npm run db:reset/);
  });
});

describe("diagnose", () => {
  it.each([
    ["no such column: bland_shaming", /npm run db:migrate/],
    ["no such table: store_settings", /npm run db:migrate/],
    ["database is locked", /Drizzle Studio/],
    ["unable to open database file", /DATABASE_PATH.*npm run db:reset/],
  ])("explains %j", (message, fix) => {
    expect(diagnose(new Error(message))).toMatch(fix);
  });

  it("returns null when it has nothing useful to add", () => {
    expect(diagnose(new Error("Something else"))).toBeNull();
    expect(diagnose("not even an error")).toBeNull();
  });
});

describe("journalStamp", () => {
  it("is the migration journal's modification time, so a pulled migration changes it", () => {
    expect(journalStamp()).toBe(fs.statSync("drizzle/meta/_journal.json").mtimeMs);
  });
});

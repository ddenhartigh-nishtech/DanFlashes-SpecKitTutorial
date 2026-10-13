import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { openDatabase, type Db, type Sqlite } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export interface TestDb {
  db: Db;
  sqlite: Sqlite;
  file: string;
  dir: string;
}

/** A fresh, migrated temp-file database, removed when the test file finishes. */
export function createTestDb(): TestDb {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-test-"));
  const file = path.join(dir, "test.db");
  const { db, sqlite } = openDatabase(file);
  runMigrations(db);
  afterAll(() => {
    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { db, sqlite, file, dir };
}

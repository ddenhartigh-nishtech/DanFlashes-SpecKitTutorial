import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import type { StoreSettings } from "@/lib/catalog/types";
import { getSettings, saveSettings } from "@/lib/data/settings";
import { openDatabase, type Db, type Sqlite } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { seedCatalog } from "@/lib/data/seed";
import { SMALL_FIXTURE } from "../fixtures/catalog";

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

/** A fresh database seeded with the small test catalog. */
export function createSeededTestDb(): TestDb {
  const test = createTestDb();
  seedCatalog(test.db, SMALL_FIXTURE);
  return test;
}

/** Flip the manipulation-tactic switches on a test database. */
export function setSwitches(
  db: Db,
  patch: Partial<
    Pick<
      StoreSettings,
      | "blandShaming"
      | "confirmshaming"
      | "perDiemDrain"
      | "drainJokes"
      | "fakeScarcity"
      | "countdownTimers"
      | "socialProof"
      | "preCheckedAddOns"
      | "roachMotel"
      | "flashMode"
      | "pipesBackground"
      | "nosySignUp"
    >
  >,
): void {
  saveSettings(db, { ...getSettings(db), ...patch });
}

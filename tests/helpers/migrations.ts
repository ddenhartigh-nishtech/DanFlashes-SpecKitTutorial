import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { openDatabase, type Db, type Sqlite } from "@/lib/db/client";
import { MIGRATIONS_FOLDER, runMigrations } from "@/lib/db/migrate";

const dirs: string[] = [];
const handles: Sqlite[] = [];
afterAll(() => {
  handles.forEach((h) => h.close());
  dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
});

/** A copy of drizzle/ whose journal stops before `nextTag`, to build a database as it used to be. */
function migrationsBefore(nextTag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-mig-"));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  journal.entries = journal.entries.filter((e) => e.tag < nextTag);
  fs.writeFileSync(path.join(dir, "meta", "_journal.json"), JSON.stringify(journal));
  for (const e of journal.entries) {
    fs.copyFileSync(path.join(MIGRATIONS_FOLDER, `${e.tag}.sql`), path.join(dir, `${e.tag}.sql`));
  }
  return dir;
}

/** A fresh database migrated up to, but not including, the migration whose tag starts `nextTag`. */
export function databaseBefore(nextTag: string): { sqlite: Sqlite; db: Db } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-db-"));
  dirs.push(dir);
  const opened = openDatabase(path.join(dir, "old.db"));
  handles.push(opened.sqlite);
  runMigrations(opened.db, migrationsBefore(nextTag));
  return opened;
}

/**
 * A settings row read before 0014, minus the exponential's three dials, which 0014 replaced with
 * the straight line's two (010 R3). Older migration tests run every migration after their own.
 */
export function withoutOldDials(row: object): object {
  const old = ["msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval"];
  return Object.fromEntries(Object.entries(row).filter(([key]) => !old.includes(key)));
}

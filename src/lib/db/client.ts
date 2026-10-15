import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { assertCurrent, journalStamp } from "./health";
import * as schema from "./schema";

export type Sqlite = Database.Database;
/** Drizzle over better-sqlite3, with the raw handle (`$client`) that pragmas and migrations need. */
export type Db = BetterSQLite3Database<typeof schema> & { $client: Sqlite };

export const DEFAULT_DATABASE_PATH = "data/danflashes.db";

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH;
}

export function openDatabase(file: string = databasePath()): { sqlite: Sqlite; db: Db } {
  // The DB path is runtime config (DATABASE_PATH), so keep the bundler from tracing it.
  fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ file)), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

// One connection per server process, kept on globalThis so dev hot-reloads don't leak handles.
const globalForDb = globalThis as unknown as {
  __danflashesDb?: { sqlite: Sqlite; db: Db; checkedJournal?: number };
};

/**
 * The app's shared connection. Scripts and tests open their own with {@link openDatabase}.
 * Throws, with the fix, while the database is behind the code; re-checked whenever the migration
 * journal changes (a pull), so a running dev server notices and recovers after `db:migrate`.
 */
export function getDb(): Db {
  globalForDb.__danflashesDb ??= openDatabase();
  const conn = globalForDb.__danflashesDb;
  const stamp = journalStamp();
  if (conn.checkedJournal !== stamp) {
    assertCurrent(conn.sqlite, databasePath());
    conn.checkedJournal = stamp;
  }
  return conn.db;
}

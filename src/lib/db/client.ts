import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;
export type Sqlite = Database.Database;

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
const globalForDb = globalThis as unknown as { __danflashesDb?: { sqlite: Sqlite; db: Db } };

/** The app's shared connection. Scripts and tests open their own with {@link openDatabase}. */
export function getDb(): Db {
  globalForDb.__danflashesDb ??= openDatabase();
  return globalForDb.__danflashesDb.db;
}

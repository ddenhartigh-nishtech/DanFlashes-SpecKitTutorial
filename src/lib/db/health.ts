/**
 * Developer diagnostics: what's wrong with the local database, said with the command that fixes it.
 * The app refuses to run on a database that's behind the code (`getDb`), the terminal hears about
 * problems at server start and with every server error (src/instrumentation.ts), and shoppers
 * still only ever see the 500 page.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Sqlite } from "./client";

// Runtime location, not a bundled asset: keep the bundler from tracing the project.
export const MIGRATIONS_FOLDER = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");

const journalFile = (folder: string) => path.join(folder, "meta", "_journal.json");

interface Journal {
  entries: { tag: string; when: number }[];
}

/** The journal's modification time: it changes whenever a pull brings a new migration. */
export function journalStamp(folder: string = MIGRATIONS_FOLDER): number {
  return fs.statSync(journalFile(folder)).mtimeMs;
}

/** Tags of the migrations in drizzle/ that this database hasn't applied (drizzle's own rule). */
export function pendingMigrations(sqlite: Sqlite, folder: string = MIGRATIONS_FOLDER): string[] {
  const journal = JSON.parse(fs.readFileSync(journalFile(folder), "utf8")) as Journal;
  let appliedThrough = -Infinity;
  try {
    const row = sqlite.prepare("SELECT max(created_at) AS at FROM __drizzle_migrations").get() as {
      at: number | null;
    };
    appliedThrough = row.at === null ? -Infinity : Number(row.at);
  } catch {
    // No bookkeeping table: nothing has ever been applied.
  }
  return journal.entries.filter((e) => e.when > appliedThrough).map((e) => e.tag);
}

function behindMessage(file: string, pending: string[]): string {
  const count = pending.length === 1 ? "1 migration" : `${pending.length} migrations`;
  return (
    `The database at ${file} is ${count} behind the code (${pending.join(", ")}). ` +
    "Run `npm run db:migrate` (it backs up first)."
  );
}

/** Throws, with the fix, when the database is behind the code. */
export function assertCurrent(sqlite: Sqlite, file: string, folder?: string): void {
  const pending = pendingMigrations(sqlite, folder);
  if (pending.length) throw new Error(behindMessage(file, pending));
}

/** Everything wrong with the database file, read-only, so looking never creates or changes it. */
export function startupProblems(file: string, folder?: string): string[] {
  if (!fs.existsSync(file)) {
    return [`No database at ${file}. Run \`npm run db:reset\` to create and seed it.`];
  }
  const sqlite = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const problems: string[] = [];
    const pending = pendingMigrations(sqlite, folder);
    if (pending.length) problems.push(behindMessage(file, pending));
    let hasSettings = false;
    try {
      hasSettings = Boolean(sqlite.prepare("SELECT 1 FROM store_settings WHERE id = 1").get());
    } catch {
      // No table yet; the pending migrations above already say what to do.
    }
    if (!hasSettings) problems.push("Store settings are missing. Run `npm run db:reset`.");
    return problems;
  } finally {
    sqlite.close();
  }
}

const FIXES: [RegExp, string][] = [
  [
    /no such (column|table)/i,
    "The database doesn't match the code. Run `npm run db:migrate`; if it has nothing to apply, " +
      "`npm run db:reset` rebuilds the database (after a backup).",
  ],
  [
    /database is locked|SQLITE_BUSY/i,
    "Something else is holding the database (Drizzle Studio, a script, or another server). " +
      "Close it and try again.",
  ],
  [
    /unable to open database|SQLITE_CANTOPEN/i,
    "Can't open the database file. Check DATABASE_PATH, or run `npm run db:reset` to create it.",
  ],
];

/** A plain-English fix for a known database error, or null when there's nothing to add. */
export function diagnose(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const text = `${error.message} ${(error as { code?: string }).code ?? ""}`;
  return FIXES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

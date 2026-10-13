/**
 * Backups copy data; migrations change structure (research R17). Backups use SQLite's online
 * backup API, so they are consistent even while the app is running.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export const DEFAULT_BACKUP_DIR = process.env.BACKUP_DIR ?? "backups";

function stamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function uniquePath(dir: string, base: string): string {
  let candidate = path.join(dir, `${base}.db`);
  for (let n = 1; fs.existsSync(candidate); n++) candidate = path.join(dir, `${base}-${n}.db`);
  return candidate;
}

/**
 * Back up the database file at `dbFile` to `dir/danflashes-YYYYMMDD-HHMMSS.db`.
 * Returns the backup path, or null when there is no database yet (nothing to protect).
 */
export async function backupDatabaseFile(
  dbFile: string,
  dir: string = DEFAULT_BACKUP_DIR,
  now: Date = new Date(),
): Promise<string | null> {
  if (!fs.existsSync(dbFile)) return null;
  fs.mkdirSync(dir, { recursive: true });
  const target = uniquePath(dir, `danflashes-${stamp(now)}`);
  const source = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    await source.backup(target);
  } finally {
    source.close();
  }
  return target;
}

/** Delete a database file and its WAL/SHM sidecars. */
export function deleteDatabaseFiles(dbFile: string): void {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(`${dbFile}${suffix}`, { force: true });
}

/**
 * Replace the database at `dbFile` with the backup at `backupFile`, after taking a safety
 * backup of the current state. Returns the safety backup path (null if there was no database).
 * The app must not be running against `dbFile` while restoring.
 */
export async function restoreDatabaseFile(
  backupFile: string,
  dbFile: string,
  dir: string = DEFAULT_BACKUP_DIR,
): Promise<string | null> {
  if (!fs.existsSync(backupFile)) throw new Error(`Backup not found: ${backupFile}`);
  const probe = new Database(backupFile, { readonly: true, fileMustExist: true });
  try {
    probe.prepare("SELECT count(*) FROM sqlite_master").get();
  } finally {
    probe.close();
  }
  const safety = await backupDatabaseFile(dbFile, dir);
  deleteDatabaseFiles(dbFile);
  fs.mkdirSync(path.dirname(path.resolve(dbFile)), { recursive: true });
  fs.copyFileSync(backupFile, dbFile);
  return safety;
}

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { backupDatabaseFile, deleteDatabaseFiles, restoreDatabaseFile } from "@/lib/db/backup";
import { openDatabase } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { createTestDb } from "../helpers/db";

const countMedia = (file: string) => {
  const db = new Database(file, { readonly: true });
  try {
    return (db.prepare("SELECT count(*) AS n FROM media").get() as { n: number }).n;
  } finally {
    db.close();
  }
};

describe("database backups", () => {
  const { sqlite, file, dir } = createTestDb();
  const backups = path.join(dir, "backups");

  it("returns null when there is no database to back up", async () => {
    expect(await backupDatabaseFile(path.join(dir, "missing.db"), backups)).toBeNull();
  });

  it("writes a timestamped copy with identical rows", async () => {
    sqlite
      .prepare("INSERT INTO media (key, alt, kind) VALUES (?, ?, ?)")
      .run("a.svg", "A", "shirt");
    const when = new Date(2026, 9, 13, 14, 5, 22);
    const copy = await backupDatabaseFile(file, backups, when);
    expect(path.basename(copy!)).toBe("danflashes-20261013-140522.db");
    expect(countMedia(copy!)).toBe(1);
  });

  it("never overwrites an existing backup from the same second", async () => {
    const when = new Date(2026, 9, 13, 14, 5, 22);
    const second = await backupDatabaseFile(file, backups, when);
    expect(path.basename(second!)).toBe("danflashes-20261013-140522-1.db");
  });

  it("restores a backup, keeping a safety backup of the replaced state", async () => {
    const restoreDir = path.join(dir, "restore");
    const target = path.join(restoreDir, "live.db");
    const { sqlite: live, db } = openDatabase(target);
    runMigrations(db);
    live.prepare("INSERT INTO media (key, alt, kind) VALUES (?, ?, ?)").run("x.svg", "X", "shirt");
    live.prepare("INSERT INTO media (key, alt, kind) VALUES (?, ?, ?)").run("y.svg", "Y", "shirt");
    live.close();

    const source = path.join(backups, "danflashes-20261013-140522.db");
    const safety = await restoreDatabaseFile(source, target, path.join(restoreDir, "backups"));

    expect(countMedia(target)).toBe(1);
    expect(safety && countMedia(safety)).toBe(2);
  });

  it("refuses to restore from a file that doesn't exist", async () => {
    await expect(restoreDatabaseFile(path.join(dir, "nope.db"), file, backups)).rejects.toThrow();
  });

  it("deletes a database and its WAL/SHM sidecars", () => {
    const victim = path.join(dir, "victim.db");
    for (const suffix of ["", "-wal", "-shm"]) fs.writeFileSync(`${victim}${suffix}`, "x");
    deleteDatabaseFiles(victim);
    expect(["", "-wal", "-shm"].some((s) => fs.existsSync(`${victim}${s}`))).toBe(false);
  });

  it("db:migrate backs up the existing database before applying migrations", async () => {
    const scriptDir = path.join(dir, "migrate-script");
    const dbFile = path.join(scriptDir, "app.db");
    const backupDir = path.join(scriptDir, "backups");
    // A plain file copy of a live WAL database would miss un-checkpointed rows; use the backup API.
    const seeded = await backupDatabaseFile(file, scriptDir);
    fs.renameSync(seeded!, dbFile);

    execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/migrate.ts"], {
      env: { ...process.env, DATABASE_PATH: dbFile, BACKUP_DIR: backupDir },
      stdio: "pipe",
    });

    const made = fs.readdirSync(backupDir).filter((f) => f.startsWith("danflashes-"));
    expect(made).toHaveLength(1);
    expect(countMedia(path.join(backupDir, made[0]))).toBe(1);
  });
});

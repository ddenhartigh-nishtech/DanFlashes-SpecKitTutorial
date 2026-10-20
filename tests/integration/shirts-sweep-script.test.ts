import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { materialize } from "@/lib/pattern/materialize";
import { createSeededTestDb } from "../helpers/db";

/** Each test gets its own pictures and backups folders. */
let dir = "";
let backups = "";
const made: string[] = [];
function freshFolders() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-sweep-uploads-"));
  backups = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-sweep-backups-"));
  made.push(dir, backups);
  process.env.MEDIA_UPLOADS_DIR = dir;
}
beforeEach(freshFolders);
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

function runSweep(dbFile: string, ...args: string[]): string {
  return execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/shirts-sweep.ts", ...args],
    {
      env: { ...process.env, DATABASE_PATH: dbFile, MEDIA_UPLOADS_DIR: dir, BACKUP_DIR: backups },
      stdio: "pipe",
      encoding: "utf8",
    },
  );
}

/** A store with one abandoned creation (made 40 days ago) and one stray file. */
function store() {
  const test = createSeededTestDb();
  const made = materialize(test.db, { score: 60, style: "polo", seed: 60 }, { origin: "dial" });
  if (!made.ok) throw new Error("not made");
  const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
  test.sqlite
    .prepare("UPDATE shirts SET created_at = ?, updated_at = ? WHERE id = ?")
    .run(old, old, made.shirtId);
  fs.writeFileSync(path.join(dir, "22222222-2222-4222-8222-222222222222.svg"), "<svg/>");
  return { ...test, shirtId: made.shirtId };
}

const shirtCount = (sqlite: ReturnType<typeof store>["sqlite"]) =>
  (sqlite.prepare("SELECT count(*) AS n FROM shirts").get() as { n: number }).n;

// Each test spawns the real script through tsx (~1–5s cold start), so give it room.
describe("npm run shirts:sweep (011 FR-006, R6)", { timeout: 30_000 }, () => {
  it("run plainly, says where it's looking, lists what it would delete, and changes nothing", () => {
    const { sqlite, file } = store();
    const before = shirtCount(sqlite);
    const output = runSweep(file);
    expect(output).toContain(file);
    expect(output).toContain(dir);
    expect(output).toMatch(/1 abandoned creation/);
    expect(output).toMatch(/40 days/);
    expect(output).toContain("22222222-2222-4222-8222-222222222222.svg");
    expect(output).toContain("Run with --yes to delete them.");
    expect(shirtCount(sqlite)).toBe(before);
    expect(fs.readdirSync(backups)).toEqual([]);
  });

  it("with --yes, backs up first, then sweeps and says what it removed", () => {
    const { sqlite, file, shirtId } = store();
    const output = runSweep(file, "--yes");
    expect(output).toMatch(/Backed up to /);
    expect(output).toMatch(/Swept 1 shirt, 1 picture and 1 stray file\./);
    expect(fs.readdirSync(backups).length).toBe(1);
    expect(sqlite.prepare("SELECT 1 FROM shirts WHERE id = ?").get(shirtId)).toBeUndefined();
  });

  it("with nothing to sweep, says so and makes no backup", () => {
    const { file } = createSeededTestDb();
    expect(runSweep(file, "--yes")).toContain("Nothing to sweep.");
    expect(fs.readdirSync(backups)).toEqual([]);
  });
});

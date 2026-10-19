import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { auditCatalog, auditIssues } from "@/lib/catalog/audit";
import { seedCatalog } from "@/lib/data/seed";
import { SEED } from "../../scripts/seed-data";
import { createTestDb } from "../helpers/db";

function runAuditScript(dbFile: string): { code: number; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/catalog-audit.ts"],
      { env: { ...process.env, DATABASE_PATH: dbFile }, stdio: "pipe", encoding: "utf8" },
    );
    return { code: 0, output };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { code: e.status, output: `${e.stdout}${e.stderr}` };
  }
}

describe("auditCatalog", () => {
  it("passes the demo seed catalog with no errors and no warnings", () => {
    const { db } = createTestDb();
    seedCatalog(db, SEED);
    expect(auditCatalog(db)).toEqual({ errors: [], warnings: [] });
  });

  it("errors on a BLAND shirt priced at or above the start price, naming it", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite
      .prepare("UPDATE shirts SET final_price_usd = '300.00' WHERE slug = 'beige-regret'")
      .run();
    const { errors } = auditCatalog(db);
    expect(errors.join("\n")).toMatch(/beige-regret.*BLAND/);
  });

  it("errors on an active shirt with no images", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite
      .prepare(
        "DELETE FROM shirt_images WHERE shirt_id = (SELECT id FROM shirts WHERE slug = 'geo-riot')",
      )
      .run();
    expect(auditCatalog(db).errors.join("\n")).toMatch(/geo-riot.*image/);
  });

  it("reports broken tiers instead of crashing", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite.prepare("UPDATE complexity_tiers SET min_score = 1 WHERE min_score = 0").run();
    expect(auditCatalog(db).errors.join("\n")).toMatch(/min score 0/);
  });

  it("warns when no placeholder image is configured", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite.prepare("UPDATE store_settings SET placeholder_media_id = NULL").run();
    expect(auditCatalog(db).warnings.join("\n")).toMatch(/placeholder/i);
  });

  it("warns (not errors) when the catalog misses the seed checks", () => {
    const { db } = createTestDb();
    seedCatalog(db, { ...SEED, shirts: SEED.shirts.slice(2, 4) });
    const { errors, warnings } = auditCatalog(db);
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("errors when store settings are missing entirely", () => {
    const { db } = createTestDb();
    expect(auditCatalog(db).errors.join("\n")).toMatch(/settings/i);
  });
});

describe("auditIssues (008 analysis U3: each problem says what it's about)", () => {
  it("is empty for the demo catalog", () => {
    const { db } = createTestDb();
    seedCatalog(db, SEED);
    expect(auditIssues(db)).toEqual([]);
  });

  it("names the shirt, the setting or the tier each problem belongs to", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite
      .prepare("UPDATE shirts SET final_price_usd = '300.00' WHERE slug = 'beige-regret'")
      .run();
    sqlite.prepare("UPDATE store_settings SET placeholder_media_id = NULL").run();
    const issues = auditIssues(db);
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "error", kind: "shirt", ref: "beige-regret" }),
    );
    expect(issues).toContainEqual(expect.objectContaining({ level: "warning", kind: "settings" }));
    // The CLI's strings are the same problems, word for word.
    const { errors, warnings } = auditCatalog(db);
    expect(issues.map((i) => i.text).sort()).toEqual([...errors, ...warnings].sort());
  });

  it("files broken tiers under tiers", () => {
    const { db, sqlite } = createTestDb();
    seedCatalog(db, SEED);
    sqlite.prepare("UPDATE complexity_tiers SET min_score = 1 WHERE min_score = 0").run();
    expect(auditIssues(db)).toContainEqual(
      expect.objectContaining({ level: "error", kind: "tier" }),
    );
  });
});

// Each test spawns the real script through tsx (~1–5s cold start), so give it room.
describe("npm run catalog:audit", { timeout: 30_000 }, () => {
  it("exits 0 on a clean catalog", () => {
    const { db, file } = createTestDb();
    seedCatalog(db, SEED);
    const result = runAuditScript(file);
    expect(result.code).toBe(0);
    expect(result.output).toMatch(/0 errors/);
  });

  it("exits 1 when there are errors", () => {
    const { db, sqlite, file } = createTestDb();
    seedCatalog(db, SEED);
    sqlite
      .prepare("UPDATE shirts SET final_price_usd = '450.00' WHERE slug = 'khaki-commitment'")
      .run();
    const result = runAuditScript(file);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/khaki-commitment/);
  });
});

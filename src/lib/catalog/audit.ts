/**
 * Catalog audit (`npm run catalog:audit`, and the console's pricing page): re-checks every catalog
 * rule against the live database. Errors break a rule (e.g. a BLAND shirt at or above the start
 * price); warnings are advisory (seed-catalog checks, a missing placeholder). Each issue also says
 * what it's about, so the console can link to the fix (008 analysis U3).
 */
import { validateTiers } from "@/lib/catalog/tiers";
import { seedChecks, validateSettings, validateShirt } from "@/lib/catalog/validate";
import { listMedia } from "@/lib/data/media";
import { getSettings } from "@/lib/data/settings";
import { countImagesByShirt, listShirtRows } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { isValidMediaKey } from "@/lib/media";

export interface AuditReport {
  errors: string[];
  warnings: string[];
}

export interface AuditIssue {
  level: "error" | "warning";
  /** What it's about: a shirt (ref = slug), a media item (ref = id), the tiers, the settings. */
  kind: "shirt" | "media" | "tier" | "settings" | "catalog";
  ref: string | null;
  /** The CLI's line, word for word. */
  text: string;
}

export function auditIssues(db: Db): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const add = (
    level: AuditIssue["level"],
    kind: AuditIssue["kind"],
    ref: string | null,
    text: string,
  ) => issues.push({ level, kind, ref, text });

  let settings;
  try {
    settings = getSettings(db);
  } catch (error) {
    add("error", "settings", null, (error as Error).message);
    return issues;
  }
  for (const issue of validateSettings(settings)) {
    add("error", "settings", null, `settings ${issue.field}: ${issue.message}`);
  }
  if (settings.placeholderMediaId === null) {
    add(
      "warning",
      "settings",
      null,
      "No placeholder image is configured (store_settings.placeholder_media_id).",
    );
  }

  for (const row of listMedia(db)) {
    if (!isValidMediaKey(row.key)) {
      add(
        "error",
        "media",
        String(row.id),
        `media #${row.id}: invalid key ${JSON.stringify(row.key)}`,
      );
    }
  }

  const tiers = listTiers(db);
  const tierProblems = validateTiers(tiers);
  if (tierProblems.length) {
    for (const p of tierProblems) add("error", "tier", null, `tiers: ${p}`);
    return issues; // shirt checks need valid tiers
  }

  const imageCounts = countImagesByShirt(db);
  const rows = listShirtRows(db);
  for (const row of rows) {
    const shirtIssues = validateShirt(
      {
        slug: row.slug,
        name: row.name,
        style: row.style,
        complexity: row.complexity,
        finalPriceUsd: row.finalPriceUsd,
        description: row.description,
        status: row.status,
        featured: row.featured,
      },
      { tiers, msrp: settings.msrp, imageCount: imageCounts.get(row.id) ?? 0 },
    );
    for (const issue of shirtIssues) {
      add("error", "shirt", row.slug, `${row.slug} ${issue.field}: ${issue.message}`);
    }
  }

  for (const warning of seedChecks(rows, tiers)) add("warning", "catalog", null, warning);
  return issues;
}

export function auditCatalog(db: Db): AuditReport {
  const issues = auditIssues(db);
  return {
    errors: issues.filter((i) => i.level === "error").map((i) => i.text),
    warnings: issues.filter((i) => i.level === "warning").map((i) => i.text),
  };
}

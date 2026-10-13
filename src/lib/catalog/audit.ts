/**
 * Catalog audit (`npm run catalog:audit`): re-checks every catalog rule against the live
 * database. Errors break a rule (e.g. a BLAND shirt at or above the start price); warnings are
 * advisory (seed-catalog checks, a missing placeholder).
 */
import { count } from "drizzle-orm";
import { validateTiers } from "@/lib/catalog/tiers";
import { seedChecks, validateSettings, validateShirt } from "@/lib/catalog/validate";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { media, shirtImages, shirts } from "@/lib/db/schema";
import { isValidMediaKey } from "@/lib/media";

export interface AuditReport {
  errors: string[];
  warnings: string[];
}

export function auditCatalog(db: Db): AuditReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  let settings;
  try {
    settings = getSettings(db);
  } catch (error) {
    return { errors: [(error as Error).message], warnings };
  }
  for (const issue of validateSettings(settings)) {
    errors.push(`settings ${issue.field}: ${issue.message}`);
  }
  if (settings.placeholderMediaId === null) {
    warnings.push("No placeholder image is configured (store_settings.placeholder_media_id).");
  }

  for (const row of db.select().from(media).all()) {
    if (!isValidMediaKey(row.key))
      errors.push(`media #${row.id}: invalid key ${JSON.stringify(row.key)}`);
  }

  const tiers = listTiers(db);
  const tierProblems = validateTiers(tiers);
  if (tierProblems.length) {
    errors.push(...tierProblems.map((p) => `tiers: ${p}`));
    return { errors, warnings }; // shirt checks need valid tiers
  }

  const imageCounts = new Map(
    db
      .select({ shirtId: shirtImages.shirtId, n: count() })
      .from(shirtImages)
      .groupBy(shirtImages.shirtId)
      .all()
      .map((r) => [r.shirtId, r.n]),
  );

  const rows = db.select().from(shirts).all();
  for (const row of rows) {
    const issues = validateShirt(
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
    for (const issue of issues) errors.push(`${row.slug} ${issue.field}: ${issue.message}`);
  }

  warnings.push(...seedChecks(rows, tiers));
  return { errors, warnings };
}

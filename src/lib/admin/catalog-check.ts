/**
 * One catalog check behind every pricing save (008 R10): the whole catalog, every shirt in any
 * status, under a proposed tier set or MSRP tuning. The console refuses any save this names, so
 * the catalog audit stays at zero errors (SC-004). It shares `validateShirt` with the audit, so the
 * two can't disagree.
 */
import { validateTiers } from "@/lib/catalog/tiers";
import type { MsrpSettings, Tier } from "@/lib/catalog/types";
import { validateShirt, type Issue } from "@/lib/catalog/validate";
import { getSettings } from "@/lib/data/settings";
import { countImagesByShirt, listShirtRows } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";

export interface CatalogProposal {
  tiers?: Tier[];
  msrp?: MsrpSettings;
}

/** Each shirt the proposal would break (field = its slug), or the tier problems. Empty = fine. */
export function checkCatalog(db: Db, proposal: CatalogProposal): Issue[] {
  const tiers = proposal.tiers ?? listTiers(db);
  const tierProblems = validateTiers(tiers);
  if (tierProblems.length) return tierProblems.map((message) => ({ field: "tiers", message }));

  const msrp = proposal.msrp ?? getSettings(db).msrp;
  const images = countImagesByShirt(db);
  return listShirtRows(db).flatMap((row) =>
    validateShirt(
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
      { tiers, msrp, imageCount: images.get(row.id) ?? 0 },
    ).map((issue) => ({ field: row.slug, message: `${row.name}: ${issue.message}` })),
  );
}

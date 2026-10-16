/**
 * Add-ons (005 US1): the owner's extras. The only module that reads `add_ons`. Prices come from
 * here at placement, never from the browser (FR-006).
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import type { StoreSettings } from "@/lib/catalog/types";
import type { Db } from "@/lib/db/client";
import { addOns } from "@/lib/db/schema";
import type { Usd } from "@/lib/money";

export interface AddOnView {
  id: number;
  name: string;
  pitch: string;
  declineLine: string;
  priceUsd: Usd;
  position: number;
}

const columns = {
  id: addOns.id,
  name: addOns.name,
  pitch: addOns.pitch,
  declineLine: addOns.declineLine,
  priceUsd: addOns.priceUsd,
  position: addOns.position,
};

/** Every add-on checkout offers, in the owner's order. Empty while the tactic is off. */
export function listOfferedAddOns(
  db: Db,
  settings: Pick<StoreSettings, "preCheckedAddOns">,
): AddOnView[] {
  if (!settings.preCheckedAddOns) return [];
  return db
    .select(columns)
    .from(addOns)
    .where(eq(addOns.active, true))
    .orderBy(asc(addOns.position), asc(addOns.id))
    .all();
}

/**
 * The offered add-ons among `ids`, in the owner's order, and the ids that aren't offered (unknown
 * or retired). A repeated id counts once (analysis U1).
 */
export function resolveAddOns(
  db: Db,
  ids: readonly number[],
): { found: AddOnView[]; missing: number[] } {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { found: [], missing: [] };
  const found = db
    .select(columns)
    .from(addOns)
    .where(and(inArray(addOns.id, unique), eq(addOns.active, true)))
    .orderBy(asc(addOns.position), asc(addOns.id))
    .all();
  const offered = new Set(found.map((a) => a.id));
  return { found, missing: unique.filter((id) => !offered.has(id)) };
}

import { asc } from "drizzle-orm";
import type { Tier } from "@/lib/catalog/types";
import type { Db } from "@/lib/db/client";
import { complexityTiers } from "@/lib/db/schema";

export function listTiers(db: Db): Tier[] {
  return db.select().from(complexityTiers).orderBy(asc(complexityTiers.minScore)).all();
}

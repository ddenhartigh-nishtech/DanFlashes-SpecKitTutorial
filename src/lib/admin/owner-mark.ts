/**
 * Dan's mark (011 FR-004, R2): every console action that changes a shirt stamps it, so the
 * housekeeping sweep keeps everything he touched. Store actions never call these.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { shirts } from "@/lib/db/schema";

/** The columns a console save sets on the shirt it changes. */
export function dansChange() {
  const at = new Date().toISOString();
  return { updatedAt: at, ownerChangedAt: at };
}

/** For changes that land in another table (its pictures): mark the shirt itself. */
export function markDans(db: Db, shirtId: number): void {
  db.update(shirts).set(dansChange()).where(eq(shirts.id, shirtId)).run();
}

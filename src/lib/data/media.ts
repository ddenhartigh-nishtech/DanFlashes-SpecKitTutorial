import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { media } from "@/lib/db/schema";

export type MediaRow = typeof media.$inferSelect;

export function getMediaById(db: Db, id: number): MediaRow | null {
  return db.select().from(media).where(eq(media.id, id)).get() ?? null;
}

export function listMedia(db: Db): MediaRow[] {
  return db.select().from(media).all();
}

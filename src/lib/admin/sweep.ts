/**
 * Housekeeping (011): find and delete abandoned creations, the one kind of shirt constitution II
 * (v5.0.0) lets the owner delete, and the stray picture files no library entry refers to.
 *
 * An abandoned creation (FR-003, R3) is a shirt a shopper made at the dial that isn't mass-produced,
 * that Dan never changed, that's in no order and no cart, and that's older than the grace period.
 * Everything Dan made, released or not, is kept.
 */
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import { isUploadFile, UPLOAD_PREFIX } from "@/lib/admin/uploads";
import type { Db } from "@/lib/db/client";
import {
  cartItems,
  media,
  orderItems,
  shirtImages,
  shirts,
  storeSettings,
  users,
} from "@/lib/db/schema";

export const ABANDONED_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

export interface Abandoned {
  id: number;
  name: string;
  ageDays: number;
  /** The maker's email, or null for a creation from before makers were kept. */
  maker: string | null;
}

/** Every abandoned creation as of `now`, oldest first. */
export function findAbandoned(db: Db, now: Date): Abandoned[] {
  const cutoff = new Date(now.getTime() - ABANDONED_AFTER_DAYS * DAY_MS).toISOString();
  const rows = db
    .select({ id: shirts.id, name: shirts.name, createdAt: shirts.createdAt, maker: users.email })
    .from(shirts)
    .leftJoin(users, eq(users.id, shirts.makerUserId))
    .where(
      and(
        eq(shirts.origin, "dial"),
        eq(shirts.listed, false),
        isNull(shirts.ownerChangedAt),
        lt(shirts.createdAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(orderItems)
            .where(eq(orderItems.shirtId, shirts.id)),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(cartItems)
            .where(eq(cartItems.shirtId, shirts.id)),
        ),
      ),
    )
    .orderBy(shirts.createdAt, shirts.id)
    .all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ageDays: Math.floor((now.getTime() - Date.parse(row.createdAt)) / DAY_MS),
    maker: row.maker ?? null,
  }));
}

/** Files in the uploads folder named like stored pictures that no library entry refers to (R5). */
export function findStrayFiles(db: Db, dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const known = new Set(
    db
      .select({ key: media.key })
      .from(media)
      .all()
      .map((row) => row.key),
  );
  return fs
    .readdirSync(dir)
    .filter((file) => isUploadFile(file) && !known.has(`${UPLOAD_PREFIX}${file}`))
    .sort();
}

export interface SweepResult {
  shirts: Abandoned[];
  mediaRemoved: number;
  /** Every file removed: the swept pictures' and the strays. */
  filesRemoved: number;
  straysRemoved: number;
}

/**
 * Delete every abandoned creation and its pictures in one transaction, keeping any picture another
 * shirt or the placeholder still uses (FR-007). Files go only after the rows that named them, and
 * then the stray files (FR-008).
 */
export function sweep(db: Db, { now, dir }: { now: Date; dir: string }): SweepResult {
  const { found, keys } = db.transaction(() => {
    const found = findAbandoned(db, now);
    if (found.length === 0) return { found, keys: [] as string[] };
    const ids = found.map((shirt) => shirt.id);
    const mediaIds = [
      ...new Set(
        db
          .select({ mediaId: shirtImages.mediaId })
          .from(shirtImages)
          .where(inArray(shirtImages.shirtId, ids))
          .all()
          .map((row) => row.mediaId),
      ),
    ];
    db.delete(shirtImages).where(inArray(shirtImages.shirtId, ids)).run();
    db.delete(shirts).where(inArray(shirts.id, ids)).run();

    const placeholder = db
      .select({ id: storeSettings.placeholderMediaId })
      .from(storeSettings)
      .get()?.id;
    const stillUsed = new Set(
      db
        .select({ mediaId: shirtImages.mediaId })
        .from(shirtImages)
        .where(inArray(shirtImages.mediaId, mediaIds.length ? mediaIds : [-1]))
        .all()
        .map((row) => row.mediaId),
    );
    const orphaned = mediaIds.filter((id) => !stillUsed.has(id) && id !== placeholder);
    const keys = orphaned.length
      ? db
          .select({ key: media.key })
          .from(media)
          .where(inArray(media.id, orphaned))
          .all()
          .map((row) => row.key)
      : [];
    if (orphaned.length) db.delete(media).where(inArray(media.id, orphaned)).run();
    return { found, keys };
  });

  // Only our own files, in the folder being swept: seeded pictures in public/ are never touched.
  const ours = keys
    .filter((key) => key.startsWith(UPLOAD_PREFIX))
    .map((key) => key.slice(UPLOAD_PREFIX.length))
    .filter(isUploadFile);
  // The swept shirts' own files have no library entry now; count them once, as theirs.
  const strays = findStrayFiles(db, dir).filter((file) => !ours.includes(file));
  for (const file of [...ours, ...strays]) fs.rmSync(path.join(dir, file), { force: true });
  return {
    shirts: found,
    mediaRemoved: keys.length,
    filesRemoved: ours.length + strays.length,
    straysRemoved: strays.length,
  };
}

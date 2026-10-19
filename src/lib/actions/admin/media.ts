/**
 * The media library's actions (008 US4, R8): upload (checked by its bytes), reword, remove. An
 * upload never replaces anything, and a picture in use, or the placeholder, can't be removed.
 */
import { eq } from "drizzle-orm";
import { checkAlt, inspectUpload } from "@/lib/admin/media-files";
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { removeUpload, writeUpload } from "@/lib/admin/uploads";
import { copy } from "@/lib/copy";
import { getMediaById } from "@/lib/data/media";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { media, shirtImages } from "@/lib/db/schema";
import type { CookieJar } from "@/lib/http/cookies";

const m = copy.console.media;

/** FR-023: a new picture. The file is written first, under a fresh name; the row second. */
export async function uploadMediaCore(
  db: Db,
  jar: CookieJar,
  form: FormData,
): Promise<ConsoleState> {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return refused(m.noFile);
  const alt = text(form, "alt").trim();
  const altProblem = checkAlt(alt);
  if (altProblem) return problems([{ field: "alt", message: altProblem }]);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const found = inspectUpload(bytes);
  if (!found.ok) return problems([{ field: "file", message: found.reason }]);

  const key = writeUpload(bytes, found.ext);
  try {
    db.insert(media).values({ key, alt, kind: "shirt" }).run();
  } catch (error) {
    removeUpload(key); // no row, no file
    throw error;
  }
  return saved();
}

/** FR-025: new words for a picture. */
export function updateMediaAltCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const mediaId = id(form, "mediaId");
  if (mediaId === null || !getMediaById(db, mediaId)) return refused(m.notFound);
  const alt = text(form, "alt").trim();
  const altProblem = checkAlt(alt);
  if (altProblem) return problems([{ field: "alt", message: altProblem }]);
  db.update(media).set({ alt }).where(eq(media.id, mediaId)).run();
  return saved();
}

/** FR-025: remove a picture nothing uses. An upload's file goes too; public/ is never touched. */
export function removeMediaCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const mediaId = id(form, "mediaId");
  const row = mediaId === null ? null : getMediaById(db, mediaId);
  if (!row) return refused(m.notFound);
  if (getSettings(db).placeholderMediaId === row.id) return refused(m.isPlaceholder);
  if (db.select().from(shirtImages).where(eq(shirtImages.mediaId, row.id)).get()) {
    return refused(m.inUse);
  }
  db.delete(media).where(eq(media.id, row.id)).run();
  removeUpload(row.key);
  return saved(m.removed);
}

/**
 * The media library for the console (008 FR-022): every picture, the shirts it hangs on, and
 * whether it's the store's placeholder.
 */
import { asc, eq } from "drizzle-orm";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { media, shirtImages, shirts } from "@/lib/db/schema";
import { resolveMediaUrl } from "@/lib/media";

export interface MediaItem {
  id: number;
  key: string;
  alt: string;
  url: string;
  isPlaceholder: boolean;
  usedBy: { id: number; name: string }[];
}

export function listMediaLibrary(db: Db): MediaItem[] {
  const settings = getSettings(db);
  const uses = db
    .select({ mediaId: shirtImages.mediaId, id: shirts.id, name: shirts.name })
    .from(shirtImages)
    .innerJoin(shirts, eq(shirtImages.shirtId, shirts.id))
    .orderBy(asc(shirts.name))
    .all();
  return db
    .select()
    .from(media)
    .orderBy(asc(media.id))
    .all()
    .map((m) => ({
      id: m.id,
      key: m.key,
      alt: m.alt,
      url: resolveMediaUrl(m.key, settings.mediaBaseUrl),
      isPlaceholder: settings.placeholderMediaId === m.id,
      usedBy: uses.filter((u) => u.mediaId === m.id).map(({ id, name }) => ({ id, name })),
    }));
}

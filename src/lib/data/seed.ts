/**
 * Generic, idempotent catalog seeding: inserts what's missing and never overwrites owner edits.
 * The demo fixture itself lives in scripts/seed-data.ts — product data never lives in app code.
 */
import { eq } from "drizzle-orm";
import { validateTiers } from "@/lib/catalog/tiers";
import type { ShirtStatus, ShirtStyle, StoreSettings, Tier } from "@/lib/catalog/types";
import { validateShirt } from "@/lib/catalog/validate";
import { getSettings, saveSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { addOns, complexityTiers, media, shirtImages, shirts, storeSettings } from "@/lib/db/schema";
import { isValidMediaKey } from "@/lib/media";

export interface SeedImage {
  key: string;
  alt: string;
}

export interface SeedShirt {
  slug: string;
  name: string;
  style: ShirtStyle;
  complexity: number;
  finalPriceUsd?: string | null;
  description: string;
  status?: ShirtStatus;
  featured?: boolean;
  image: SeedImage;
}

/** An add-on the store starts with (005): owner data, editable in Studio afterwards. */
export interface SeedAddOn {
  name: string;
  pitch: string;
  declineLine: string;
  priceUsd: string;
  position: number;
}

export interface CatalogFixture {
  settings: Omit<StoreSettings, "placeholderMediaId">;
  placeholder: SeedImage;
  tiers: Omit<Tier, "id">[];
  shirts: SeedShirt[];
  addOns: SeedAddOn[];
}

export interface SeedCounts {
  tiers: number;
  media: number;
  shirts: number;
  addOns: number;
}

function ensureMedia(
  db: Db,
  image: SeedImage,
  kind: "shirt" | "placeholder",
): { id: number; inserted: boolean } {
  if (!isValidMediaKey(image.key)) throw new Error(`Invalid media key: ${image.key}`);
  const result = db.insert(media).values({ ...image, kind }).onConflictDoNothing().run();
  const row = db.select({ id: media.id }).from(media).where(eq(media.key, image.key)).get()!;
  return { id: row.id, inserted: result.changes > 0 };
}

export function seedCatalog(db: Db, fixture: CatalogFixture): SeedCounts {
  const counts: SeedCounts = { tiers: 0, media: 0, shirts: 0, addOns: 0 };

  db.transaction(() => {
    for (const tier of fixture.tiers) {
      counts.tiers += db.insert(complexityTiers).values(tier).onConflictDoNothing().run().changes;
    }
    const tierProblems = validateTiers(listTiers(db));
    if (tierProblems.length) throw new Error(`Invalid tiers: ${tierProblems.join(" ")}`);

    const placeholder = ensureMedia(db, fixture.placeholder, "placeholder");
    if (placeholder.inserted) counts.media++;

    const hasSettings = db.select().from(storeSettings).where(eq(storeSettings.id, 1)).get();
    if (!hasSettings) saveSettings(db, { ...fixture.settings, placeholderMediaId: placeholder.id });
    const settings = getSettings(db);
    const tiers = listTiers(db);

    for (const seed of fixture.shirts) {
      if (db.select({ id: shirts.id }).from(shirts).where(eq(shirts.slug, seed.slug)).get()) {
        continue;
      }
      const draft = {
        slug: seed.slug,
        name: seed.name,
        style: seed.style,
        complexity: seed.complexity,
        finalPriceUsd: seed.finalPriceUsd ?? null,
        description: seed.description,
        status: seed.status ?? "active",
        featured: seed.featured ?? false,
      };
      const issues = validateShirt(draft, { tiers, msrp: settings.msrp, imageCount: 1 });
      if (issues.length) {
        const detail = issues.map((i) => `${i.field}: ${i.message}`).join("; ");
        throw new Error(`Seed shirt "${seed.slug}" is invalid: ${detail}`);
      }
      const image = ensureMedia(db, seed.image, "shirt");
      if (image.inserted) counts.media++;
      const { id } = db
        .insert(shirts)
        .values({ ...draft, style: seed.style, status: draft.status as ShirtStatus })
        .returning({ id: shirts.id })
        .get();
      db.insert(shirtImages).values({ shirtId: id, mediaId: image.id, position: 0 }).run();
      counts.shirts++;
    }

    // Add-ons are skipped by name, so a second seed never overwrites the owner's edits.
    for (const addOn of fixture.addOns) {
      counts.addOns += db.insert(addOns).values(addOn).onConflictDoNothing().run().changes;
    }
  });

  return counts;
}

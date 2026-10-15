import { eq } from "drizzle-orm";
import type { StoreSettings } from "@/lib/catalog/types";
import { validateSettings } from "@/lib/catalog/validate";
import type { Db } from "@/lib/db/client";
import { getMediaById } from "@/lib/data/media";
import { storeSettings } from "@/lib/db/schema";
import { resolveMediaUrl } from "@/lib/media";

export function getSettings(db: Db): StoreSettings {
  const row = db.select().from(storeSettings).where(eq(storeSettings.id, 1)).get();
  if (!row) {
    throw new Error("Store settings are missing. Run `npm run db:reset` (or `npm run db:seed`).");
  }
  return {
    msrp: {
      startPriceUsd: row.msrpStartPriceUsd,
      anchorScore: row.msrpAnchorScore,
      doublingInterval: row.msrpDoublingInterval,
    },
    checkoutGate: row.checkoutGate,
    flashCreditPresetsUsd: row.flashCreditPresetsUsd,
    mediaBaseUrl: row.mediaBaseUrl,
    placeholderMediaId: row.placeholderMediaId,
    blandShaming: row.blandShaming,
    confirmshaming: row.confirmshaming,
    perDiemDrain: row.perDiemDrain,
    drainJokes: row.drainJokes,
  };
}

export function saveSettings(db: Db, settings: StoreSettings): void {
  const issues = validateSettings(settings);
  if (issues.length) {
    throw new Error(
      `Invalid store settings: ${issues.map((i) => `${i.field}: ${i.message}`).join("; ")}`,
    );
  }
  const values = {
    msrpStartPriceUsd: settings.msrp.startPriceUsd,
    msrpAnchorScore: settings.msrp.anchorScore,
    msrpDoublingInterval: settings.msrp.doublingInterval,
    checkoutGate: settings.checkoutGate,
    flashCreditPresetsUsd: settings.flashCreditPresetsUsd,
    mediaBaseUrl: settings.mediaBaseUrl,
    placeholderMediaId: settings.placeholderMediaId,
    blandShaming: settings.blandShaming,
    confirmshaming: settings.confirmshaming,
    perDiemDrain: settings.perDiemDrain,
    drainJokes: settings.drainJokes,
  };
  db.insert(storeSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: storeSettings.id, set: values })
    .run();
}

/** URL of the owner-configured placeholder image, or null if none is configured. */
export function getPlaceholderUrl(db: Db, settings: StoreSettings): string | null {
  if (settings.placeholderMediaId === null) return null;
  const row = getMediaById(db, settings.placeholderMediaId);
  return row ? resolveMediaUrl(row.key, settings.mediaBaseUrl) : null;
}

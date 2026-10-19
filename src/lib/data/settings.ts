import { eq } from "drizzle-orm";
import type { SwitchKey } from "@/lib/admin/switches";
import type { MsrpSettings, StoreSettings } from "@/lib/catalog/types";
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
    fakeScarcity: row.fakeScarcity,
    countdownTimers: row.countdownTimers,
    socialProof: row.socialProof,
    preCheckedAddOns: row.preCheckedAddOns,
    roachMotel: row.roachMotel,
    flashMode: row.flashMode,
    pipesBackground: row.pipesBackground,
    nosySignUp: row.nosySignUp,
    patternGenerator: row.patternGenerator,
    uniquitySurcharge: row.uniquitySurcharge,
    uniquitySurchargeUsd: row.uniquitySurchargeUsd,
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
    fakeScarcity: settings.fakeScarcity,
    countdownTimers: settings.countdownTimers,
    socialProof: settings.socialProof,
    preCheckedAddOns: settings.preCheckedAddOns,
    roachMotel: settings.roachMotel,
    flashMode: settings.flashMode,
    pipesBackground: settings.pipesBackground,
    nosySignUp: settings.nosySignUp,
    patternGenerator: settings.patternGenerator,
    uniquitySurcharge: settings.uniquitySurcharge,
    uniquitySurchargeUsd: settings.uniquitySurchargeUsd,
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

// ── Column-scoped saves for the console (008 R11): each touches only its own columns, so a switch
// flip and a tuning edit in two tabs never overwrite each other. The console validates first.

export function saveSwitch(db: Db, key: SwitchKey, on: boolean): void {
  db.update(storeSettings)
    .set({ [key]: on })
    .where(eq(storeSettings.id, 1))
    .run();
}

export function saveTuning(db: Db, msrp: MsrpSettings): void {
  db.update(storeSettings)
    .set({
      msrpStartPriceUsd: msrp.startPriceUsd,
      msrpAnchorScore: msrp.anchorScore,
      msrpDoublingInterval: msrp.doublingInterval,
    })
    .where(eq(storeSettings.id, 1))
    .run();
}

export function savePresets(db: Db, presetsUsd: string[]): void {
  db.update(storeSettings)
    .set({ flashCreditPresetsUsd: presetsUsd })
    .where(eq(storeSettings.id, 1))
    .run();
}

export function saveMediaSettings(
  db: Db,
  media: { mediaBaseUrl: string; placeholderMediaId: number },
): void {
  db.update(storeSettings).set(media).where(eq(storeSettings.id, 1)).run();
}

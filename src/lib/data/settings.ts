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
    msrp: { basePriceUsd: row.msrpBasePriceUsd, perPointUsd: row.msrpPerPointUsd },
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
    pushySalesBot: row.pushySalesBot,
    pssbModelUrl: row.pssbModelUrl,
    pssbModel: row.pssbModel,
    supportEmail: row.supportEmail,
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
    msrpBasePriceUsd: settings.msrp.basePriceUsd,
    msrpPerPointUsd: settings.msrp.perPointUsd,
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
    pushySalesBot: settings.pushySalesBot,
    pssbModelUrl: settings.pssbModelUrl,
    pssbModel: settings.pssbModel,
    supportEmail: settings.supportEmail,
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
    .set({ msrpBasePriceUsd: msrp.basePriceUsd, msrpPerPointUsd: msrp.perPointUsd })
    .where(eq(storeSettings.id, 1))
    .run();
}

export function savePresets(db: Db, presetsUsd: string[]): void {
  db.update(storeSettings)
    .set({ flashCreditPresetsUsd: presetsUsd })
    .where(eq(storeSettings.id, 1))
    .run();
}

/** The Uniquity Surcharge per shirt (007 FR-027). Carts follow on their next look. */
export function saveSurchargeAmount(db: Db, amountUsd: string): void {
  db.update(storeSettings)
    .set({ uniquitySurchargeUsd: amountUsd })
    .where(eq(storeSettings.id, 1))
    .run();
}

export function saveMediaSettings(
  db: Db,
  media: { mediaBaseUrl: string; placeholderMediaId: number },
): void {
  db.update(storeSettings).set(media).where(eq(storeSettings.id, 1)).run();
}

/** PSSB's model overrides (012 R10). Null falls back to the environment, then the code's default. */
export function savePssbModel(db: Db, { url, model }: { url: string | null; model: string | null }): void {
  db.update(storeSettings)
    .set({ pssbModelUrl: url, pssbModel: model })
    .where(eq(storeSettings.id, 1))
    .run();
}

/** Dan's support email (012 FR-019). Null means none: PSSB makes up an excuse. */
export function saveSupportEmail(db: Db, email: string | null): void {
  db.update(storeSettings).set({ supportEmail: email }).where(eq(storeSettings.id, 1)).run();
}

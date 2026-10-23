import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { MediaSettingsForm } from "@/components/admin/MediaSettingsForm";
import { PresetsForm } from "@/components/admin/PresetsForm";
import { PssbForm } from "@/components/admin/PssbForm";
import { SurchargeForm } from "@/components/admin/SurchargeForm";
import { SwitchBoard } from "@/components/admin/SwitchBoard";
import { TuningForm } from "@/components/admin/TuningForm";
import { SWITCH_KEYS } from "@/lib/admin/switches";
import { copy } from "@/lib/copy";
import { listAdminShirts, listLibrary } from "@/lib/data/admin-shirts";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";
import { pssbEndpoint } from "@/lib/pssb/endpoint";

export default function SettingsPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireAdmin();
  const db = getDb();
  const settings = getSettings(db);
  const shirts = listAdminShirts(db, { status: "active" }).map(({ id, name, complexity }) => ({
    id,
    name,
    complexity,
  }));
  return (
    <ConsolePage title={copy.console.settings.title} intro={copy.console.settings.intro}>
      <SwitchBoard switches={SWITCH_KEYS.map((key) => ({ key, on: settings[key] }))} />
      <TuningForm msrp={settings.msrp} tiers={listTiers(db)} shirts={shirts} />
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <PresetsForm presetsUsd={settings.flashCreditPresetsUsd} />
        <MediaSettingsForm
          mediaBaseUrl={settings.mediaBaseUrl}
          placeholderMediaId={settings.placeholderMediaId}
          library={listLibrary(db)}
        />
        <SurchargeForm amountUsd={settings.uniquitySurchargeUsd} />
      </div>
      <PssbForm
        modelUrl={settings.pssbModelUrl}
        model={settings.pssbModel}
        inEffect={pssbEndpoint(settings)}
        supportEmail={settings.supportEmail}
      />
    </ConsolePage>
  );
}

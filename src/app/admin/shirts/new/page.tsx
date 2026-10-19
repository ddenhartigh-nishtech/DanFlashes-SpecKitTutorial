import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ShirtForm } from "@/components/admin/ShirtForm";
import { copy } from "@/lib/copy";
import { listLibrary } from "@/lib/data/admin-shirts";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";

export default function NewShirtPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <NewShirt />
    </Suspense>
  );
}

async function NewShirt() {
  await requireAdmin();
  const db = getDb();
  return (
    <ConsolePage title={copy.console.shirts.newTitle}>
      <ShirtForm tiers={listTiers(db)} msrp={getSettings(db).msrp} library={listLibrary(db)} />
    </ConsolePage>
  );
}

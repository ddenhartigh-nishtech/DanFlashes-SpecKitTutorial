import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { TierEditor } from "@/components/admin/TierEditor";
import { copy } from "@/lib/copy";
import { listAdminShirts } from "@/lib/data/admin-shirts";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";

export default function TiersPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Tiers />
    </Suspense>
  );
}

async function Tiers() {
  await requireAdmin();
  const db = getDb();
  const shirts = listAdminShirts(db, { status: "active" }).map(({ id, name, complexity }) => ({
    id,
    name,
    complexity,
  }));
  return (
    <ConsolePage title={copy.console.tiers.title} intro={copy.console.tiers.intro}>
      <TierEditor tiers={listTiers(db)} shirts={shirts} />
    </ConsolePage>
  );
}

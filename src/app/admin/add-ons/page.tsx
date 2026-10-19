import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { AddOnCreate, AddOnRow } from "@/components/admin/AddOnRow";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { copy } from "@/lib/copy";
import { listAllAddOns } from "@/lib/data/add-ons";
import { getDb } from "@/lib/db/client";

export default function AddOnsPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <AddOns />
    </Suspense>
  );
}

async function AddOns() {
  await requireAdmin();
  const addOns = listAllAddOns(getDb());
  return (
    <ConsolePage title={copy.console.addOns.title} intro={copy.console.addOns.intro}>
      <ul className="flex flex-col gap-4">
        {addOns.map((addOn, i) => (
          <AddOnRow key={addOn.id} addOn={addOn} first={i === 0} last={i === addOns.length - 1} />
        ))}
      </ul>
      <AddOnCreate />
    </ConsolePage>
  );
}

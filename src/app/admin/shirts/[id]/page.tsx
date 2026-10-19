import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ImageManager } from "@/components/admin/ImageManager";
import { ListedControl } from "@/components/admin/ListedControl";
import { ShirtForm } from "@/components/admin/ShirtForm";
import { StatusControl } from "@/components/admin/StatusControl";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { getAdminShirt, listLibrary } from "@/lib/data/admin-shirts";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import { getDb } from "@/lib/db/client";

const s = copy.console.shirts;

export default function EditShirtPage({ params, searchParams }: PageProps<"/admin/shirts/[id]">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <EditShirt params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditShirt({
  params,
  searchParams,
}: Pick<PageProps<"/admin/shirts/[id]">, "params" | "searchParams">) {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  const shirt = /^\d+$/.test(id) ? getAdminShirt(db, Number(id)) : null;
  if (!shirt) {
    return (
      <ConsolePage title={s.title}>
        <p className={ui.card}>{copy.console.notFoundHere}</p>
      </ConsolePage>
    );
  }
  const justSaved = (await searchParams).saved === "1";

  return (
    <ConsolePage
      title={shirt.name}
      intro={
        <span className="flex flex-wrap gap-x-3">
          <span data-testid="shirt-origin">{copy.console.generator.origins[shirt.origin]}</span>
          {/* A full load into the loud store, on purpose (008 R1). */}
          <a href={`/shirts/${shirt.slug}`} className={ui.link}>
            {s.viewInStore}
          </a>
        </span>
      }
    >
      <ShirtForm
        shirt={shirt}
        tiers={listTiers(db)}
        msrp={getSettings(db).msrp}
        initial={justSaved ? { ok: true, message: copy.console.saved } : null}
      />
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-6">
          <StatusControl shirtId={shirt.id} name={shirt.name} status={shirt.status} />
          {shirt.origin === "dial" ? (
            <ListedControl shirtId={shirt.id} listed={shirt.listed} />
          ) : null}
        </div>
        <ImageManager shirtId={shirt.id} images={shirt.images} library={listLibrary(db)} />
      </div>
    </ConsolePage>
  );
}

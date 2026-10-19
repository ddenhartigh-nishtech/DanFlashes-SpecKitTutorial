import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { MediaCard } from "@/components/admin/MediaCard";
import { UploadForm } from "@/components/admin/UploadForm";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { listMediaLibrary } from "@/lib/data/admin-media";
import { getDb } from "@/lib/db/client";

const m = copy.console.media;

export default function MediaPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Media />
    </Suspense>
  );
}

async function Media() {
  await requireAdmin();
  const items = listMediaLibrary(getDb());
  return (
    <ConsolePage title={m.title} intro={m.intro}>
      <UploadForm />
      <section className="flex flex-col gap-3">
        <h2 className={ui.h2}>{m.library}</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </ul>
      </section>
    </ConsolePage>
  );
}

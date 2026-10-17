"use client";

import { attachImage, detachImage, moveImage } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import type { ConsoleState } from "@/lib/admin/state";
import { copy } from "@/lib/copy";
import type { AdminShirtImage, LibraryItem } from "@/lib/data/admin-shirts";

const m = copy.console.shirts.images;

/** One action for the whole picture shelf, so its one message is always the latest. */
async function manage(prev: ConsoleState | null, form: FormData): Promise<ConsoleState> {
  switch (form.get("op")) {
    case "attach":
      return attachImage(prev, form);
    case "up":
    case "down":
      form.set("direction", String(form.get("op")));
      return moveImage(prev, form);
    default:
      return detachImage(prev, form);
  }
}

/** A shirt's pictures, in order (008 FR-024): the first is the main one. */
export function ImageManager({
  shirtId,
  images,
  library,
}: {
  shirtId: number;
  images: AdminShirtImage[];
  library: LibraryItem[];
}) {
  const { state, onSubmit, pending } = useConsoleAction(manage);
  const attached = new Set(images.map((i) => i.mediaId));
  const choices = library.filter((item) => !attached.has(item.id));

  return (
    <section className={`${ui.card} flex flex-col gap-3`}>
      <div>
        <h2 className={ui.h2}>{m.title}</h2>
        <p className={ui.muted}>{m.help}</p>
      </div>
      {images.length === 0 ? <p className={ui.muted}>{m.none}</p> : null}
      <ol className="flex flex-col gap-2">
        {images.map((image, index) => (
          <li
            key={image.mediaId}
            data-testid="shirt-image"
            className="border-office-line flex flex-wrap items-center gap-3 rounded-md border p-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- shirt art is SVG or uploads */}
            <img src={image.url} alt={image.alt} width={56} height={56} className="size-14" />
            <span className="min-w-0 flex-1 text-sm break-words">{image.alt}</span>
            <form onSubmit={onSubmit} className="flex flex-wrap gap-1">
              <input type="hidden" name="shirtId" value={shirtId} />
              <input type="hidden" name="mediaId" value={image.mediaId} />
              <button name="op" value="up" disabled={pending || index === 0} className={ui.button}>
                {m.up}
              </button>
              <button
                name="op"
                value="down"
                disabled={pending || index === images.length - 1}
                className={ui.button}
              >
                {m.down}
              </button>
              <button name="op" value="detach" disabled={pending} className={ui.button}>
                {m.detach}
              </button>
            </form>
          </li>
        ))}
      </ol>
      {choices.length ? (
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="shirtId" value={shirtId} />
          <label className={`${ui.label} min-w-0 flex-1`}>
            {m.add}
            <select name="mediaId" required defaultValue="" className={ui.input}>
              <option value="" disabled>
                {m.choose}
              </option>
              {choices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.alt}
                </option>
              ))}
            </select>
          </label>
          <button name="op" value="attach" disabled={pending} className={ui.primary}>
            {m.attach}
          </button>
        </form>
      ) : null}
      <ConsoleMessage state={state} />
    </section>
  );
}

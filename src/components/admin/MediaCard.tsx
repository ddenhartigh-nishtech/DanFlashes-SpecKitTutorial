"use client";

import Link from "next/link";
import { useState } from "react";
import { removeMedia, updateMediaAlt } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";
import type { MediaItem } from "@/lib/data/admin-media";

const m = copy.console.media;

/** One picture: where it hangs, its words, and, if nothing uses it, a calm way out (FR-022, FR-025). */
export function MediaCard({ item }: { item: MediaItem }) {
  const alt = useConsoleAction(updateMediaAlt);
  const remove = useConsoleAction(removeMedia);
  const [asking, setAsking] = useState(false);
  const removable = !item.isPlaceholder && item.usedBy.length === 0;

  return (
    <li data-testid="media-item" className={`${ui.card} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- shirt art is SVG or uploads */}
        <img src={item.url} alt={item.alt} width={80} height={80} className="size-20 shrink-0" />
        <div className="min-w-0 text-sm">
          <p className="break-words">{item.alt}</p>
          {item.isPlaceholder ? <p className="text-office-sage mt-1">{m.placeholder}</p> : null}
          <p className={`${ui.muted} mt-1`}>
            {item.usedBy.length === 0 ? m.unused : `${m.usedBy}: `}
            {item.usedBy.map((shirt, i) => (
              <span key={shirt.id}>
                {i ? ", " : ""}
                <Link href={`/admin/shirts/${shirt.id}`} className={ui.link}>
                  {shirt.name}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </div>
      <form onSubmit={alt.onSubmit} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="mediaId" value={item.id} />
        <label className={`${ui.label} min-w-0 flex-1`}>
          {m.alt}
          <input name="alt" defaultValue={item.alt} maxLength={200} className={ui.input} />
        </label>
        <button type="submit" disabled={alt.pending} className={ui.button}>
          {m.saveAlt}
        </button>
      </form>
      <ConsoleMessage state={alt.state} />
      {removable ? (
        <form
          onSubmit={(e) => {
            setAsking(false);
            remove.onSubmit(e);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="mediaId" value={item.id} />
          {asking ? (
            <>
              <span className="text-sm">{m.confirmRemove}</span>
              <button type="submit" disabled={remove.pending} className={ui.button}>
                {m.yesRemove}
              </button>
              <button type="button" onClick={() => setAsking(false)} className={ui.button}>
                {m.keep}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setAsking(true)} className={ui.button}>
              {m.remove}
            </button>
          )}
        </form>
      ) : null}
      <ConsoleMessage state={remove.state} />
    </li>
  );
}

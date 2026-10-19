"use client";

import { saveMediaSettings } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";
import type { LibraryItem } from "@/lib/data/admin-shirts";

const m = copy.console.settings.media;

/** Where the pictures come from, and the placeholder (008 FR-017). */
export function MediaSettingsForm({
  mediaBaseUrl,
  placeholderMediaId,
  library,
}: {
  mediaBaseUrl: string;
  placeholderMediaId: number | null;
  library: LibraryItem[];
}) {
  const { state, onSubmit, pending } = useConsoleAction(saveMediaSettings);
  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-3`}>
      <h2 className={ui.h2}>{m.title}</h2>
      <label className={ui.label}>
        {m.baseUrl}
        <input
          name="mediaBaseUrl"
          defaultValue={mediaBaseUrl}
          aria-describedby="base-url-help"
          className={ui.input}
        />
      </label>
      <p id="base-url-help" className={ui.muted}>
        {m.baseUrlHelp}
      </p>
      <label htmlFor="placeholder" className="text-sm font-medium">
        {m.placeholder}
      </label>
      <select
        id="placeholder"
        name="placeholderMediaId"
        defaultValue={placeholderMediaId ?? ""}
        className={ui.input}
      >
        {library.map((item) => (
          <option key={item.id} value={item.id}>
            {item.alt}
          </option>
        ))}
      </select>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {m.save}
        </button>
      </div>
    </form>
  );
}

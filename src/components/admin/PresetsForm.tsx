"use client";

import { savePresets } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const p = copy.console.settings.presets;

/** The Flash Credit top-up amounts the account page offers (008 FR-016). */
export function PresetsForm({ presetsUsd }: { presetsUsd: string[] }) {
  const { state, onSubmit, pending } = useConsoleAction(savePresets);
  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-3`}>
      <h2 className={ui.h2}>{p.title}</h2>
      <label htmlFor="presets" className="text-sm font-medium">
        {p.label}
      </label>
      <textarea
        id="presets"
        name="presetsUsd"
        rows={4}
        defaultValue={presetsUsd.join("\n")}
        aria-describedby="presets-help"
        className={ui.input}
      />
      <p id="presets-help" className={ui.muted}>
        {p.help}
      </p>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {p.save}
        </button>
      </div>
    </form>
  );
}

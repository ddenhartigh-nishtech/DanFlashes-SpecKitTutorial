"use client";

import { setSwitch } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import type { SwitchKey } from "@/lib/admin/switches";
import { copy } from "@/lib/copy";

const s = copy.console.settings;

/** Every tactic switch, one click each (008 FR-012, FR-013). */
export function SwitchBoard({ switches }: { switches: { key: SwitchKey; on: boolean }[] }) {
  const { state, onSubmit, pending } = useConsoleAction(setSwitch);
  return (
    <section className={`${ui.card} flex flex-col gap-3`}>
      <h2 className={ui.h2}>{s.switchesTitle}</h2>
      <ConsoleMessage state={state} />
      <ul className="divide-office-line divide-y">
        {switches.map(({ key, on }) => (
          <li
            key={key}
            data-testid="switch"
            data-key={key}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0 flex-1 basis-64">
              <p className="font-medium">{s.switches[key].label}</p>
              <p className={ui.muted}>{s.switches[key].description}</p>
            </div>
            <form onSubmit={onSubmit} className="flex items-center gap-3">
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="on" value={on ? "0" : "1"} />
              <span
                data-testid="switch-state"
                className={`text-sm font-medium ${on ? "text-office-sage" : "text-office-muted"}`}
              >
                {on ? s.on : s.off}
              </span>
              <button type="submit" disabled={pending} className={ui.button}>
                {on ? s.turnOff : s.turnOn}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

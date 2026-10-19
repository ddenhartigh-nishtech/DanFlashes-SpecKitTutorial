"use client";

import { saveSurcharge } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const u = copy.console.settings.surcharge;

/** What the Uniquity Surcharge charges per one-of-a-kind shirt (007 FR-027). */
export function SurchargeForm({ amountUsd }: { amountUsd: string }) {
  const { state, onSubmit, pending } = useConsoleAction(saveSurcharge);
  return (
    <form onSubmit={onSubmit} className={`${ui.card} flex flex-col gap-3`}>
      <h2 className={ui.h2}>{u.title}</h2>
      <label htmlFor="surcharge" className="text-sm font-medium">
        {u.label}
      </label>
      <input
        id="surcharge"
        name="amountUsd"
        inputMode="decimal"
        defaultValue={amountUsd}
        aria-describedby="surcharge-help"
        className={ui.input}
      />
      <p id="surcharge-help" className={ui.muted}>
        {u.help}
      </p>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {u.save}
        </button>
      </div>
    </form>
  );
}

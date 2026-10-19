"use client";

import { useState } from "react";
import { setShirtStatus } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import type { ShirtStatus } from "@/lib/catalog/types";
import { copy } from "@/lib/copy";

const s = copy.console.shirts;

/**
 * On the floor or resting (008 FR-010). Resting asks once, calmly (FR-005); putting it back
 * doesn't need asking. There's no delete, anywhere.
 */
export function StatusControl({
  shirtId,
  name,
  status,
}: {
  shirtId: number;
  name: string;
  status: ShirtStatus;
}) {
  const { state, onSubmit, pending } = useConsoleAction(setShirtStatus);
  const [asking, setAsking] = useState(false);
  const active = status === "active";

  return (
    <div className={`${ui.card} flex flex-col gap-3`}>
      <p className="text-sm">
        <span className="text-office-muted">{s.table.status}: </span>
        <span data-testid="shirt-status" className="font-medium">
          {active ? s.status.active : s.status.inactive}
        </span>
      </p>
      <form
        onSubmit={(e) => {
          setAsking(false);
          onSubmit(e);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="id" value={shirtId} />
        <input type="hidden" name="status" value={active ? "inactive" : "active"} />
        {!active ? (
          <button type="submit" disabled={pending} className={ui.primary}>
            {s.activate}
          </button>
        ) : asking ? (
          <>
            <span className="text-sm">{s.confirmDeactivate(name)}</span>
            <button type="submit" disabled={pending} className={ui.button}>
              {s.yesDeactivate}
            </button>
            <button type="button" onClick={() => setAsking(false)} className={ui.button}>
              {s.keep}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setAsking(true)} className={ui.button}>
            {s.deactivate}
          </button>
        )}
      </form>
      <ConsoleMessage state={state} />
    </div>
  );
}

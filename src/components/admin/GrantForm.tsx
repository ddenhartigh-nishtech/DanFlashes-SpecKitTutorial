"use client";

import { useEffect, useRef } from "react";
import { grantFlashCredit } from "@/actions/admin";
import { ConsoleMessage } from "@/components/admin/ConsoleMessage";
import { ui } from "@/components/admin/ui";
import { useConsoleAction } from "@/components/admin/useConsoleAction";
import { copy } from "@/lib/copy";

const c = copy.console.customers;

/**
 * A gift of Flash Credit (008 FR-036). The token is fresh each time the page renders, so pressing
 * Grant twice on one form records one grant.
 */
export function GrantForm({ userId, token }: { userId: number; token: string }) {
  const { state, onSubmit, pending } = useConsoleAction(grantFlashCredit);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form
      ref={form}
      data-testid="grant-form"
      onSubmit={onSubmit}
      className={`${ui.card} flex flex-col gap-3`}
    >
      <h2 className={ui.h2}>{c.grantTitle}</h2>
      <p className={ui.muted}>{c.grantHelp}</p>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="token" value={token} />
      <label className={ui.label}>
        {c.amount}
        <input name="amountUsd" inputMode="decimal" required className={ui.input} />
      </label>
      <ConsoleMessage state={state} />
      <div>
        <button type="submit" disabled={pending} className={ui.primary}>
          {c.grant}
        </button>
      </div>
    </form>
  );
}

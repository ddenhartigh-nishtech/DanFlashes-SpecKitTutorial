"use client";

import { useActionState } from "react";
import { cashIn } from "@/actions/streams";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";

/** One "Cash in" press pays as `paymentNo`, so a double press pays once (003 R4). */
export function CashInButton({ streamId, paymentNo }: { streamId: number; paymentNo: number }) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(cashIn, null);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="streamId" value={streamId} />
      <input type="hidden" name="paymentNo" value={paymentNo} />
      <button
        type="submit"
        disabled={pending}
        className="font-display bg-acid border-ink min-h-11 border-4 px-4 uppercase shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? copy.streams.cashingIn : copy.streams.cashIn}
      </button>
      {state && !state.ok ? (
        <p role="status" className="bg-safety-orange px-2 text-sm font-bold">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

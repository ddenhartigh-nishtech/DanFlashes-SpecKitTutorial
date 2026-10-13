"use client";

import { useActionState } from "react";
import { topUpFlashCredit } from "@/actions/flash-credit";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import { formatUsd, type Usd } from "@/lib/money";

const input =
  "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold tabular-nums";

export function TopUpForm({ presetsUsd }: { presetsUsd: Usd[] }) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    topUpFlashCredit,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset>
        <legend className="font-display mb-2 text-sm uppercase">{copy.account.topUpHeading}</legend>
        <div className="flex flex-wrap gap-2">
          {presetsUsd.map((preset, i) => (
            <label key={preset} className="cursor-pointer">
              <input
                type="radio"
                name="amountUsd"
                value={preset}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="font-display border-ink bg-paper peer-checked:bg-ink peer-checked:text-highlighter peer-focus-visible:outline-ultraviolet flex min-h-11 items-center border-4 px-3 tabular-nums peer-focus-visible:outline-4">
                {formatUsd(preset)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="font-display text-sm uppercase">
        {copy.account.customAmount}
        <input name="customAmountUsd" inputMode="decimal" placeholder="123.45" className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="font-display col-span-2 text-sm uppercase">
          {copy.checkout.cardNumber}
          <input
            name="cardNumber"
            inputMode="numeric"
            autoComplete="off"
            required
            className={input}
          />
        </label>
        <label className="font-display text-sm uppercase">
          {copy.checkout.expiry}
          <input name="expiry" placeholder="MM/YY" autoComplete="off" required className={input} />
        </label>
        <label className="font-display text-sm uppercase">
          {copy.checkout.cvc}
          <input name="cvc" inputMode="numeric" autoComplete="off" required className={input} />
        </label>
      </div>

      <div role="status" aria-live="polite">
        {state && !state.ok ? (
          <p className="bg-safety-orange border-ink border-4 p-3 font-bold">{state.message}</p>
        ) : null}
        {state?.ok ? (
          <p className="bg-acid border-ink border-4 p-3 font-bold">{state.message}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? copy.account.toppingUp : copy.account.topUp}
      </button>
    </form>
  );
}

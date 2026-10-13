"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction } from "@/actions/checkout";
import type { ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import { cmp, formatUsd, type Usd } from "@/lib/money";

interface CheckoutFormProps {
  checkoutToken: string;
  /** The total the shopper is looking at — only used to detect a price change. */
  expectedTotalUsd: Usd;
  /** Null for guests (Flash Credit needs an account). */
  balanceUsd: Usd | null;
}

const input =
  "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold tabular-nums";

export function CheckoutForm({ checkoutToken, expectedTotalUsd, balanceUsd }: CheckoutFormProps) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    placeOrderAction,
    null,
  );
  const [method, setMethod] = useState<"card" | "flash_credit">("card");
  const short = balanceUsd !== null && cmp(balanceUsd, expectedTotalUsd) < 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="checkoutToken" value={checkoutToken} />
      <input type="hidden" name="expectedTotalUsd" value={expectedTotalUsd} />

      <fieldset className="flex flex-col gap-2">
        <legend className="font-display mb-1 text-sm uppercase">{copy.checkout.payWith}</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
          <input
            type="radio"
            name="method"
            value="card"
            checked={method === "card"}
            onChange={() => setMethod("card")}
            className="accent-hot-pink size-5"
          />
          {copy.checkout.card}
        </label>
        {balanceUsd !== null ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
            <input
              type="radio"
              name="method"
              value="flash_credit"
              checked={method === "flash_credit"}
              onChange={() => setMethod("flash_credit")}
              className="accent-hot-pink size-5"
            />
            {copy.checkout.flashCredit}
            <span data-testid="checkout-balance" className="bg-highlighter px-2 text-sm">
              {copy.checkout.flashBalance(formatUsd(balanceUsd))}
            </span>
          </label>
        ) : null}
      </fieldset>

      {method === "card" ? (
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
            <input
              name="expiry"
              placeholder={copy.checkout.expiryPlaceholder}
              autoComplete="off"
              required
              className={input}
            />
          </label>
          <label className="font-display text-sm uppercase">
            {copy.checkout.cvc}
            <input name="cvc" inputMode="numeric" autoComplete="off" required className={input} />
          </label>
        </div>
      ) : short ? (
        <p className="bg-safety-orange border-ink border-4 p-3 font-bold">
          {copy.codes.INSUFFICIENT_FLASH_CREDIT}{" "}
          <Link href="/account#flash-credit" className="underline">
            {copy.checkout.topUpLink}
          </Link>
        </p>
      ) : null}

      <div role="status" aria-live="polite">
        {state && !state.ok ? (
          <p
            data-testid="checkout-error"
            className="bg-safety-orange border-ink border-4 p-3 font-bold"
          >
            {state.message}
            {state.code === "INSUFFICIENT_FLASH_CREDIT" ? (
              <>
                {" "}
                <Link href="/account#flash-credit" className="underline">
                  {copy.checkout.topUpLink}
                </Link>{" "}
                <button type="button" onClick={() => setMethod("card")} className="underline">
                  {copy.checkout.useCard}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending
          ? copy.checkout.placing
          : `${copy.checkout.place} · ${formatUsd(expectedTotalUsd)}`}
      </button>
    </form>
  );
}

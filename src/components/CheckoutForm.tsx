"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction } from "@/actions/checkout";
import type { ActionState } from "@/lib/actions/state";
import { PriceTag } from "@/components/PriceTag";
import { splitPayment, type Split } from "@/lib/checkout/split";
import { orderTotals } from "@/lib/checkout/totals";
import { copy } from "@/lib/copy";
import { add, cmp, formatUsd, ZERO, type Usd } from "@/lib/money";

export interface CheckoutAddOn {
  id: number;
  name: string;
  pitch: string;
  declineLine: string;
  priceUsd: Usd;
}

interface CheckoutFormProps {
  checkoutToken: string;
  /** The shirts. The total adds the add-ons he keeps ticked (005 R4). */
  subtotalUsd: Usd;
  /** Every offered add-on (005 US1): all ticked whenever the form mounts. Empty while it's off. */
  addOns: CheckoutAddOn[];
  /** Decline lines show only while confirmshaming is on (002). */
  confirmshaming: boolean;
  /** Null for guests (Flash Credit needs an account). */
  balanceUsd: Usd | null;
}

const input =
  "border-ink bg-paper mt-1 block min-h-11 w-full border-4 px-3 font-semibold tabular-nums";
const c = copy.checkout;

export function CheckoutForm({
  checkoutToken,
  subtotalUsd,
  addOns,
  confirmshaming,
  balanceUsd,
}: CheckoutFormProps) {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    placeOrderAction,
    null,
  );
  const [applied, setApplied] = useState(false);
  // Everything starts ticked, every time (005 Q3): only what he unticks in this visit is left out.
  const [unticked, setUnticked] = useState<ReadonlySet<number>>(new Set());
  const ticked = addOns.filter((a) => !unticked.has(a.id));
  const toggle = (id: number) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The total he's looking at: the shirts plus what he kept ticked. Only used to detect a change.
  const expectedTotalUsd = orderTotals({
    subtotalUsd,
    addOnPrices: ticked.map((a) => a.priceUsd),
    shippingUsd: ZERO,
    taxUsd: ZERO,
  }).totalUsd;

  // The split he sees: from his balance, or the server's newer one after CREDIT_CHANGED (003 R11),
  // as long as it still adds up to the total he's looking at.
  const reported = state && !state.ok && state.code === "CREDIT_CHANGED" ? state : null;
  const changed =
    reported?.creditUsd &&
    reported.cardUsd &&
    cmp(add(reported.creditUsd, reported.cardUsd), expectedTotalUsd) === 0
      ? reported
      : null;
  const split: Split | null = !applied
    ? null
    : changed?.creditUsd && changed.cardUsd
      ? {
          creditUsd: changed.creditUsd,
          cardUsd: changed.cardUsd,
          method: cmp(changed.cardUsd, ZERO) === 0 ? "flash_credit" : "split",
        }
      : splitPayment(balanceUsd ?? ZERO, expectedTotalUsd);
  const cardUsd = split ? split.cardUsd : expectedTotalUsd;
  const hasCredit = balanceUsd !== null && cmp(balanceUsd, ZERO) > 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="checkoutToken" value={checkoutToken} />
      <input type="hidden" name="expectedTotalUsd" value={expectedTotalUsd} />
      {ticked.map((a) => (
        <input key={a.id} type="hidden" name="addOnId" value={a.id} />
      ))}

      {addOns.length === 0 ? null : (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-display mb-1 text-sm uppercase">{c.addOnsHeading}</legend>
          {addOns.map((addOn) => {
            const on = !unticked.has(addOn.id);
            return (
              <div
                key={addOn.id}
                data-testid="add-on"
                className="border-ink bg-paper flex flex-col gap-1 border-2 p-2"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(addOn.id)}
                    className="accent-hot-pink mt-1 size-5 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap justify-between gap-x-3 font-bold">
                      <span className="[overflow-wrap:anywhere]">{addOn.name}</span>
                      <span className="tabular-nums">
                        {c.addOnPrice(formatUsd(addOn.priceUsd))}
                      </span>
                    </span>
                    <span className="text-sm">{addOn.pitch}</span>
                  </span>
                </label>
                {!on && confirmshaming ? (
                  <p className="text-hot-pink text-sm font-bold">{addOn.declineLine}</p>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      )}

      <p className="font-display flex flex-wrap items-center justify-between gap-3 uppercase">
        {copy.checkout.total}
        <span data-testid="total">
          <PriceTag priceUsd={expectedTotalUsd} />
        </span>
      </p>
      {split ? (
        <>
          <input type="hidden" name="useFlashCredit" value="on" />
          <input type="hidden" name="expectedCreditUsd" value={split.creditUsd} />
        </>
      ) : null}

      {balanceUsd === null ? null : (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-display mb-1 text-sm uppercase">{c.payWith}</legend>
          {!hasCredit ? (
            <p data-testid="no-credit" className="solid-backing p-3">
              {c.noCredit}{" "}
              <Link href="/account#flash-credit" className="underline">
                {c.topUpLink}
              </Link>{" "}
              or{" "}
              <Link href="/account#revenue-streams" className="underline">
                {c.streamsLink}
              </Link>
              .
            </p>
          ) : split ? (
            <div
              data-testid="split"
              className="border-ink bg-acid flex flex-col gap-1 border-4 p-3 font-bold"
            >
              <span data-testid="credit-line">{c.creditLine(formatUsd(split.creditUsd))}</span>
              {cmp(split.cardUsd, ZERO) > 0 ? (
                <span data-testid="card-line">{c.cardLine(formatUsd(split.cardUsd))}</span>
              ) : (
                <span>{c.coveredByCredit}</span>
              )}
              <button
                type="button"
                onClick={() => setApplied(false)}
                className="font-display mt-1 self-start text-sm uppercase underline decoration-4 underline-offset-4"
              >
                {c.removeCredit}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setApplied(true)}
              className="font-display border-ink bg-highlighter min-h-11 border-4 px-4 text-left uppercase shadow-[3px_3px_0_var(--color-ink)]"
            >
              {c.applyCredit(formatUsd(balanceUsd))}
            </button>
          )}
        </fieldset>
      )}

      {cmp(cardUsd, ZERO) > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="font-display col-span-2 text-sm uppercase">
            {c.cardNumber}
            <input
              name="cardNumber"
              inputMode="numeric"
              autoComplete="off"
              required
              className={input}
            />
          </label>
          <label className="font-display text-sm uppercase">
            {c.expiry}
            <input
              name="expiry"
              placeholder={c.expiryPlaceholder}
              autoComplete="off"
              required
              className={input}
            />
          </label>
          <label className="font-display text-sm uppercase">
            {c.cvc}
            <input name="cvc" inputMode="numeric" autoComplete="off" required className={input} />
          </label>
        </div>
      ) : null}

      {split?.method === "split" ? (
        // Keyed on the amount, so a changed split always needs a fresh confirmation.
        <label
          key={split.creditUsd}
          className="bg-highlighter border-ink flex min-h-11 cursor-pointer items-center gap-3 border-4 px-3 font-bold"
        >
          <input
            type="checkbox"
            name="confirmSplit"
            required
            className="accent-hot-pink size-5 shrink-0"
          />
          {c.confirmSplit(formatUsd(split.cardUsd))}
        </label>
      ) : null}

      <div role="status" aria-live="polite">
        {state && !state.ok ? (
          <p
            data-testid="checkout-error"
            className="bg-safety-orange border-ink border-4 p-3 font-bold"
          >
            {state.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="font-display bg-hot-pink text-paper min-h-12 px-6 text-lg uppercase shadow-[4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? c.placing : `${c.place} · ${formatUsd(expectedTotalUsd)}`}
      </button>
    </form>
  );
}

import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentCartId, currentUser } from "@/app/_data/request";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Countdown } from "@/components/Countdown";
import { OrderSummary } from "@/components/OrderSummary";
import { getCartView } from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { cartSummaryLines } from "@/lib/orders/orders";
import { showCountdown } from "@/lib/urgency/countdown";
import { listOfferedAddOns } from "@/lib/data/add-ons";
import { settleStreams } from "@/lib/streams/streams";

export const metadata: Metadata = { title: copy.checkout.title };

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl leading-tight md:text-5xl">{copy.checkout.heading}</h1>
      <Suspense
        fallback={<div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />}
      >
        <CheckoutContents />
      </Suspense>
    </div>
  );
}

async function CheckoutContents() {
  const user = await currentUser(); // also defers to request time
  const db = getDb();
  const settings = getSettings(db);
  if (settings.checkoutGate && !user) redirect("/sign-in?next=/checkout");

  const view = getCartView(db, await currentCartId());
  if (view.lines.length === 0) redirect("/cart");
  if (user) settleStreams(db, user.id); // the balance below includes every payday that came due

  // Shipping and tax are $0.00 (FR-029). The total is live in the form: shirts plus add-ons (005 R4).
  const addOns = listOfferedAddOns(db, settings);
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_22rem] md:items-start">
      <div className="flex flex-col gap-3">
        {showCountdown(settings, "hold", view.lines.length) ? (
          <div>
            <Countdown kind="hold" label={copy.urgency.hold} />
          </div>
        ) : null}
        {user ? (
          <p className="font-semibold">
            {copy.checkout.signedInAs(user.displayName ?? user.email)}
          </p>
        ) : null}
        <OrderSummary
          lines={cartSummaryLines(view)}
          subtotalUsd={view.subtotalUsd}
          shippingUsd="0.00"
          taxUsd="0.00"
          placeholderUrl={getPlaceholderUrl(db, settings)}
        />
      </div>
      <div className="border-ink bg-paper border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]">
        <CheckoutForm
          // No key: a refusal re-renders this with the new prices, and a remount would wipe Dan's
          // message about them. The form forgets unticks when he leaves instead (005 R4).
          checkoutToken={randomUUID()}
          subtotalUsd={view.subtotalUsd}
          addOns={addOns.map(({ id, name, pitch, declineLine, priceUsd }) => ({
            id,
            name,
            pitch,
            declineLine,
            priceUsd,
          }))}
          confirmshaming={settings.confirmshaming}
          balanceUsd={user ? getBalanceUsd(db, user.id) : null}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/actions/auth";
import { currentUser } from "@/app/_data/request";
import { OrderSummary } from "@/components/OrderSummary";
import { PriceTag } from "@/components/PriceTag";
import { TopUpForm } from "@/components/TopUpForm";
import { copy } from "@/lib/copy";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { getBalanceUsd, listEntries } from "@/lib/flash-credit/ledger";
import { formatUsd } from "@/lib/money";
import { listOrdersForUser, orderNumber } from "@/lib/orders/orders";
import { labelFor } from "@/lib/shaming/labels";

export const metadata: Metadata = { title: copy.account.title };

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export default function AccountPage() {
  return (
    <Suspense
      fallback={<div className="loud-dots border-ink h-64 animate-pulse border-4 opacity-60" />}
    >
      <AccountContents />
    </Suspense>
  );
}

async function AccountContents() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/account");
  const db = getDb();
  const settings = getSettings(db);
  const placeholderUrl = getPlaceholderUrl(db, settings);
  const orders = listOrdersForUser(db, user.id);
  const balanceUsd = getBalanceUsd(db, user.id);
  const entries = listEntries(db, user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl leading-tight md:text-5xl">
          {copy.account.heading(user.displayName ?? user.email)}
        </h1>
        <form action={signOutAction}>
          <button
            type="submit"
            className="font-display border-ink min-h-11 border-4 px-4 uppercase"
          >
            {labelFor("signOut", settings.confirmshaming)}
          </button>
        </form>
      </div>

      <section
        id="flash-credit"
        aria-labelledby="flash-heading"
        className="grid scroll-mt-24 gap-6 md:grid-cols-[1fr_22rem] md:items-start"
      >
        <div className="flex flex-col gap-4">
          <h2 id="flash-heading" className="font-display text-2xl md:text-3xl">
            {copy.account.flashHeading}
          </h2>
          <p className="font-display flex items-center gap-3 uppercase">
            {copy.account.balance}
            <span data-testid="flash-balance">
              <PriceTag priceUsd={balanceUsd} size="lg" />
            </span>
          </p>
          <h3 className="font-display text-lg">{copy.account.history}</h3>
          {entries.length === 0 ? (
            <p className="solid-backing p-3">{copy.account.noEntries}</p>
          ) : (
            <ul data-testid="flash-history" className="border-ink divide-ink divide-y-2 border-4">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  data-testid="flash-entry"
                  className="bg-paper flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <span className="flex flex-col font-semibold">
                    <time dateTime={entry.createdAt} className="text-xs font-normal uppercase">
                      {dateFormat.format(new Date(entry.createdAt))}
                    </time>
                    {entry.kind === "top_up" ? (
                      copy.account.entryTopUp(entry.cardBrand ?? "Card", entry.cardLast4 ?? "????")
                    ) : (
                      <Link href={`/orders/${entry.orderId}`} className="underline">
                        {copy.account.entrySpend(orderNumber(entry.orderId!))}
                      </Link>
                    )}
                  </span>
                  <span
                    className={`font-display tabular-nums ${entry.kind === "spend" ? "text-hot-pink" : ""}`}
                  >
                    {entry.kind === "top_up" ? "+" : ""}
                    {formatUsd(entry.amountUsd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-ink bg-paper border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]">
          <TopUpForm presetsUsd={settings.flashCreditPresetsUsd} />
        </div>
      </section>

      <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
        <h2 id="orders-heading" className="font-display text-2xl md:text-3xl">
          {copy.account.ordersHeading}
        </h2>
        {orders.length === 0 ? (
          <p className="solid-backing p-4">{copy.account.noOrders}</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {orders.map((order) => (
              <li key={order.id} data-testid="order" className="flex flex-col gap-2">
                <p className="font-display flex flex-wrap gap-3 text-sm">
                  <span className="bg-ink text-highlighter px-2 py-0.5">{order.number}</span>
                  <span>{copy.account.placedOn(dateFormat.format(new Date(order.createdAt)))}</span>
                  <span className="bg-highlighter px-2">
                    {order.payment.method === "card"
                      ? copy.order.paidCard(order.payment.brand, order.payment.last4)
                      : copy.order.paidFlash}
                  </span>
                </p>
                <OrderSummary
                  lines={order.lines}
                  subtotalUsd={order.subtotalUsd}
                  shippingUsd={order.shippingUsd}
                  taxUsd={order.taxUsd}
                  totalUsd={order.totalUsd}
                  placeholderUrl={placeholderUrl}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

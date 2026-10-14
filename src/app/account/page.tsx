import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/actions/auth";
import { currentUser } from "@/app/_data/request";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ConnectStreamForm } from "@/components/ConnectStreamForm";
import { OrderSummary } from "@/components/OrderSummary";
import { PriceTag } from "@/components/PriceTag";
import { StreamList } from "@/components/StreamList";
import { TopUpForm } from "@/components/TopUpForm";
import { copy } from "@/lib/copy";
import { getPlaceholderUrl, getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { getBalanceUsd, listEntries } from "@/lib/flash-credit/ledger";
import { formatUsd } from "@/lib/money";
import { describePayment, listOrdersForUser, orderNumber } from "@/lib/orders/orders";
import { labelFor } from "@/lib/shaming/labels";
import { getPerDiemMeter, listStreams, settleStreams } from "@/lib/streams/streams";

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
  settleStreams(db, user.id); // every payday that came due, before the balance and history below
  const streams = listStreams(db, user.id);
  const meter = getPerDiemMeter(db, user.id, settings);
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

      <CollapsibleSection
        id="flash-credit"
        heading={copy.account.flashHeading}
        className="mt-4 grid gap-6 md:grid-cols-[1fr_22rem] md:items-start"
      >
        <div className="flex flex-col gap-4">
          <p className="font-display flex items-center gap-3 uppercase">
            {copy.account.balance}
            <span data-testid="flash-balance">
              <PriceTag priceUsd={balanceUsd} size="lg" />
            </span>
          </p>
          {meter ? (
            <p
              data-testid="account-per-diem"
              className="font-display flex flex-wrap items-center gap-3 uppercase"
            >
              {copy.meter.label}
              {meter.drained ? (
                <span className="bg-hot-pink text-paper px-2 py-1">🏆 {copy.meter.drained}</span>
              ) : (
                <PriceTag priceUsd={meter.leftUsd} />
              )}
            </p>
          ) : null}
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
                    ) : entry.kind === "stream" ? (
                      copy.streams.historyEntry(entry.streamName ?? "")
                    ) : (
                      <Link href={`/orders/${entry.orderId}`} className="underline">
                        {copy.account.entrySpend(orderNumber(entry.orderId!))}
                      </Link>
                    )}
                  </span>
                  <span
                    className={`font-display tabular-nums ${entry.kind === "spend" ? "text-hot-pink" : ""}`}
                  >
                    {entry.kind === "spend" ? "" : "+"}
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
      </CollapsibleSection>

      <section
        id="revenue-streams"
        aria-labelledby="streams-heading"
        className="grid scroll-mt-24 gap-6 md:grid-cols-[1fr_22rem] md:items-start"
      >
        <div className="flex flex-col gap-4">
          <h2 id="streams-heading" className="font-display text-2xl md:text-3xl">
            {copy.streams.heading}
          </h2>
          <p className="font-semibold">{copy.streams.intro}</p>
          <StreamList streams={streams} confirmshaming={settings.confirmshaming} />
        </div>
        <div className="border-ink bg-paper border-4 p-4 shadow-[6px_6px_0_var(--color-ink)]">
          <ConnectStreamForm />
        </div>
      </section>

      <CollapsibleSection
        id="purchase-history"
        heading={copy.account.ordersHeading}
        className="mt-4 flex flex-col gap-4"
      >
        {orders.length === 0 ? (
          <p className="solid-backing p-4">{copy.account.noOrders}</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {orders.map((order) => (
              <li key={order.id} data-testid="order" className="flex flex-col gap-2">
                <p className="font-display flex flex-wrap gap-3 text-sm">
                  <span className="bg-ink text-highlighter px-2 py-0.5">{order.number}</span>
                  <span>{copy.account.placedOn(dateFormat.format(new Date(order.createdAt)))}</span>
                  <span className="bg-highlighter px-2">{describePayment(order.payment)}</span>
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
      </CollapsibleSection>
    </div>
  );
}

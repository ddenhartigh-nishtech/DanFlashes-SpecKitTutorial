import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { LocalTime } from "@/components/LocalTime";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { getAdminOrder } from "@/lib/data/admin-orders";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";
import type { OrderPayment } from "@/lib/orders/orders";

const o = copy.console.orders;
const c = copy.console.customers;

/** The card as the store kept it: brand and last four, nothing more (FR-035). */
function payment(p: OrderPayment): string {
  switch (p.method) {
    case "card":
      return `${p.brand} ending ${p.last4}`;
    case "flash_credit":
      return o.method.flash_credit;
    case "split":
      return `${o.method.flash_credit} ${formatUsd(p.creditUsd)} + ${p.brand} ending ${p.last4} ${formatUsd(p.cardUsd)}`;
  }
}

export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: Pick<PageProps<"/admin/orders/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const view = /^\d+$/.test(id) ? getAdminOrder(getDb(), Number(id)) : null;
  if (!view) {
    return (
      <ConsolePage title={o.title}>
        <p className={ui.card}>{copy.console.notFoundHere}</p>
      </ConsolePage>
    );
  }
  const { order, customer, lines, flashCreditUsd } = view;

  return (
    <ConsolePage
      title={order.number}
      intro={
        <span>
          {o.placed} <LocalTime iso={order.createdAt} /> ·{" "}
          {customer ? (
            <Link href={`/admin/customers/${customer.id}`} className={ui.link}>
              {customer.displayName ?? customer.email}
            </Link>
          ) : (
            o.guest
          )}
        </span>
      }
    >
      <section className={`${ui.card} flex flex-col gap-3`}>
        <h2 className={ui.h2}>{o.lines}</h2>
        <ul className="divide-office-line divide-y text-sm">
          {lines.map((line, i) => (
            <li
              key={i}
              data-testid="order-line"
              className="grid gap-1 py-2 md:grid-cols-[2fr_1.5fr_0.6fr_0.6fr_0.6fr_1fr_1fr] md:items-center md:gap-3"
            >
              <Link href={`/admin/shirts/${line.shirtId}`} className={`${ui.link} font-medium`}>
                {line.name}
              </Link>
              <span>
                <span className="text-office-muted md:hidden">{o.tier}: </span>
                {line.tierName}
              </span>
              <span>
                <span className="text-office-muted">{o.score}: </span>
                <span data-testid="line-score">{line.complexity}</span>
              </span>
              <span>
                <span className="text-office-muted md:hidden">{o.size}: </span>
                {line.size}
              </span>
              <span>
                <span className="text-office-muted md:hidden">{o.quantity}: </span>×{line.quantity}
              </span>
              <span className="tabular-nums">
                <span className="text-office-muted md:hidden">{o.paid}: </span>
                {formatUsd(line.finalPriceUsd)}
              </span>
              <span className="text-office-muted tabular-nums">
                {o.msrp}: {formatUsd(line.msrpUsd)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section className={`${ui.card} flex flex-col gap-2 text-sm`}>
          <h2 className={ui.h2}>{o.addOns}</h2>
          {order.addOns.length === 0 ? (
            <p className={ui.muted}>{o.noAddOns}</p>
          ) : (
            <ul>
              {order.addOns.map((addOn) => (
                <li key={addOn.name} className="flex justify-between gap-2">
                  <span>{addOn.name}</span>
                  <span className="tabular-nums">{formatUsd(addOn.priceUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={`${ui.card} flex flex-col gap-2 text-sm`}>
          <h2 className={ui.h2}>{o.payment}</h2>
          <p data-testid="order-payment">{payment(order.payment)}</p>
          <p>
            <span className="text-office-muted">{o.flashCredit}: </span>
            {formatUsd(flashCreditUsd)}
          </p>
          <p>
            <span className="text-office-muted">{o.total}: </span>
            <span className="font-medium">{formatUsd(order.totalUsd)}</span>
          </p>
          {order.perDiemDrained || order.drainedStreams.length ? (
            <p>
              <span className="text-office-muted">{o.drains}: </span>
              {[
                ...(order.perDiemDrained ? [c.perDiemDrained] : []),
                ...order.drainedStreams.map((d) => c.streamDrained(d.name)),
              ].join(", ")}
            </p>
          ) : null}
        </section>
      </div>
    </ConsolePage>
  );
}

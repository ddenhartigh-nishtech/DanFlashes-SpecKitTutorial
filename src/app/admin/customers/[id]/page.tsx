import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { LocalTime } from "@/components/LocalTime";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { GrantForm } from "@/components/admin/GrantForm";
import { LedgerTable } from "@/components/admin/LedgerTable";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { getCustomer } from "@/lib/data/admin-customers";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";

const c = copy.console.customers;

export default function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Customer params={params} />
    </Suspense>
  );
}

async function Customer({ params }: Pick<PageProps<"/admin/customers/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const detail = /^\d+$/.test(id) ? getCustomer(getDb(), Number(id)) : null;
  if (!detail) {
    return (
      <ConsolePage title={c.title}>
        <p className={ui.card}>{copy.console.notFoundHere}</p>
      </ConsolePage>
    );
  }
  const { customer, orders, entries, streams, drains } = detail;

  return (
    <ConsolePage
      title={customer.displayName ?? c.unnamed}
      intro={
        <span className="break-all">
          {customer.email} · {c.joined} <LocalTime iso={customer.joinedAt} />
        </span>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section className={`${ui.card} flex flex-col gap-3`}>
          <h2 className={ui.h2}>{c.ledgerTitle}</h2>
          <p className="text-sm">
            <span className="text-office-muted">{c.balance}: </span>
            <span data-testid="customer-balance" className="font-medium">
              {formatUsd(customer.balanceUsd)}
            </span>
          </p>
          <LedgerTable entries={entries} />
        </section>
        <GrantForm userId={customer.id} token={randomUUID()} />
      </div>

      <section className={`${ui.card} flex flex-col gap-3`}>
        <h2 className={ui.h2}>{c.ordersTitle}</h2>
        {orders.length === 0 ? (
          <p className={ui.muted}>{c.noOrders}</p>
        ) : (
          <ul className="divide-office-line divide-y text-sm">
            {orders.map((order) => (
              <li
                key={order.id}
                data-testid="customer-order"
                className="flex flex-wrap justify-between gap-2 py-2"
              >
                <Link href={`/admin/orders/${order.id}`} className={ui.link}>
                  {order.number}
                </Link>
                <span className={ui.muted}>
                  <LocalTime iso={order.createdAt} />
                </span>
                <span className="tabular-nums">{formatUsd(order.totalUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <section className={`${ui.card} flex flex-col gap-3`}>
          <h2 className={ui.h2}>{c.streamsTitle}</h2>
          {streams.length === 0 ? (
            <p className={ui.muted}>{c.noStreams}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {streams.map((stream) => (
                <li key={stream.id}>
                  {stream.name}:{" "}
                  {stream.leftUsd === null
                    ? c.notPaidYet
                    : `${formatUsd(stream.leftUsd)} ${c.left}`}
                  {stream.connected ? "" : ` (${c.disconnected})`}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={`${ui.card} flex flex-col gap-3`}>
          <h2 className={ui.h2}>{c.drainsTitle}</h2>
          {drains.length === 0 ? (
            <p className={ui.muted}>{c.noDrains}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {drains.map((drain) => (
                <li key={drain.orderId}>
                  <Link href={`/admin/orders/${drain.orderId}`} className={ui.link}>
                    {drain.number}
                  </Link>
                  :{" "}
                  {[
                    ...(drain.perDiem ? [c.perDiemDrained] : []),
                    ...drain.streams.map(c.streamDrained),
                  ].join(", ")}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ConsolePage>
  );
}

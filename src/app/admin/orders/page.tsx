import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/app/_data/admin";
import { LocalTime } from "@/components/LocalTime";
import { ConsoleLoading, ConsolePage } from "@/components/admin/ConsolePage";
import { ui } from "@/components/admin/ui";
import { copy } from "@/lib/copy";
import { listAllOrders } from "@/lib/data/admin-orders";
import { getDb } from "@/lib/db/client";
import { formatUsd } from "@/lib/money";

const o = copy.console.orders;

export default function OrdersPage() {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Orders />
    </Suspense>
  );
}

async function Orders() {
  await requireAdmin();
  const orders = listAllOrders(getDb());
  return (
    <ConsolePage title={o.title} intro={o.intro}>
      {orders.length === 0 ? (
        <p className={ui.card}>{o.none}</p>
      ) : (
        <ul className={`${ui.card} divide-office-line divide-y`}>
          {orders.map((order) => (
            <li
              key={order.id}
              data-testid="admin-order"
              className="grid gap-1 py-3 text-sm md:grid-cols-[1fr_2fr_1.5fr_1fr_1fr] md:items-center md:gap-3"
            >
              <Link href={`/admin/orders/${order.id}`} className={`${ui.link} font-medium`}>
                {order.number}
              </Link>
              <span className="min-w-0 break-all">
                {order.customer ? (
                  <Link href={`/admin/customers/${order.customer.id}`} className={ui.link}>
                    {order.customer.displayName ?? order.customer.email}
                  </Link>
                ) : (
                  o.guest
                )}
              </span>
              <span className={ui.muted}>
                <LocalTime iso={order.createdAt} />
              </span>
              <span className="tabular-nums">{formatUsd(order.totalUsd)}</span>
              <span className={ui.muted}>{o.method[order.paymentMethod]}</span>
            </li>
          ))}
        </ul>
      )}
    </ConsolePage>
  );
}

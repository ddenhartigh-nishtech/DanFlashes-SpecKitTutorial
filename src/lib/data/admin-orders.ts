/**
 * Orders, for the console (008 FR-034, FR-035, R14). Read-only snapshots: each line keeps the
 * name, tier, score and MSRP from the day it was bought. A card shows as its brand and last four,
 * because that's all the store ever kept.
 */
import { asc, desc, eq } from "drizzle-orm";
import type { Size } from "@/lib/catalog/types";
import type { Db } from "@/lib/db/client";
import { orderItems, orders, shirts, users } from "@/lib/db/schema";
import type { Usd } from "@/lib/money";
import { hydrateOrders, orderNumber, type OrderView } from "@/lib/orders/orders";

export interface OrderCustomer {
  id: number;
  email: string;
  displayName: string | null;
}

export interface AdminOrderRow {
  id: number;
  number: string;
  createdAt: string;
  /** Null for a guest's order (possible while the checkout gate is off). */
  customer: OrderCustomer | null;
  totalUsd: Usd;
  paymentMethod: "card" | "flash_credit" | "split";
}

export interface AdminOrderLine {
  shirtId: number;
  slug: string;
  name: string;
  tierName: string;
  complexity: number;
  size: Size;
  quantity: number;
  finalPriceUsd: Usd;
  msrpUsd: Usd;
}

export interface AdminOrder {
  order: OrderView;
  customer: OrderCustomer | null;
  lines: AdminOrderLine[];
  flashCreditUsd: Usd;
}

const customerColumns = { id: users.id, email: users.email, displayName: users.displayName };

/** Every order, newest first. */
export function listAllOrders(db: Db): AdminOrderRow[] {
  return db
    .select({ order: orders, customer: customerColumns })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .all()
    .map(({ order, customer }) => ({
      id: order.id,
      number: orderNumber(order.id),
      createdAt: order.createdAt,
      customer: customer?.id ? customer : null,
      totalUsd: order.totalUsd,
      paymentMethod: order.paymentMethod,
    }));
}

export function getAdminOrder(db: Db, id: number): AdminOrder | null {
  const row = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!row) return null;
  const customer =
    row.userId === null
      ? null
      : (db.select(customerColumns).from(users).where(eq(users.id, row.userId)).get() ?? null);
  const lines = db
    .select({
      shirtId: orderItems.shirtId,
      slug: shirts.slug,
      name: orderItems.shirtName,
      tierName: orderItems.tierName,
      complexity: orderItems.complexity,
      size: orderItems.size,
      quantity: orderItems.quantity,
      finalPriceUsd: orderItems.finalPriceUsd,
      msrpUsd: orderItems.msrpUsd,
    })
    .from(orderItems)
    .innerJoin(shirts, eq(orderItems.shirtId, shirts.id))
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id))
    .all();
  return { order: hydrateOrders(db, [row])[0], customer, lines, flashCreditUsd: row.flashCreditUsd };
}

/**
 * Order read model. Orders are immutable snapshots; only the image and badge colors are looked up
 * live (by shirt id and tier name), so retired shirts and renamed tiers still render.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { sortTiers } from "@/lib/catalog/tiers";
import type { Size } from "@/lib/catalog/types";
import type { CartView } from "@/lib/cart/cart";
import { copy } from "@/lib/copy";
import { getCatalogShirtsByIds, type ShirtImageView, type TierBadge } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { orderDrains, orderItems, orders, revenueStreams } from "@/lib/db/schema";
import { formatUsd, mul, sub, type Usd } from "@/lib/money";
import { streamName } from "@/lib/streams/streams";
import type { StreamPreset } from "@/lib/streams/types";

export interface SummaryLine {
  slug: string;
  name: string;
  tier: TierBadge;
  size: Size;
  quantity: number;
  unitPriceUsd: Usd;
  lineTotalUsd: Usd;
  image: ShirtImageView | null;
}

export type OrderPayment =
  | { method: "card"; brand: string; last4: string }
  | { method: "flash_credit" }
  | { method: "split"; creditUsd: Usd; cardUsd: Usd; brand: string; last4: string };

export interface DrainedStream {
  streamId: number;
  name: string;
  preset: StreamPreset | null;
}

export interface OrderView {
  id: number;
  number: string;
  createdAt: string;
  subtotalUsd: Usd;
  shippingUsd: Usd;
  taxUsd: Usd;
  totalUsd: Usd;
  payment: OrderPayment;
  /** This order drained his per diem (003 US2). */
  perDiemDrained: boolean;
  /** Every other stream this order emptied (003 US4): one achievement each. */
  drainedStreams: DrainedStream[];
  lines: SummaryLine[];
}

function paymentOf(order: typeof orders.$inferSelect): OrderPayment {
  switch (order.paymentMethod) {
    case "card":
      return { method: "card", brand: order.cardBrand!, last4: order.cardLast4! };
    case "flash_credit":
      return { method: "flash_credit" };
    case "split":
      return {
        method: "split",
        creditUsd: order.flashCreditUsd,
        cardUsd: sub(order.totalUsd, order.flashCreditUsd),
        brand: order.cardBrand!,
        last4: order.cardLast4!,
      };
  }
}

/** The confirmation's and the history's payment line. */
export function describePayment(payment: OrderPayment): string {
  switch (payment.method) {
    case "card":
      return copy.order.paidCard(payment.brand, payment.last4);
    case "flash_credit":
      return copy.order.paidFlash;
    case "split":
      return copy.order.paidSplit(
        formatUsd(payment.creditUsd),
        payment.brand,
        payment.last4,
        formatUsd(payment.cardUsd),
      );
  }
}

export const orderNumber = (id: number) => `DF-${String(id).padStart(6, "0")}`;

export function cartSummaryLines(view: CartView): SummaryLine[] {
  return view.lines.map((line) => ({
    slug: line.shirt.slug,
    name: line.shirt.name,
    tier: line.shirt.tier,
    size: line.size,
    quantity: line.quantity,
    unitPriceUsd: line.shirt.finalPriceUsd,
    lineTotalUsd: line.lineTotalUsd,
    image: line.shirt.images[0] ?? null,
  }));
}

function hydrateOrders(db: Db, rows: (typeof orders.$inferSelect)[]): OrderView[] {
  if (rows.length === 0) return [];
  const items = db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(orderItems.id)
    .all();

  const drains = db
    .select({
      orderId: orderDrains.orderId,
      streamId: revenueStreams.id,
      preset: revenueStreams.preset,
      customName: revenueStreams.customName,
    })
    .from(orderDrains)
    .innerJoin(revenueStreams, eq(orderDrains.streamId, revenueStreams.id))
    .where(
      inArray(
        orderDrains.orderId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(orderDrains.streamId)
    .all();

  const catalog = getCatalogShirtsByIds(db, [...new Set(items.map((i) => i.shirtId))]);
  const tiers = sortTiers(listTiers(db));
  const badge = (name: string): TierBadge => {
    const tier = tiers.find((t) => t.name === name);
    return tier
      ? { ...tier, isBland: tier.minScore === 0 }
      : {
          id: 0,
          name,
          tagline: null,
          badgeBgColor: "#FFFFFF",
          badgeTextColor: "#111111",
          isBland: false,
        };
  };

  return rows.map((order) => ({
    id: order.id,
    number: orderNumber(order.id),
    createdAt: order.createdAt,
    subtotalUsd: order.subtotalUsd,
    shippingUsd: order.shippingUsd,
    taxUsd: order.taxUsd,
    totalUsd: order.totalUsd,
    payment: paymentOf(order),
    perDiemDrained: order.perDiemDrained,
    drainedStreams: drains
      .filter((d) => d.orderId === order.id)
      .map((d) => ({ streamId: d.streamId, name: streamName(d), preset: d.preset })),
    lines: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        slug: catalog.get(item.shirtId)!.slug, // ordered shirts can't be deleted (FK RESTRICT)
        name: item.shirtName,
        tier: badge(item.tierName),
        size: item.size,
        quantity: item.quantity,
        unitPriceUsd: item.finalPriceUsd,
        lineTotalUsd: mul(item.finalPriceUsd, item.quantity),
        image: catalog.get(item.shirtId)?.images[0] ?? null,
      })),
  }));
}

export function getOrderForUser(db: Db, orderId: number, userId: number): OrderView | null {
  const row = db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .get();
  return row ? hydrateOrders(db, [row])[0] : null;
}

export function listOrdersForUser(db: Db, userId: number): OrderView[] {
  const rows = db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .all();
  return hydrateOrders(db, rows);
}

/** The shirts he has ordered, by id (004 FR-008): his own orders only, and none for a guest. */
export function orderedShirtIds(db: Db, userId: number | null): Set<number> {
  if (userId === null) return new Set();
  return new Set(
    db
      .selectDistinct({ shirtId: orderItems.shirtId })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.userId, userId))
      .all()
      .map((row) => row.shirtId),
  );
}

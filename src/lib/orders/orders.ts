/**
 * Order read model. Orders are immutable snapshots; only the image and badge colors are looked up
 * live (by shirt id and tier name), so retired shirts and renamed tiers still render.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { sortTiers } from "@/lib/catalog/tiers";
import type { Size } from "@/lib/catalog/types";
import type { CartView } from "@/lib/cart/cart";
import { getCatalogShirtsByIds, type ShirtImageView, type TierBadge } from "@/lib/data/shirts";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { orderItems, orders } from "@/lib/db/schema";
import { mul, type Usd } from "@/lib/money";

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
  { method: "card"; brand: string; last4: string } | { method: "flash_credit" };

export interface OrderView {
  id: number;
  number: string;
  createdAt: string;
  subtotalUsd: Usd;
  shippingUsd: Usd;
  taxUsd: Usd;
  totalUsd: Usd;
  payment: OrderPayment;
  lines: SummaryLine[];
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
    payment:
      order.paymentMethod === "card"
        ? { method: "card", brand: order.cardBrand!, last4: order.cardLast4! }
        : { method: "flash_credit" },
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

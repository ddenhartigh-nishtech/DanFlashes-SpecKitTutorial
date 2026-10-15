import "server-only";
import { currentUser } from "@/app/_data/request";
import type { StoreSettings } from "@/lib/catalog/types";
import type { ShopperShirt } from "@/lib/data/shirts";
import type { Db } from "@/lib/db/client";
import { orderedShirtIds } from "@/lib/orders/orders";
import { stockLine, type StockLine } from "@/lib/urgency/scarcity";

export type StockOf = (shirt: Pick<ShopperShirt, "id" | "status" | "tier">) => StockLine | null;

/**
 * The current shopper's stock lines (004 R2). His own orders decide "again", so this reads his
 * order history once per request; a guest has none. Request-time; use inside <Suspense>.
 */
export async function loadStockOf(db: Db, settings: StoreSettings): Promise<StockOf> {
  if (!settings.fakeScarcity) return () => null;
  const user = await currentUser();
  const bought = orderedShirtIds(db, user?.id ?? null);
  return (shirt) =>
    stockLine(
      {
        isBland: shirt.tier.isBland,
        active: shirt.status === "active",
        boughtBefore: bought.has(shirt.id),
      },
      settings.fakeScarcity,
    );
}

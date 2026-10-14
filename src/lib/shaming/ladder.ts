/**
 * The bland-shirt shaming ladder (002 US1), built on the server: active, non-bland shirts from least
 * to most complicated, in shopper shape, so the complexity score never reaches the browser
 * (constitution II). The loop itself (`loop.ts`) runs in the browser.
 */
import { toShopperShirt, type CatalogShirt, type ShopperShirt } from "@/lib/data/shirts";
import { cmp } from "@/lib/money";

/** Active, non-bland shirts in ascending complexity, one per score (the pricier one wins a tie). */
export function buildLadder(shirts: readonly CatalogShirt[]): ShopperShirt[] {
  const byScore = new Map<number, CatalogShirt>();
  for (const shirt of shirts) {
    if (shirt.status !== "active" || shirt.tier.isBland) continue;
    const held = byScore.get(shirt.complexity);
    if (!held || cmp(shirt.finalPriceUsd, held.finalPriceUsd) > 0)
      byScore.set(shirt.complexity, shirt);
  }
  return [...byScore.values()].sort((a, b) => a.complexity - b.complexity).map(toShopperShirt);
}

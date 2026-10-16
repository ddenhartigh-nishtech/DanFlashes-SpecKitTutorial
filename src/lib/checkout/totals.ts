/**
 * An order's totals (005 R2). Pure, exact money: the shirts' subtotal plus every add-on he kept,
 * plus shipping and tax. Checkout's live total and placeOrder both come from here, so an order's
 * total always equals its shirts plus its add-ons, to the cent.
 */
import { add, sum, type Usd } from "@/lib/money";

export function orderTotals(input: {
  subtotalUsd: Usd;
  addOnPrices: readonly Usd[];
  shippingUsd: Usd;
  taxUsd: Usd;
}): { addOnsUsd: Usd; totalUsd: Usd } {
  const addOnsUsd = sum([...input.addOnPrices]);
  return {
    addOnsUsd,
    totalUsd: add(add(add(input.subtotalUsd, addOnsUsd), input.shippingUsd), input.taxUsd),
  };
}

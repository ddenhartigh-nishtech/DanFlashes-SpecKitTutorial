/**
 * An order's totals (005 R2). Pure, exact money: the shirts' subtotal, plus every Uniquity
 * Surcharge (007 FR-027), plus every add-on he kept, plus shipping and tax. Checkout's live total
 * and placeOrder both come from here, so an order's total always equals its shirts plus its
 * surcharges plus its add-ons, to the cent (007 SC-010).
 */
import { add, sum, type Usd } from "@/lib/money";

export function orderTotals(input: {
  subtotalUsd: Usd;
  /** Every Uniquity Surcharge in the cart, in all ("0.00" when there's none). */
  surchargeUsd: Usd;
  addOnPrices: readonly Usd[];
  shippingUsd: Usd;
  taxUsd: Usd;
}): { addOnsUsd: Usd; totalUsd: Usd } {
  const addOnsUsd = sum([...input.addOnPrices]);
  return {
    addOnsUsd,
    totalUsd: add(
      add(add(add(input.subtotalUsd, input.surchargeUsd), addOnsUsd), input.shippingUsd),
      input.taxUsd,
    ),
  };
}

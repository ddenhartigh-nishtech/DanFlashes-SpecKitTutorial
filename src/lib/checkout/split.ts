/**
 * Splitting an order between Flash Credit and a card (003 US3, R11). Pure, exact money. Applying
 * credit uses his whole balance, up to the total; the card covers whatever is left.
 */
import { cmp, sub, ZERO, type Usd } from "@/lib/money";

export type PaymentMethod = "card" | "flash_credit" | "split";

export interface Split {
  creditUsd: Usd;
  cardUsd: Usd;
  method: PaymentMethod;
}

export function splitPayment(balanceUsd: Usd, totalUsd: Usd): Split {
  const creditUsd =
    cmp(balanceUsd, ZERO) <= 0 ? ZERO : cmp(balanceUsd, totalUsd) >= 0 ? totalUsd : balanceUsd;
  const cardUsd = sub(totalUsd, creditUsd);
  const method: PaymentMethod =
    cmp(creditUsd, ZERO) === 0 ? "card" : cmp(cardUsd, ZERO) === 0 ? "flash_credit" : "split";
  return { creditUsd, cardUsd, method };
}

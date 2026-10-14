/**
 * Placing an order (research R10). Everything happens in one BEGIN IMMEDIATE transaction, so two
 * checkouts can't interleave: gate → replay → audit → live re-pricing → total check → payment →
 * order + snapshot → empty the cart. Any refusal writes nothing (audit removals excepted).
 */
import { eq } from "drizzle-orm";
import { auditCart, findCartId, loadCheckoutLines, type RemovedLine } from "@/lib/cart/cart";
import { getSettings } from "@/lib/data/settings";
import type { Db } from "@/lib/db/client";
import { cartItems, flashCreditEntries, orderItems, orders } from "@/lib/db/schema";
import { getBalanceUsd } from "@/lib/flash-credit/ledger";
import { add, cmp, isUsdString, sub, sum, ZERO, type Usd } from "@/lib/money";
import { validateFauxCard, type CardErrorCode, type FauxCardInput } from "@/lib/payments/faux-card";
import type { Err, Ok } from "@/lib/result";
import { settleStreams } from "@/lib/streams/streams";

export type PaymentMethod = "card" | "flash_credit";

export interface PlaceOrderInput {
  userId: number | null;
  /** The guest cart cookie; ignored when a user is signed in. */
  cartId: string | null;
  checkoutToken: string;
  /** What the shopper saw. Used only to detect a price change — never charged. */
  expectedTotalUsd: string;
  method: PaymentMethod;
  card?: FauxCardInput;
  now?: Date;
}

export type PlaceOrderResult =
  | Ok<{ orderId: number }>
  | Err<"CART_AUDITED", { removed: RemovedLine[] }>
  | Err<"PRICE_CHANGED", { totalUsd: Usd }>
  | Err<"INSUFFICIENT_FLASH_CREDIT", { balanceUsd: Usd }>
  | Err<"GATE_SIGN_IN_REQUIRED" | "SIGN_IN_REQUIRED" | "CART_EMPTY" | CardErrorCode>;

export function placeOrder(db: Db, input: PlaceOrderInput): PlaceOrderResult {
  return db.transaction(
    (): PlaceOrderResult => {
      const settings = getSettings(db);
      if (settings.checkoutGate && input.userId === null) {
        return { ok: false, code: "GATE_SIGN_IN_REQUIRED" };
      }

      // Revenue-stream paydays that came due are his to spend, in this same transaction (003 FR-006).
      if (input.userId !== null) settleStreams(db, input.userId, input.now ?? new Date());

      const replay = db
        .select()
        .from(orders)
        .where(eq(orders.checkoutToken, input.checkoutToken))
        .get();
      if (replay) {
        return replay.userId === input.userId
          ? { ok: true, orderId: replay.id }
          : { ok: false, code: "CART_EMPTY" };
      }

      const cartId = findCartId(db, { cartId: input.cartId, userId: input.userId });
      if (!cartId) return { ok: false, code: "CART_EMPTY" };
      const removed = auditCart(db, cartId);
      if (removed.length) return { ok: false, code: "CART_AUDITED", removed };

      const lines = loadCheckoutLines(db, cartId);
      if (lines.length === 0) return { ok: false, code: "CART_EMPTY" };

      const subtotalUsd = sum(lines.map((l) => l.lineTotalUsd));
      const shippingUsd = ZERO;
      const taxUsd = ZERO;
      const totalUsd = add(add(subtotalUsd, shippingUsd), taxUsd);
      if (!isUsdString(input.expectedTotalUsd) || cmp(input.expectedTotalUsd, totalUsd) !== 0) {
        return { ok: false, code: "PRICE_CHANGED", totalUsd };
      }

      let card: { brand: string; last4: string } | null = null;
      if (input.method === "card") {
        const checked = validateFauxCard(
          input.card ?? { number: "", expiry: "", cvc: "" },
          input.now,
        );
        if (!checked.ok) return checked;
        card = { brand: checked.brand, last4: checked.last4 };
      } else {
        if (input.userId === null) return { ok: false, code: "SIGN_IN_REQUIRED" };
        const balanceUsd = getBalanceUsd(db, input.userId);
        if (cmp(balanceUsd, totalUsd) < 0) {
          return { ok: false, code: "INSUFFICIENT_FLASH_CREDIT", balanceUsd };
        }
      }

      const { id: orderId } = db
        .insert(orders)
        .values({
          userId: input.userId,
          checkoutToken: input.checkoutToken,
          subtotalUsd,
          shippingUsd,
          taxUsd,
          totalUsd,
          paymentMethod: input.method,
          cardBrand: card?.brand ?? null,
          cardLast4: card?.last4 ?? null,
          flashCreditUsd: input.method === "flash_credit" ? totalUsd : ZERO,
        })
        .returning({ id: orders.id })
        .get();

      for (const line of lines) {
        db.insert(orderItems)
          .values({
            orderId,
            shirtId: line.shirt.id,
            shirtName: line.shirt.name,
            tierName: line.shirt.tier.name,
            complexity: line.shirt.complexity,
            size: line.size,
            quantity: line.quantity,
            finalPriceUsd: line.shirt.finalPriceUsd,
            msrpUsd: line.shirt.msrpUsd,
          })
          .run();
      }

      if (input.method === "flash_credit") {
        db.insert(flashCreditEntries)
          .values({ userId: input.userId!, amountUsd: sub(ZERO, totalUsd), kind: "spend", orderId })
          .run();
      }

      db.delete(cartItems).where(eq(cartItems.cartId, cartId)).run();
      return { ok: true, orderId };
    },
    { behavior: "immediate" },
  );
}

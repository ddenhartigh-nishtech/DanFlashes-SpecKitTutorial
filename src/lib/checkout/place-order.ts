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
import { splitPayment, type Split } from "@/lib/checkout/split";
import { afterOrder, crossedToZero } from "@/lib/streams/meter";
import { getPerDiemMeter, settleStreams } from "@/lib/streams/streams";

export interface PlaceOrderInput {
  userId: number | null;
  /** The guest cart cookie; ignored when a user is signed in. */
  cartId: string | null;
  checkoutToken: string;
  /** What the shopper saw. Used only to detect a price change — never charged. */
  expectedTotalUsd: string;
  /** Apply his Flash Credit: his whole balance, up to the total (003 FR-018). */
  useFlashCredit: boolean;
  /** The credit checkout showed him. Compared with the live split, never trusted (FR-021). */
  expectedCreditUsd?: string;
  /** He confirmed putting the rest on a card (FR-019). */
  confirmSplit?: boolean;
  /** Required whenever a card portion remains. */
  card?: FauxCardInput;
  now?: Date;
}

export type PlaceOrderResult =
  | Ok<{ orderId: number }>
  | Err<"CART_AUDITED", { removed: RemovedLine[] }>
  | Err<"PRICE_CHANGED", { totalUsd: Usd }>
  | Err<"CREDIT_CHANGED" | "SPLIT_CONFIRMATION_REQUIRED", { creditUsd: Usd; cardUsd: Usd }>
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

      // How it's paid (003 US3): recomputed from his live balance, never taken from the client.
      let split: Split = { creditUsd: ZERO, cardUsd: totalUsd, method: "card" };
      if (input.useFlashCredit) {
        if (input.userId === null) return { ok: false, code: "SIGN_IN_REQUIRED" };
        split = splitPayment(getBalanceUsd(db, input.userId), totalUsd);
        const amounts = { creditUsd: split.creditUsd, cardUsd: split.cardUsd };
        if (
          !isUsdString(input.expectedCreditUsd) ||
          cmp(input.expectedCreditUsd, split.creditUsd) !== 0
        ) {
          return { ok: false, code: "CREDIT_CHANGED", ...amounts };
        }
        if (split.method === "split" && !input.confirmSplit) {
          return { ok: false, code: "SPLIT_CONFIRMATION_REQUIRED", ...amounts };
        }
      }

      let card: { brand: string; last4: string } | null = null;
      if (cmp(split.cardUsd, ZERO) > 0) {
        const checked = validateFauxCard(
          input.card ?? { number: "", expiry: "", cvc: "" },
          input.now,
        );
        if (!checked.ok) return checked;
        card = { brand: checked.brand, last4: checked.last4 };
      }

      // The per diem drain (003 R5): does this order take the meter from above $0 to $0?
      const meter = input.userId !== null ? getPerDiemMeter(db, input.userId, settings) : null;
      const perDiemDrained =
        meter !== null && crossedToZero(meter.leftUsd, afterOrder(meter.leftUsd, totalUsd));

      const { id: orderId } = db
        .insert(orders)
        .values({
          userId: input.userId,
          checkoutToken: input.checkoutToken,
          subtotalUsd,
          shippingUsd,
          taxUsd,
          totalUsd,
          paymentMethod: split.method,
          cardBrand: card?.brand ?? null,
          cardLast4: card?.last4 ?? null,
          flashCreditUsd: split.creditUsd,
          perDiemDrained,
          createdAt: (input.now ?? new Date()).toISOString(),
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

      if (cmp(split.creditUsd, ZERO) > 0) {
        db.insert(flashCreditEntries)
          .values({
            userId: input.userId!,
            amountUsd: sub(ZERO, split.creditUsd),
            kind: "spend",
            orderId,
          })
          .run();
      }

      db.delete(cartItems).where(eq(cartItems.cartId, cartId)).run();
      return { ok: true, orderId };
    },
    { behavior: "immediate" },
  );
}

/** Checkout action logic (contracts/actions.md → Checkout). No price is ever read from the form. */
import { field, failure, sessionUser, type ActionState } from "@/lib/actions/state";
import { placeOrder } from "@/lib/checkout/place-order";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { CART_COOKIE, type CookieJar } from "@/lib/http/cookies";
import { formatUsd } from "@/lib/money";

const TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;

export function placeOrderCore(db: Db, jar: CookieJar, form: FormData, now?: Date): ActionState {
  const checkoutToken = field(form, "checkoutToken");
  if (!TOKEN_RE.test(checkoutToken)) return failure("PRICE_CHANGED");

  const result = placeOrder(db, {
    userId: sessionUser(db, jar)?.id ?? null,
    cartId: jar.get(CART_COOKIE) ?? null,
    checkoutToken,
    expectedTotalUsd: field(form, "expectedTotalUsd"),
    useFlashCredit: field(form, "useFlashCredit") === "on",
    expectedCreditUsd: field(form, "expectedCreditUsd"),
    confirmSplit: field(form, "confirmSplit") === "on",
    card: {
      number: field(form, "cardNumber"),
      expiry: field(form, "expiry"),
      cvc: field(form, "cvc"),
    },
    now,
  });

  if (result.ok) return { ok: true, redirectTo: `/orders/${result.orderId}` };
  switch (result.code) {
    case "PRICE_CHANGED":
      return failure(result.code, {
        totalUsd: result.totalUsd,
        message: copy.checkout.priceChanged(formatUsd(result.totalUsd)),
      });
    case "CREDIT_CHANGED":
      return failure(result.code, {
        creditUsd: result.creditUsd,
        cardUsd: result.cardUsd,
        message: copy.checkout.creditChanged(
          formatUsd(result.creditUsd),
          formatUsd(result.cardUsd),
        ),
      });
    case "SPLIT_CONFIRMATION_REQUIRED":
      return failure(result.code, { creditUsd: result.creditUsd, cardUsd: result.cardUsd });
    default:
      return failure(result.code);
  }
}

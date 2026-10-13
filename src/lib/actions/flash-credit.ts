/** Flash Credit action logic (contracts/actions.md → Flash Credit). */
import { field, failure, sessionUser, type ActionState } from "@/lib/actions/state";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { topUp } from "@/lib/flash-credit/ledger";
import type { CookieJar } from "@/lib/http/cookies";

export function topUpCore(db: Db, jar: CookieJar, form: FormData, now?: Date): ActionState {
  const user = sessionUser(db, jar);
  if (!user) return failure("SIGN_IN_REQUIRED");
  const custom = field(form, "customAmountUsd").trim();
  const result = topUp(db, user.id, {
    amountInput: custom || field(form, "amountUsd"),
    card: {
      number: field(form, "cardNumber"),
      expiry: field(form, "expiry"),
      cvc: field(form, "cvc"),
    },
    now,
  });
  return result.ok
    ? { ok: true, balanceUsd: result.balanceUsd, message: copy.account.toppedUp }
    : failure(result.code);
}

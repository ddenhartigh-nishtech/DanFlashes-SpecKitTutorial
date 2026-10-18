/**
 * The console's one money action (008 FR-036): give a customer Flash Credit. The ledger does the
 * real work (grantCredit, test-first); this is the door and the calm answer.
 */
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { copy } from "@/lib/copy";
import { getCustomer } from "@/lib/data/admin-customers";
import type { Db } from "@/lib/db/client";
import { grantCredit } from "@/lib/flash-credit/ledger";
import type { CookieJar } from "@/lib/http/cookies";
import { formatUsd, tryParseUsd } from "@/lib/money";

const c = copy.console.customers;

export function grantFlashCreditCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const userId = id(form, "userId");
  const customer = userId === null ? null : getCustomer(db, userId);
  if (!customer) return refused(c.notFound);

  const result = grantCredit(db, customer.customer.id, {
    amountInput: text(form, "amountUsd"),
    token: text(form, "token"),
  });
  if (!result.ok) {
    return result.code === "INVALID_AMOUNT"
      ? problems([{ field: "amountUsd", message: c.amountRule }])
      : refused(result.code === "INVALID_TOKEN" ? c.tokenMissing : c.notFound);
  }
  const amount = formatUsd(tryParseUsd(text(form, "amountUsd"))!);
  const name = customer.customer.displayName ?? customer.customer.email;
  return saved(c.granted(amount, name));
}

/**
 * The add-ons' actions (008 US5, FR-031): create, edit, retire, restore, reorder. Never delete:
 * past orders keep their own copy of what was paid (order_add_ons).
 */
import { eq } from "drizzle-orm";
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import type { Issue } from "@/lib/catalog/validate";
import { copy } from "@/lib/copy";
import { listAllAddOns } from "@/lib/data/add-ons";
import type { Db } from "@/lib/db/client";
import { addOns } from "@/lib/db/schema";
import type { CookieJar } from "@/lib/http/cookies";
import { cmp, tryParseUsd } from "@/lib/money";

const a = copy.console.addOns;

/** The add-on's fields from a form, or the issues with them. `self` is skipped for the name check. */
function readAddOn(db: Db, form: FormData, self: number | null) {
  const issues: Issue[] = [];
  const name = text(form, "name").trim();
  const pitch = text(form, "pitch").trim();
  const declineLine = text(form, "declineLine").trim();
  const priceUsd = tryParseUsd(text(form, "priceUsd").trim());
  if (name.length < 1 || name.length > 60) issues.push({ field: "name", message: a.nameRule });
  else if (
    listAllAddOns(db).some((o) => o.id !== self && o.name.toLowerCase() === name.toLowerCase())
  ) {
    issues.push({ field: "name", message: a.nameTaken });
  }
  if (pitch.length < 1 || pitch.length > 160) issues.push({ field: "pitch", message: a.pitchRule });
  if (declineLine.length < 1 || declineLine.length > 160) {
    issues.push({ field: "declineLine", message: a.declineRule });
  }
  if (priceUsd === null || cmp(priceUsd, "0.01") < 0) {
    issues.push({ field: "priceUsd", message: a.priceRule });
  }
  return { issues, values: { name, pitch, declineLine, priceUsd: priceUsd ?? "" } };
}

const exists = (db: Db, addOnId: number | null) =>
  addOnId !== null && listAllAddOns(db).some((o) => o.id === addOnId);

export function createAddOnCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const { issues, values } = readAddOn(db, form, null);
  if (issues.length) return problems(issues);
  const last = listAllAddOns(db).at(-1)?.position ?? 0;
  db.insert(addOns)
    .values({ ...values, position: last + 1, active: true })
    .run();
  return saved();
}

export function updateAddOnCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const addOnId = id(form, "id");
  if (!exists(db, addOnId)) return refused(a.notFound);
  const { issues, values } = readAddOn(db, form, addOnId);
  if (issues.length) return problems(issues);
  db.update(addOns).set(values).where(eq(addOns.id, addOnId!)).run();
  return saved();
}

export function setAddOnActiveCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const addOnId = id(form, "id");
  const active = text(form, "active");
  if (!exists(db, addOnId) || (active !== "1" && active !== "0")) return refused(a.notFound);
  db.update(addOns)
    .set({ active: active === "1" })
    .where(eq(addOns.id, addOnId!))
    .run();
  return saved(active === "1" ? a.restoredDone : a.retiredDone);
}

/** Swap with the neighbor in checkout order; every position is rewritten 1..n, so ties settle. */
export function moveAddOnCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const addOnId = id(form, "id");
  const order = listAllAddOns(db);
  const at = order.findIndex((o) => o.id === addOnId);
  if (at < 0) return refused(a.notFound);
  const to = text(form, "direction") === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= order.length) return saved();
  [order[at], order[to]] = [order[to], order[at]];
  db.transaction(() => {
    order.forEach((o, i) => {
      db.update(addOns)
        .set({ position: i + 1 })
        .where(eq(addOns.id, o.id))
        .run();
    });
  });
  return saved();
}

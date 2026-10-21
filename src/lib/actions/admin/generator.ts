/**
 * Dan's generator in the console (007 US3, contracts: the console). Framework-free, so they're
 * tested directly; src/actions/admin.ts wraps them. Each starts at the door (`asAdmin`).
 */
import { eq } from "drizzle-orm";
import { dansChange } from "@/lib/admin/owner-mark";
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { findSessionUser } from "@/lib/auth/session";
import { copy } from "@/lib/copy";
import type { Db } from "@/lib/db/client";
import { shirts } from "@/lib/db/schema";
import { requestCookie, SESSION_COOKIE, type CookieJar } from "@/lib/http/cookies";
import { artForCode } from "@/lib/pattern/dial-view";
import { readRecipe, shirtForRecipe } from "@/lib/pattern/generator-view";
import { materialize } from "@/lib/pattern/materialize";

const g = copy.console.generator;

/**
 * FR-020: a pattern becomes a new shirt, resting and listed, with Dan's name and the score counted
 * from its pattern (constitution II, v4.2.0). A recipe that's already a shirt links to that one.
 */
export function saveGeneratedShirtCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;

  const read = readRecipe({
    score: text(form, "score"),
    style: text(form, "style"),
    seed: text(form, "seed"),
  });
  const issues = read.ok ? [] : [...read.issues];
  const name = text(form, "name").trim();
  if (name.length < 1 || name.length > 80) issues.push({ field: "name", message: g.nameLength });
  if (!read.ok || issues.length) return problems(issues);

  const existing = shirtForRecipe(db, read.recipe);
  if (existing) {
    return {
      ok: false,
      message: g.alreadyMade(existing.name),
      link: { href: `/admin/shirts/${existing.id}`, label: g.openIt },
    };
  }
  const made = materialize(db, read.recipe, { origin: "owner", name });
  if (!made.ok) {
    return made.code === "RULE"
      ? problems(made.issues)
      : problems([{ field: "score", message: g.beyond }]);
  }
  return { ok: true, message: copy.console.saved, id: made.shirtId };
}

/** FR-018, FR-021: a shopper-made shirt goes into the store's listing, or back to one of a kind. */
export function setShirtListedCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const shirtId = id(form, "id");
  const row =
    shirtId === null
      ? undefined
      : db.select({ origin: shirts.origin }).from(shirts).where(eq(shirts.id, shirtId)).get();
  if (!row || shirtId === null) return refused(copy.console.shirts.notFound);
  if (row.origin !== "dial") return refused(g.notDial);
  const listed = text(form, "listed");
  if (listed !== "1" && listed !== "0") return refused(g.badListed);

  db.update(shirts)
    .set({ listed: listed === "1", ...dansChange() })
    .where(eq(shirts.id, shirtId))
    .run();
  return saved(listed === "1" ? g.listedNow : g.unlistedNow);
}

/**
 * The console's preview art (GET /admin/generator/art/[code]): for an admin only, and it draws
 * while the store's pattern generator is off. Null means the store's 404.
 */
export function generatorArt(db: Db, request: Request, code: string): Uint8Array | null {
  const user = findSessionUser(db, requestCookie(request, SESSION_COOKIE));
  if (!user?.isAdmin) return null;
  return artForCode(db, code, { ignoreSwitch: true });
}

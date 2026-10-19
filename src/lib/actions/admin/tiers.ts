/**
 * Saving the tiers (008 US5, R9): the whole set at once, because bands depend on each other. It's
 * refused if BLAND moves, a rule breaks, or any shirt would break a catalog rule under the new
 * bands (R10). Then updates, inserts and deletes land in one transaction.
 */
import { eq } from "drizzle-orm";
import { checkCatalog } from "@/lib/admin/catalog-check";
import { asAdmin, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { asTiers, validateTierEdit, type TierDraft } from "@/lib/admin/tiers";
import { copy } from "@/lib/copy";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { complexityTiers } from "@/lib/db/schema";
import type { CookieJar } from "@/lib/http/cookies";

const t = copy.console.tiers;

/** The editor's JSON as drafts, or null when it isn't the shape the editor sends. */
function readDrafts(raw: string): TierDraft[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const drafts: TierDraft[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return null;
    const d = item as Record<string, unknown>;
    if (
      (d.id !== undefined && typeof d.id !== "number") ||
      typeof d.name !== "string" ||
      (d.tagline !== null && d.tagline !== undefined && typeof d.tagline !== "string") ||
      typeof d.minScore !== "number" ||
      typeof d.badgeBgColor !== "string" ||
      typeof d.badgeTextColor !== "string"
    ) {
      return null;
    }
    const tagline = typeof d.tagline === "string" && d.tagline.trim() ? d.tagline.trim() : null;
    drafts.push({
      ...(d.id !== undefined ? { id: d.id as number } : {}),
      name: d.name.trim(),
      tagline,
      minScore: d.minScore,
      badgeBgColor: d.badgeBgColor,
      badgeTextColor: d.badgeTextColor,
    });
  }
  return drafts;
}

export function saveTiersCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const drafts = readDrafts(text(form, "tiers"));
  if (!drafts) return refused(t.badForm);

  return db.transaction(() => {
    const current = listTiers(db);
    const issues = validateTierEdit(current, drafts);
    if (issues.length) return problems(issues);
    const broken = checkCatalog(db, { tiers: asTiers(drafts) });
    if (broken.length) return refused(t.breaks, broken);

    const kept = drafts.filter((d): d is TierDraft & { id: number } => d.id !== undefined);
    const keptIds = new Set(kept.map((d) => d.id));
    for (const tier of current) {
      if (!keptIds.has(tier.id))
        db.delete(complexityTiers).where(eq(complexityTiers.id, tier.id)).run();
    }
    // Names and starts are unique, so park every kept tier first: a swap never collides.
    for (const d of kept) {
      db.update(complexityTiers)
        .set({ name: `__parked_${d.id}`, minScore: 1_000_000_000 + d.id })
        .where(eq(complexityTiers.id, d.id))
        .run();
    }
    for (const { id, ...values } of kept) {
      db.update(complexityTiers).set(values).where(eq(complexityTiers.id, id)).run();
    }
    for (const d of drafts.filter((d) => d.id === undefined)) {
      db.insert(complexityTiers).values(d).run();
    }
    return saved();
  });
}

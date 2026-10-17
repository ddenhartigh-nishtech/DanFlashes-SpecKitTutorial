/**
 * The console's shirt actions (008 US1, contracts/console.md). Framework-free, so they're tested
 * directly; src/actions/admin.ts wraps them. Each one starts at the door (`asAdmin`), re-checks
 * every rule on the server, and writes in one transaction. There is no delete: shirts rest.
 */
import { and, asc, eq } from "drizzle-orm";
import { validateShirt, type Issue, type ShirtDraft } from "@/lib/catalog/validate";
import { asAdmin, id, problems, refused, saved, text, type ConsoleState } from "@/lib/admin/state";
import { copy } from "@/lib/copy";
import { getMediaById } from "@/lib/data/media";
import { getSettings } from "@/lib/data/settings";
import { listTiers } from "@/lib/data/tiers";
import type { Db } from "@/lib/db/client";
import { shirtImages, shirts } from "@/lib/db/schema";
import type { CookieJar } from "@/lib/http/cookies";
import { tryParseUsd } from "@/lib/money";

const s = copy.console.shirts;
type ShirtRow = typeof shirts.$inferSelect;
type EditableFields = Omit<ShirtDraft, "slug" | "status">;

/** The editable fields from a form, or the issues with how they were typed. */
function readFields(form: FormData): { fields?: EditableFields; issues: Issue[] } {
  const issues: Issue[] = [];
  const score = text(form, "complexity").trim();
  if (!/^\d+$/.test(score)) issues.push({ field: "complexity", message: s.scoreFormat });
  const priceRaw = text(form, "finalPriceUsd").trim();
  const price = priceRaw === "" ? null : tryParseUsd(priceRaw);
  if (priceRaw !== "" && price === null) {
    issues.push({ field: "finalPriceUsd", message: s.priceFormat });
  }
  if (issues.length) return { issues };
  return {
    issues,
    fields: {
      name: text(form, "name").trim(),
      style: text(form, "style"),
      complexity: Number(score),
      finalPriceUsd: price,
      description: text(form, "description").trim(),
      featured: form.get("featured") === "on",
    },
  };
}

/** The shirt's rules against the live tiers and tuning (bland price, images, a countable MSRP). */
function check(db: Db, draft: ShirtDraft, imageCount: number): Issue[] {
  return validateShirt(draft, { tiers: listTiers(db), msrp: getSettings(db).msrp, imageCount });
}

function findShirt(db: Db, shirtId: number | null): ShirtRow | undefined {
  return shirtId === null
    ? undefined
    : db.select().from(shirts).where(eq(shirts.id, shirtId)).get();
}

function imagesOf(db: Db, shirtId: number) {
  return db
    .select({ mediaId: shirtImages.mediaId, position: shirtImages.position })
    .from(shirtImages)
    .where(eq(shirtImages.shirtId, shirtId))
    .orderBy(asc(shirtImages.position))
    .all();
}

const now = () => new Date().toISOString();

/** FR-007: a new shirt. Inactive unless it has a main picture and the owner asked for the floor. */
export function createShirtCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;

  const { fields, issues } = readFields(form);
  const slug = text(form, "slug").trim();
  let mainMediaId: number | null = null;
  if (text(form, "mainMediaId").trim() !== "") {
    mainMediaId = id(form, "mainMediaId");
    if (mainMediaId === null || !getMediaById(db, mainMediaId)) {
      issues.push({ field: "mainMediaId", message: s.unknownImage });
      mainMediaId = null;
    }
  }
  if (slug && db.select({ id: shirts.id }).from(shirts).where(eq(shirts.slug, slug)).get()) {
    issues.push({ field: "slug", message: s.slugTaken });
  }
  if (!fields || issues.length) return problems(issues);

  const draft: ShirtDraft = {
    ...fields,
    slug,
    status: form.get("active") === "on" ? "active" : "inactive",
  };
  const ruleIssues = check(db, draft, mainMediaId === null ? 0 : 1);
  if (ruleIssues.length) return problems(ruleIssues);

  const newId = db.transaction(() => {
    const row = db
      .insert(shirts)
      .values({
        ...draft,
        style: draft.style as ShirtRow["style"],
        status: draft.status as ShirtRow["status"],
      })
      .returning({ id: shirts.id })
      .get();
    if (mainMediaId !== null) {
      db.insert(shirtImages).values({ shirtId: row.id, mediaId: mainMediaId, position: 0 }).run();
    }
    return row.id;
  });
  return { ok: true, message: copy.console.saved, id: newId };
}

/** FR-009: edit every field but the URL name, which links in order history depend on. */
export function updateShirtCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const row = findShirt(db, id(form, "id"));
  if (!row) return refused(s.notFound);

  const { fields, issues } = readFields(form);
  if (!fields) return problems(issues);
  const ruleIssues = check(
    db,
    { ...fields, slug: row.slug, status: row.status },
    imagesOf(db, row.id).length,
  );
  if (ruleIssues.length) return problems(ruleIssues);

  db.update(shirts)
    .set({ ...fields, style: fields.style as ShirtRow["style"], updatedAt: now() })
    .where(eq(shirts.id, row.id))
    .run();
  return saved();
}

/** FR-010: rest a shirt (off the floor, still in order history) or put it back on the floor. */
export function setShirtStatusCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const row = findShirt(db, id(form, "id"));
  if (!row) return refused(s.notFound);
  const status = text(form, "status");
  if (status !== "active" && status !== "inactive") return refused(s.badStatus);

  if (status === "active") {
    const ruleIssues = check(db, { ...row, status }, imagesOf(db, row.id).length);
    if (ruleIssues.length) return problems(ruleIssues);
  }
  db.update(shirts).set({ status, updatedAt: now() }).where(eq(shirts.id, row.id)).run();
  return saved(status === "active" ? s.onTheFloor : s.resting);
}

/** FR-024: hang a library picture on a shirt, after the ones it has. */
export function attachImageCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const row = findShirt(db, id(form, "shirtId"));
  if (!row) return refused(s.notFound);
  const mediaId = id(form, "mediaId");
  if (mediaId === null || !getMediaById(db, mediaId)) return refused(s.unknownImage);

  const current = imagesOf(db, row.id);
  if (current.some((image) => image.mediaId === mediaId)) return refused(s.alreadyAttached);
  const position = current.length ? current[current.length - 1].position + 1 : 0;
  db.insert(shirtImages).values({ shirtId: row.id, mediaId, position }).run();
  return saved();
}

/** FR-024: swap a picture with its neighbor. The first picture is the main one. */
export function moveImageCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const row = findShirt(db, id(form, "shirtId"));
  if (!row) return refused(s.notFound);
  const mediaId = id(form, "mediaId");
  const current = imagesOf(db, row.id);
  const at = current.findIndex((image) => image.mediaId === mediaId);
  if (at < 0) return refused(s.unknownImage);
  const to = text(form, "direction") === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= current.length) return saved(); // already at that end

  const [a, b] = [current[at], current[to]];
  const parked = current[current.length - 1].position + 1; // the primary key can't hold both at once
  db.transaction(() => {
    const move = (mediaId: number, position: number) =>
      db
        .update(shirtImages)
        .set({ position })
        .where(and(eq(shirtImages.shirtId, row.id), eq(shirtImages.mediaId, mediaId)))
        .run();
    move(a.mediaId, parked);
    move(b.mediaId, a.position);
    move(a.mediaId, b.position);
  });
  return saved();
}

/** FR-024: take a picture off a shirt. A shirt on the floor keeps at least one. */
export function detachImageCore(db: Db, jar: CookieJar, form: FormData): ConsoleState {
  const gate = asAdmin(db, jar);
  if (gate.refusal) return gate.refusal;
  const row = findShirt(db, id(form, "shirtId"));
  if (!row) return refused(s.notFound);
  const mediaId = id(form, "mediaId");
  const current = imagesOf(db, row.id);
  if (!current.some((image) => image.mediaId === mediaId)) return refused(s.unknownImage);
  if (row.status === "active" && current.length === 1) return refused(s.lastImage);

  db.transaction(() => {
    db.delete(shirtImages)
      .where(and(eq(shirtImages.shirtId, row.id), eq(shirtImages.mediaId, mediaId!)))
      .run();
    // Close the gap, lowest first, so each new position is already free.
    imagesOf(db, row.id).forEach((image, index) => {
      if (image.position !== index) {
        db.update(shirtImages)
          .set({ position: index })
          .where(and(eq(shirtImages.shirtId, row.id), eq(shirtImages.mediaId, image.mediaId)))
          .run();
      }
    });
  });
  return saved();
}

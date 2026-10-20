import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findAbandoned, findStrayFiles, sweep } from "@/lib/admin/sweep";
import { auditIssues } from "@/lib/catalog/audit";
import type { Db, Sqlite } from "@/lib/db/client";
import { getOrderForUser } from "@/lib/orders/orders";
import { materialize } from "@/lib/pattern/materialize";
import type { Recipe } from "@/lib/pattern/recipe";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

/** Each store gets its own pictures folder, so one test's files are never another's strays. */
let dir = "";
const dirs: string[] = [];
function freshFolder() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-sweep-"));
  dirs.push(dir);
  process.env.MEDIA_UPLOADS_DIR = dir;
}
beforeAll(freshFolder);
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

const NOW = new Date("2026-12-01T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const recipe = (score: number): Recipe => ({ score, style: "polo", seed: score });

/** A shopper-made shirt (or Dan's own, with origin "owner"), made `age` days before NOW. */
function made(
  db: Db,
  sqlite: Sqlite,
  score: number,
  age: number,
  origin: "dial" | "owner" = "dial",
) {
  const maker = origin === "dial" ? person(db).id : undefined;
  const result = materialize(db, recipe(score), {
    origin,
    makerUserId: maker,
    name: `Shirt ${score}`,
  });
  if (!result.ok) throw new Error(`not made: ${result.code}`);
  sqlite
    .prepare("UPDATE shirts SET created_at = ?, updated_at = ? WHERE id = ?")
    .run(daysAgo(age), daysAgo(age), result.shirtId);
  return result.shirtId;
}

const mediaOf = (sqlite: Sqlite, shirtId: number) =>
  sqlite
    .prepare(
      "SELECT m.id, m.key FROM shirt_images i JOIN media m ON m.id = i.media_id WHERE i.shirt_id = ?",
    )
    .get(shirtId) as {
    id: number;
    key: string;
  };
const fileOf = (key: string) => path.join(dir, key.replace(/^uploads\//, ""));
const exists = (sqlite: Sqlite, table: string, id: number) =>
  sqlite.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id) !== undefined;

/** One of every kind of shirt (the spec's US2 independent test). */
function store() {
  freshFolder();
  const { db, sqlite } = createSeededTestDb();
  const abandoned = made(db, sqlite, 60, 31);
  const thirtyDays = made(db, sqlite, 61, 30);
  const inACart = made(db, sqlite, 62, 90);
  const ordered = made(db, sqlite, 63, 90);
  const massProduced = made(db, sqlite, 64, 90);
  const dansTouch = made(db, sqlite, 65, 90);
  const dansOwn = made(db, sqlite, 66, 90, "owner");
  const sharedArt = made(db, sqlite, 67, 90);
  const placeholderArt = made(db, sqlite, 68, 90);

  sqlite.exec(`
    INSERT INTO carts (id, user_id) VALUES ('guest-cart', NULL);
    INSERT INTO cart_items (cart_id, shirt_id, size, quantity) VALUES ('guest-cart', ${inACart}, 'M', 1);
    INSERT INTO users (id, email, password_hash) VALUES (900, 'buyer@x.io', 'h');
    INSERT INTO orders (id, user_id, checkout_token, subtotal_usd, total_usd, payment_method, card_brand, card_last4)
      VALUES (900, 900, 'tok-900', '1625.00', '1625.00', 'card', 'Visa', '4242');
    INSERT INTO order_items (order_id, shirt_id, shirt_name, tier_name, complexity, size, quantity, final_price_usd, msrp_usd)
      VALUES (900, ${ordered}, 'Shirt 63', 'Seriously Complicated', 63, 'M', 1, '1625.00', '1625.00');
    UPDATE shirts SET listed = 1 WHERE id = ${massProduced};
    UPDATE shirts SET owner_changed_at = '${daysAgo(2)}' WHERE id = ${dansTouch};
    UPDATE shirts SET status = 'inactive' WHERE id = ${dansOwn};
  `);
  // Two abandoned creations whose pictures something else still needs.
  const shared = mediaOf(sqlite, sharedArt);
  const keeper = sqlite.prepare("SELECT id FROM shirts WHERE origin = 'catalog' LIMIT 1").get() as {
    id: number;
  };
  sqlite
    .prepare("INSERT INTO shirt_images (shirt_id, media_id, position) VALUES (?, ?, 9)")
    .run(keeper.id, shared.id);
  const placeholder = mediaOf(sqlite, placeholderArt);
  sqlite.prepare("UPDATE store_settings SET placeholder_media_id = ?").run(placeholder.id);

  // A library picture no shirt uses, a stray file, and a file that isn't one of ours.
  const libraryOnly = sqlite
    .prepare(
      "INSERT INTO media (key, alt, kind) VALUES ('uploads/00000000-0000-4000-8000-000000000001.png', 'Dan uploaded it', 'shirt') RETURNING id",
    )
    .get() as { id: number };
  fs.writeFileSync(path.join(dir, "00000000-0000-4000-8000-000000000001.png"), "library");
  const stray = "11111111-1111-4111-8111-111111111111.svg";
  fs.writeFileSync(path.join(dir, stray), "<svg/>");
  fs.writeFileSync(path.join(dir, "notes.txt"), "not a picture");

  return {
    db,
    sqlite,
    ids: {
      abandoned,
      thirtyDays,
      inACart,
      ordered,
      massProduced,
      dansTouch,
      dansOwn,
      sharedArt,
      placeholderArt,
    },
    shared,
    placeholder,
    libraryOnly: libraryOnly.id,
    stray,
  };
}

describe("findAbandoned (011 FR-003, FR-005, R3)", () => {
  it("lists only shopper creations nobody wanted, with their age and maker", () => {
    const { db, ids } = store();
    const found = findAbandoned(db, NOW);
    expect(found.map((s) => s.id).sort()).toEqual(
      [ids.abandoned, ids.sharedArt, ids.placeholderArt].sort(),
    );
    expect(found.find((s) => s.id === ids.abandoned)).toMatchObject({
      name: "Shirt 60",
      ageDays: 31,
      maker: expect.stringMatching(/@/),
    });
  });

  it("keeps exactly-30-day-old creations, carts, orders, mass production, Dan's touch and Dan's own", () => {
    const { db, ids } = store();
    const found = findAbandoned(db, NOW).map((s) => s.id);
    for (const kept of [
      ids.thirtyDays,
      ids.inACart,
      ids.ordered,
      ids.massProduced,
      ids.dansTouch,
      ids.dansOwn,
    ]) {
      expect(found).not.toContain(kept);
    }
  });
});

describe("findStrayFiles (011 FR-008, R5)", () => {
  it("names only our files that no library entry refers to", () => {
    const { db, stray } = store();
    expect(findStrayFiles(db, dir)).toEqual([stray]);
  });
});

describe("sweep (011 FR-006–FR-009, R4)", () => {
  it("deletes the abandoned creations with their pictures, and nothing anyone wanted", () => {
    const { db, sqlite, ids, shared, placeholder, libraryOnly, stray } = store();
    const art = mediaOf(sqlite, ids.abandoned);
    const result = sweep(db, { now: NOW, dir });

    expect(result.shirts.map((s) => s.id).sort()).toEqual(
      [ids.abandoned, ids.sharedArt, ids.placeholderArt].sort(),
    );
    expect(result).toMatchObject({ mediaRemoved: 1, filesRemoved: 2 }); // its art, and the stray file
    expect(exists(sqlite, "shirts", ids.abandoned)).toBe(false);
    expect(
      sqlite.prepare("SELECT 1 FROM shirt_images WHERE shirt_id = ?").get(ids.abandoned),
    ).toBeUndefined();
    expect(exists(sqlite, "media", art.id)).toBe(false);
    expect(fs.existsSync(fileOf(art.key))).toBe(false);

    // Pictures something else needs stay: another shirt's, and the store's placeholder.
    for (const keep of [shared, placeholder]) {
      expect(exists(sqlite, "media", keep.id)).toBe(true);
      expect(fs.existsSync(fileOf(keep.key))).toBe(true);
    }
    // Dan's library stays; the stray file goes; files that aren't ours stay.
    expect(exists(sqlite, "media", libraryOnly)).toBe(true);
    expect(fs.existsSync(path.join(dir, stray))).toBe(false);
    expect(fs.existsSync(path.join(dir, "notes.txt"))).toBe(true);

    // Everything else is still there.
    for (const kept of [
      ids.thirtyDays,
      ids.inACart,
      ids.ordered,
      ids.massProduced,
      ids.dansTouch,
      ids.dansOwn,
    ]) {
      expect(exists(sqlite, "shirts", kept)).toBe(true);
    }
  });

  it("leaves a clean catalog, every order whole, and the setting makeable again (SC-004, FR-009)", () => {
    const { db, sqlite, ids } = store();
    sweep(db, { now: NOW, dir });
    expect(
      auditIssues(db).filter((i) => i.level === "error" && !i.text.includes(" images: ")),
    ).toEqual([]);
    const orderedSlug = (
      sqlite.prepare("SELECT slug FROM shirts WHERE id = ?").get(ids.ordered) as { slug: string }
    ).slug;
    expect(getOrderForUser(db, 900, 900)?.lines.map((l) => l.slug)).toEqual([orderedSlug]);
    const again = materialize(db, recipe(60), { origin: "dial", makerUserId: person(db).id });
    expect(again.ok && again.shirtId).not.toBe(ids.abandoned);
    expect(again.ok).toBe(true);
    expect(
      sqlite
        .prepare(
          "SELECT count(*) AS n FROM shirts WHERE recipe = (SELECT recipe FROM shirts WHERE id = ?)",
        )
        .get(again.ok ? again.shirtId : 0),
    ).toEqual({ n: 1 });
  });

  it("does nothing when nothing is abandoned", () => {
    const { db, sqlite } = createSeededTestDb();
    const before = sqlite.prepare("SELECT count(*) AS n FROM shirts").get();
    expect(sweep(db, { now: NOW, dir })).toMatchObject({ shirts: [], mediaRemoved: 0 });
    expect(sqlite.prepare("SELECT count(*) AS n FROM shirts").get()).toEqual(before);
  });
});

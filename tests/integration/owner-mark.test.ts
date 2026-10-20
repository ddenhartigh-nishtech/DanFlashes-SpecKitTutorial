import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setShirtListedCore } from "@/lib/actions/admin/generator";
import {
  attachImageCore,
  detachImageCore,
  moveImageCore,
  setShirtStatusCore,
  updateShirtCore,
} from "@/lib/actions/admin/shirts";
import { makeItMineCore } from "@/lib/actions/dial";
import type { Db, Sqlite } from "@/lib/db/client";
import { buildDial } from "@/lib/pattern/dial-view";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-mark-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A shirt a shopper made at the dial, exactly as Make it mine left it. */
function dialShirt(db: Db, sqlite: Sqlite, step = 40) {
  const made = makeItMineCore(
    db,
    form({ code: buildDial(db, {})!.steps[step].code! }),
    person(db).id,
  );
  if (!made.ok) throw new Error("not made");
  return sqlite.prepare("SELECT * FROM shirts WHERE slug = ?").get(made.slug) as {
    id: number;
    name: string;
    complexity: number;
    style: string;
    description: string;
    owner_changed_at: string | null;
  };
}

const mark = (sqlite: Sqlite, id: number) =>
  (
    sqlite.prepare("SELECT owner_changed_at FROM shirts WHERE id = ?").get(id) as {
      owner_changed_at: string | null;
    }
  ).owner_changed_at;

const ISO = /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

describe("Dan's mark (011 FR-004, R2)", () => {
  it("Make it mine never sets it, making the shirt or finding it again", () => {
    const { db, sqlite } = createSeededTestDb();
    const shirt = dialShirt(db, sqlite);
    expect(shirt.owner_changed_at).toBeNull();
    makeItMineCore(db, form({ code: buildDial(db, {})!.steps[40].code! }), person(db).id);
    expect(mark(sqlite, shirt.id)).toBeNull();
  });

  it.each([
    [
      "saving it in the editor",
      (s: ReturnType<typeof dialShirt>) =>
        form({
          id: String(s.id),
          name: `${s.name} Deluxe`,
          style: s.style,
          complexity: String(s.complexity),
          finalPriceUsd: "",
          description: s.description,
        }),
      updateShirtCore,
    ],
    [
      "resting it",
      (s: ReturnType<typeof dialShirt>) => form({ id: String(s.id), status: "inactive" }),
      setShirtStatusCore,
    ],
    [
      "mass-producing it",
      (s: ReturnType<typeof dialShirt>) => form({ id: String(s.id), listed: "1" }),
      setShirtListedCore,
    ],
    [
      "attaching a picture",
      (s: ReturnType<typeof dialShirt>) => form({ shirtId: String(s.id), mediaId: "1" }),
      attachImageCore,
    ],
  ] as const)("%s marks it as Dan's", (_name, build, action) => {
    const { db, sqlite } = createSeededTestDb();
    const shirt = dialShirt(db, sqlite);
    const { jar } = person(db, { admin: true });
    expect(action(db, jar, build(shirt)).ok).toBe(true);
    expect(mark(sqlite, shirt.id)).toMatch(ISO);
  });

  it("moving or removing a picture marks it too, and one of a kind again keeps the mark", () => {
    const { db, sqlite } = createSeededTestDb();
    const shirt = dialShirt(db, sqlite);
    const { jar } = person(db, { admin: true });
    const own = (
      sqlite.prepare("SELECT media_id FROM shirt_images WHERE shirt_id = ?").get(shirt.id) as {
        media_id: number;
      }
    ).media_id;
    const clear = () =>
      sqlite.prepare("UPDATE shirts SET owner_changed_at = NULL WHERE id = ?").run(shirt.id);

    attachImageCore(db, jar, form({ shirtId: String(shirt.id), mediaId: "1" }));
    clear();
    expect(
      moveImageCore(db, jar, form({ shirtId: String(shirt.id), mediaId: "1", direction: "up" })).ok,
    ).toBe(true);
    expect(mark(sqlite, shirt.id)).toMatch(ISO);
    clear();
    expect(
      detachImageCore(db, jar, form({ shirtId: String(shirt.id), mediaId: String(own) })).ok,
    ).toBe(true);
    expect(mark(sqlite, shirt.id)).toMatch(ISO);
    clear();
    setShirtListedCore(db, jar, form({ id: String(shirt.id), listed: "1" }));
    clear();
    expect(setShirtListedCore(db, jar, form({ id: String(shirt.id), listed: "0" })).ok).toBe(true);
    expect(mark(sqlite, shirt.id)).toMatch(ISO);
  });

  it("a refused action leaves it alone", () => {
    const { db, sqlite } = createSeededTestDb();
    const shirt = dialShirt(db, sqlite);
    const { jar } = person(db, { admin: true });
    expect(setShirtStatusCore(db, jar, form({ id: String(shirt.id), status: "gone" })).ok).toBe(
      false,
    );
    expect(mark(sqlite, shirt.id)).toBeNull();
  });
});

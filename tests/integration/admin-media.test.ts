import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/media/uploads/[file]/route";
import { removeMediaCore, updateMediaAltCore, uploadMediaCore } from "@/lib/actions/admin/media";
import type { Sqlite } from "@/lib/db/client";
import { form } from "../helpers/cookies";
import { createSeededTestDb } from "../helpers/db";
import { SAFE_SVG, png, text } from "../helpers/images";
import { person } from "../helpers/people";

let dir = "";
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "danflashes-uploads-"));
  process.env.MEDIA_UPLOADS_DIR = dir;
});
afterAll(() => {
  delete process.env.MEDIA_UPLOADS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

function setup() {
  const test = createSeededTestDb();
  return { ...test, jar: person(test.db, { admin: true }).jar };
}

function upload(bytes: Uint8Array, name: string, alt = "A shirt with a great many shapes.") {
  const data = new FormData();
  data.set("file", new File([new Uint8Array(bytes)], name));
  data.set("alt", alt);
  return data;
}

const media = (sqlite: Sqlite) =>
  sqlite.prepare("SELECT id, key, alt, kind FROM media ORDER BY id").all() as {
    id: number;
    key: string;
    alt: string;
    kind: string;
  }[];
const files = () => fs.readdirSync(dir).sort();
const serve = (file: string) =>
  GET(new Request(`http://localhost/media/uploads/${file}`), {
    params: Promise.resolve({ file }),
  });

describe("uploadMedia (008 FR-023)", () => {
  it("keeps a high-resolution PNG under a fresh name, with its alt text", async () => {
    const { db, sqlite, jar } = setup();
    const bytes = png(2400, 2400);
    const state = await uploadMediaCore(db, jar, upload(bytes, "fractal.png"));
    expect(state.ok).toBe(true);
    const row = media(sqlite).at(-1)!;
    expect(row).toMatchObject({ kind: "shirt", alt: "A shirt with a great many shapes." });
    expect(row.key).toMatch(/^uploads\/[0-9a-f-]{36}\.png$/);
    const file = row.key.slice("uploads/".length);
    expect(fs.readFileSync(path.join(dir, file)).equals(Buffer.from(bytes))).toBe(true);
  });

  it("never overwrites: the same file twice is two pictures", async () => {
    const { db, sqlite, jar } = setup();
    await uploadMediaCore(db, jar, upload(text(SAFE_SVG), "same.svg"));
    await uploadMediaCore(db, jar, upload(text(SAFE_SVG), "same.svg"));
    const keys = media(sqlite)
      .map((m) => m.key)
      .filter((k) => k.startsWith("uploads/"));
    expect(new Set(keys).size).toBe(2);
  });

  it.each([
    ["a small photo", png(600, 600), "small.png", undefined],
    ["a text file called .png", text("not a picture"), "fake.png", undefined],
    [
      "an SVG with a script",
      text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      "x.svg",
      undefined,
    ],
    ["no alt text", png(2400, 2400), "ok.png", "  "],
    ["alt text that runs long", png(2400, 2400), "ok.png", "x".repeat(201)],
  ])("refuses %s, and saves nothing anywhere", async (_name, bytes, name, alt) => {
    const { db, sqlite, jar } = setup();
    const [rowsBefore, filesBefore] = [media(sqlite), files()];
    const state = await uploadMediaCore(db, jar, upload(bytes, name, alt));
    expect(state.ok).toBe(false);
    expect(media(sqlite)).toEqual(rowsBefore);
    expect(files()).toEqual(filesBefore);
  });

  it("refuses a form with no file", async () => {
    const { db, jar } = setup();
    expect((await uploadMediaCore(db, jar, form({ alt: "Nothing attached." }))).ok).toBe(false);
  });
});

describe("updateMediaAlt and removeMedia (008 FR-025)", () => {
  it("rewords a picture's alt text, within the rules", async () => {
    const { db, sqlite, jar } = setup();
    const id = media(sqlite)[0].id;
    expect(updateMediaAltCore(db, jar, form({ mediaId: String(id), alt: "New words." })).ok).toBe(
      true,
    );
    expect(media(sqlite)[0].alt).toBe("New words.");
    expect(updateMediaAltCore(db, jar, form({ mediaId: String(id), alt: "" })).ok).toBe(false);
    expect(updateMediaAltCore(db, jar, form({ mediaId: "9999", alt: "x" })).ok).toBe(false);
  });

  it("won't remove a picture a shirt uses, or the placeholder", () => {
    const { db, sqlite, jar } = setup();
    const placeholder = media(sqlite).find((m) => m.kind === "placeholder")!;
    const used = media(sqlite).find((m) => m.key === "shirts/geo-riot.svg")!;
    for (const m of [placeholder, used]) {
      expect(removeMediaCore(db, jar, form({ mediaId: String(m.id) })).ok).toBe(false);
    }
    expect(media(sqlite)).toContainEqual(expect.objectContaining({ id: used.id }));
  });

  it("removes an unused upload, file and all; an unused seeded picture leaves public/ alone", async () => {
    const { db, sqlite, jar } = setup();
    await uploadMediaCore(db, jar, upload(text(SAFE_SVG), "spare.svg"));
    const spare = media(sqlite).at(-1)!;
    const file = spare.key.slice("uploads/".length);
    expect(removeMediaCore(db, jar, form({ mediaId: String(spare.id) })).ok).toBe(true);
    expect(media(sqlite).some((m) => m.id === spare.id)).toBe(false);
    expect(fs.existsSync(path.join(dir, file))).toBe(false);

    sqlite
      .prepare("INSERT INTO media (key, alt, kind) VALUES ('shirts/never-used.svg', 'x', 'shirt')")
      .run();
    const seeded = media(sqlite).at(-1)!;
    const publicBefore = fs.readdirSync("public/media/shirts");
    expect(removeMediaCore(db, jar, form({ mediaId: String(seeded.id) })).ok).toBe(true);
    expect(fs.readdirSync("public/media/shirts")).toEqual(publicBefore);
  });
});

describe("GET /media/uploads/[file] (008 R8)", () => {
  it("serves an upload with its type, no sniffing, and a long cache", async () => {
    const { db, sqlite, jar } = setup();
    await uploadMediaCore(db, jar, upload(png(2000, 2000), "served.png"));
    const file = media(sqlite).at(-1)!.key.slice("uploads/".length);
    const res = await serve(file);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toMatch(/immutable/);
    expect((await res.arrayBuffer()).byteLength).toBe(png(2000, 2000).byteLength);
  });

  it("sandboxes an SVG", async () => {
    const { db, sqlite, jar } = setup();
    await uploadMediaCore(db, jar, upload(text(SAFE_SVG), "served.svg"));
    const res = await serve(media(sqlite).at(-1)!.key.slice("uploads/".length));
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(res.headers.get("content-security-policy")).toMatch(/sandbox/);
  });

  it.each([
    ["0b6c2f0e-0000-4000-8000-000000000000.png"],
    ["../test.db"],
    ["..%2F..%2Fsecret"],
    ["x.exe"],
  ])("answers 404 for %s", async (file) => {
    expect((await serve(file)).status).toBe(404);
  });
});

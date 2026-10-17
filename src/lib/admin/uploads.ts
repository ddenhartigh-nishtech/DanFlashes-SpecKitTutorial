/**
 * Where uploaded pictures live (008 R8): on disk, outside `public/` (Next serves only the files that
 * were there at build), served by app/media/uploads/[file]/route.ts. The folder is
 * MEDIA_UPLOADS_DIR, or `uploads/` beside the database file.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { databasePath } from "@/lib/db/client";

export const UPLOAD_PREFIX = "uploads/";

/** A stored upload's file name: a UUID and a known extension, nothing else. */
const FILE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|svg)$/;

export const isUploadFile = (file: string) => FILE_RE.test(file);

/** The uploads folder, resolved at runtime (kept out of the bundler's file tracing, like the database). */
export function uploadsDir(): string {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.MEDIA_UPLOADS_DIR ||
      path.join(path.dirname(databasePath()), "uploads"),
  );
}

const inUploads = (file: string) => path.join(/*turbopackIgnore: true*/ uploadsDir(), file);

/** Write the bytes under a fresh name (never overwriting) and return the media key. */
export function writeUpload(bytes: Uint8Array, ext: string): string {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = `${randomUUID()}.${ext}`;
  fs.writeFileSync(inUploads(file), bytes, { flag: "wx" });
  return `${UPLOAD_PREFIX}${file}`;
}

/** Remove an upload's file, if the key is one of ours. Seeded pictures in public/ are never touched. */
export function removeUpload(key: string): void {
  if (!key.startsWith(UPLOAD_PREFIX)) return;
  const file = key.slice(UPLOAD_PREFIX.length);
  if (isUploadFile(file)) fs.rmSync(inUploads(file), { force: true });
}

/** An upload's bytes, or null for anything that isn't a stored upload. */
export function readUpload(file: string): Buffer | null {
  if (!isUploadFile(file)) return null;
  try {
    return fs.readFileSync(inUploads(file));
  } catch {
    return null;
  }
}

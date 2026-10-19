/**
 * Uploaded pictures (008 R8). Next serves only the public/ files that existed at build, so uploads
 * live in the uploads folder and come out through here: only stored names, the right type, never
 * sniffed, cached for good (a name is never reused), and an SVG sandboxed as a second lock.
 */
import { contentTypeOf } from "@/lib/admin/media-files";
import { readUpload } from "@/lib/admin/uploads";

export async function GET(_request: Request, { params }: RouteContext<"/media/uploads/[file]">) {
  const { file } = await params;
  const bytes = readUpload(file);
  const type = contentTypeOf(file);
  if (!bytes || !type) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
  };
  if (type === "image/svg+xml") {
    headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }
  return new Response(new Uint8Array(bytes), { headers });
}

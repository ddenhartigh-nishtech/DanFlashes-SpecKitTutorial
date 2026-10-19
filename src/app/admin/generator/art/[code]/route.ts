/**
 * The console generator's preview art (007, contracts: the console): for an admin only, and it
 * draws while the store's pattern generator is off. Anyone else gets a plain 404.
 */
import { getDb } from "@/lib/db/client";
import { generatorArt } from "@/lib/actions/admin/generator";

export async function GET(
  request: Request,
  { params }: RouteContext<"/admin/generator/art/[code]">,
) {
  const { code } = await params;
  const svg = generatorArt(getDb(), request, code);
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(svg), {
    headers: { "Content-Type": "image/svg+xml", "X-Content-Type-Options": "nosniff" },
  });
}

/**
 * A recipe's art (007, contracts: the dial's preview): a made shirt's stored art, or the
 * generator's. The store's 404 for anything else, and while the pattern generator is off.
 */
import { getDb } from "@/lib/db/client";
import { artForCode } from "@/lib/pattern/dial-view";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/how-complicated/art/[code]">,
) {
  const { code } = await params;
  const svg = artForCode(getDb(), code);
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(svg), {
    headers: { "Content-Type": "image/svg+xml", "X-Content-Type-Options": "nosniff" },
  });
}

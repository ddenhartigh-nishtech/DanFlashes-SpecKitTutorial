import "server-only";
import { connection } from "next/server";
import { switchOffCss } from "@/lib/awesome/switches";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";

/**
 * Extreme Awesomeness (006 R4): the owner's switches, read at request time inside the layout's
 * <Suspense>. A switch that's off arrives as CSS with the page, so it's undone before any script
 * runs.
 */
export async function AwesomeIsland() {
  await connection();
  const css = switchOffCss(getSettings(getDb()));
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}

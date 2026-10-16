import "server-only";
import { connection } from "next/server";
import { PipesBackground } from "@/components/PipesBackground";
import { switchOffCss } from "@/lib/awesome/switches";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";

/**
 * Extreme Awesomeness (006 R4): the owner's switches, read at request time inside the layout's
 * <Suspense>. A switch that's off arrives as CSS with the page, so it's undone before any script
 * runs. The pipes' canvas is mounted only while their switch is on (US2).
 */
export async function AwesomeIsland() {
  await connection();
  const settings = getSettings(getDb());
  const css = switchOffCss(settings);
  return (
    <>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {settings.pipesBackground ? <PipesBackground /> : null}
    </>
  );
}

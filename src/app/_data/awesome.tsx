import "server-only";
import { connection } from "next/server";
import { PipesBackground } from "@/components/PipesBackground";
import { StrobeClock } from "@/components/StrobeClock";
import { switchOffCss } from "@/lib/awesome/switches";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";

/**
 * Extreme Awesomeness (006 R4): the owner's switches, read at request time inside the layout's
 * <Suspense>. A switch that's off arrives as CSS with the page, so it's undone before any script
 * runs. The strobe's clock (US1) and the pipes' canvas (US2) are mounted only while their switches
 * are on.
 */
export async function AwesomeIsland() {
  await connection();
  const settings = getSettings(getDb());
  const css = switchOffCss(settings);
  return (
    <>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {settings.flashMode ? <StrobeClock /> : null}
      {settings.pipesBackground ? <PipesBackground /> : null}
    </>
  );
}

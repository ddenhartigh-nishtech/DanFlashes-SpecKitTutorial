import "server-only";
import { connection } from "next/server";
import { PssbLoader } from "@/components/PssbLoader";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";

/**
 * PSSB's place on the page (012 FR-018, FR-021, R8), read at request time inside the layout's
 * <Suspense>. While his switch is on, the page keeps 80 px clear at the bottom for his launcher, and
 * the purchase pop-ups sit above it. The CSS arrives with the page, so nothing jumps when the chat
 * itself loads, after the page (FR-022).
 */
const CLEARANCE = `
main { padding-bottom: 5rem; }
@media (min-width: 48rem) { [data-testid="purchase-pop"] { bottom: 5.25rem; } }
`;

export async function PssbIsland() {
  await connection();
  if (!getSettings(getDb()).pushySalesBot) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CLEARANCE }} />
      <PssbLoader />
    </>
  );
}

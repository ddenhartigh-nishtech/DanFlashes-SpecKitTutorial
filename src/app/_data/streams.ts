import "server-only";
import { currentUser } from "@/app/_data/request";
import { getSettings } from "@/lib/data/settings";
import { getDb } from "@/lib/db/client";
import { getDrainPops, getPerDiemMeter, settleStreams } from "@/lib/streams/streams";

/**
 * The bottom-left corner for the signed-in shopper (003 US2, R13): his per diem gauge and the GONE
 * pops, or null. Settles first, so a top-off that came due shows up on the very next page.
 * Request-time; render inside <Suspense>.
 */
export async function loadDrainCorner() {
  const user = await currentUser();
  if (!user) return null;
  const db = getDb();
  const settings = getSettings(db);
  if (!settings.perDiemDrain) return null;
  settleStreams(db, user.id);
  return {
    meter: getPerDiemMeter(db, user.id, settings),
    pops: getDrainPops(db, user.id, settings) ?? [],
  };
}

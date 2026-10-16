/** npm run db:seed — insert the demo catalog (idempotent: never overwrites existing rows). */
import { openDatabase } from "@/lib/db/client";
import { seedCatalog } from "@/lib/data/seed";
import { SEED } from "./seed-data";

const { sqlite, db } = openDatabase();
try {
  const counts = seedCatalog(db, SEED);
  console.log(
    `Seeded: ${counts.tiers} tiers, ${counts.media} media, ${counts.shirts} shirts, ${counts.addOns} add-ons (existing rows skipped).`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  sqlite.close();
}

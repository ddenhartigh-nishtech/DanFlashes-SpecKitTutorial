/**
 * npm run db:reset [-- --no-backup] — back up, delete, migrate, and seed a clean database: the demo
 * catalog plus the demo shopper (Demo Dan), so a reset never logs you out of the demo.
 */
import { backupDatabaseFile, deleteDatabaseFiles } from "@/lib/db/backup";
import { databasePath, openDatabase } from "@/lib/db/client";
import { ensureDemoShopper } from "@/lib/data/demo-shopper";
import { seedCatalog } from "@/lib/data/seed";
import { runMigrations } from "@/lib/db/migrate";
import { DEMO_SHOPPER, SEED } from "./seed-data";

async function main() {
  const file = databasePath();
  if (!process.argv.includes("--no-backup")) {
    const backup = await backupDatabaseFile(file);
    if (backup) console.log(`Backed up to ${backup}`);
  }
  deleteDatabaseFiles(file);
  const { sqlite, db } = openDatabase(file);
  try {
    runMigrations(db);
    const counts = seedCatalog(db, SEED);
    await ensureDemoShopper(db, DEMO_SHOPPER);
    console.log(
      `Reset ${file}: ${counts.tiers} tiers, ${counts.media} media, ${counts.shirts} shirts, ` +
        `and ${DEMO_SHOPPER.email} / ${DEMO_SHOPPER.password}.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

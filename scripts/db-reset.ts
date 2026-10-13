/** npm run db:reset [-- --no-backup] — back up, delete, migrate, and seed a clean database. */
import { backupDatabaseFile, deleteDatabaseFiles } from "@/lib/db/backup";
import { databasePath, openDatabase } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { seedCatalog } from "@/lib/data/seed";
import { SEED } from "./seed-data";

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
    console.log(
      `Reset ${file}: ${counts.tiers} tiers, ${counts.media} media, ${counts.shirts} shirts.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

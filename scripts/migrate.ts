/** npm run db:migrate — back up first, then apply pending migrations (structure only). */
import { backupDatabaseFile } from "@/lib/db/backup";
import { databasePath, openDatabase } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

async function main() {
  const file = databasePath();
  const backup = await backupDatabaseFile(file);
  console.log(
    backup ? `Backed up to ${backup}` : `No database yet at ${file}; nothing to back up.`,
  );
  const { sqlite, db } = openDatabase(file);
  try {
    runMigrations(db);
    console.log(`Migrated ${file}`);
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

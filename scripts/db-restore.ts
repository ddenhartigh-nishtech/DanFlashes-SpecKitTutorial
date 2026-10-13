/** npm run db:restore -- backups/<file>.db — safety backup, then replace the database. */
import { restoreDatabaseFile } from "@/lib/db/backup";
import { databasePath } from "@/lib/db/client";

const backupFile = process.argv[2];
if (!backupFile) {
  console.error("Usage: npm run db:restore -- backups/<file>.db   (stop the dev server first)");
  process.exit(1);
}

restoreDatabaseFile(backupFile, databasePath())
  .then((safety) => {
    if (safety) console.log(`Safety backup of the previous database: ${safety}`);
    console.log(`Restored ${databasePath()} from ${backupFile}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

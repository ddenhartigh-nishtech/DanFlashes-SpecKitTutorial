/** npm run db:backup — timestamped copy into backups/ (safe while the app is running). */
import { backupDatabaseFile } from "@/lib/db/backup";
import { databasePath } from "@/lib/db/client";

backupDatabaseFile(databasePath())
  .then((file) => console.log(file ? `Backed up to ${file}` : "No database to back up."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

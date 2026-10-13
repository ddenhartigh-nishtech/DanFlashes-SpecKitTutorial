/** npm run catalog:audit — errors exit 1; warnings print and exit 0. */
import { auditCatalog } from "@/lib/catalog/audit";
import { databasePath, openDatabase } from "@/lib/db/client";

const { sqlite, db } = openDatabase();
try {
  const { errors, warnings } = auditCatalog(db);
  for (const e of errors) console.log(`ERROR    ${e}`);
  for (const w of warnings) console.log(`WARNING  ${w}`);
  console.log(`\n${databasePath()}: ${errors.length} errors, ${warnings.length} warnings`);
  process.exitCode = errors.length ? 1 : 0;
} finally {
  sqlite.close();
}

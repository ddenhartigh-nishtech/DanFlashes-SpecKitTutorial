/**
 * npm run shirts:sweep, and npm run shirts:sweep:delete (the same with --yes) (011 FR-006, R6). Lists the abandoned creations (shopper-made
 * shirts nobody bought, in no cart, untouched by Dan, over 30 days old) and the stray picture files.
 * Run plainly, it changes nothing. With --yes it backs the database up first, then deletes them.
 */
import { ABANDONED_AFTER_DAYS, findAbandoned, findStrayFiles, sweep } from "@/lib/admin/sweep";
import { uploadsDir } from "@/lib/admin/uploads";
import { backupDatabaseFile } from "@/lib/db/backup";
import { databasePath, openDatabase } from "@/lib/db/client";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

async function main() {
  const yes = process.argv.includes("--yes");
  const file = databasePath();
  const dir = uploadsDir();
  const { sqlite, db } = openDatabase();
  try {
    console.log(`Database: ${file}`);
    console.log(`Pictures: ${dir}\n`);
    const now = new Date();
    const shirts = findAbandoned(db, now);
    const strays = findStrayFiles(db, dir);
    if (shirts.length === 0 && strays.length === 0) {
      console.log("Nothing to sweep.");
      return;
    }

    console.log(
      `${plural(shirts.length, "abandoned creation")} (shopper-made, never bought, in no cart, untouched by Dan, over ${ABANDONED_AFTER_DAYS} days old):`,
    );
    for (const s of shirts) {
      console.log(
        `  ${s.name}, ${plural(s.ageDays, "day")} old, made by ${s.maker ?? "nobody on file"}`,
      );
    }
    console.log(
      `${plural(strays.length, "stray picture file")} (no library entry refers to them):`,
    );
    for (const f of strays) console.log(`  ${f}`);

    if (!yes) {
      console.log("\nRun `npm run shirts:sweep:delete` to back up and delete them.");
      return;
    }
    const backup = await backupDatabaseFile(file);
    console.log(`\nBacked up to ${backup}`);
    const result = sweep(db, { now, dir });
    console.log(
      `Swept ${plural(result.shirts.length, "shirt")}, ${plural(result.mediaRemoved, "picture")} and ${plural(result.straysRemoved, "stray file")}.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

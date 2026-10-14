import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./client";
import { MIGRATIONS_FOLDER } from "./health";

export { MIGRATIONS_FOLDER };

/** Apply every pending migration in drizzle/ (structure changes only; data is untouched). */
export function runMigrations(db: Db, migrationsFolder: string = MIGRATIONS_FOLDER): void {
  // SQLite can't ALTER a CHECK, so some migrations rebuild tables that other tables reference.
  // That needs foreign keys off, and the pragma is ignored inside drizzle's migration transaction,
  // so switch them off around the whole run and prove every reference still holds afterwards.
  const sqlite = db.$client;
  sqlite.pragma("foreign_keys = OFF");
  try {
    migrate(db, { migrationsFolder });
    const broken = sqlite.pragma("foreign_key_check") as unknown[];
    if (broken.length) {
      throw new Error(`Migration left ${broken.length} broken foreign key reference(s).`);
    }
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}

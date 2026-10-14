import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./client";
import { MIGRATIONS_FOLDER } from "./health";

export { MIGRATIONS_FOLDER };

/** Apply every pending migration in drizzle/ (structure changes only; data is untouched). */
export function runMigrations(db: Db, migrationsFolder: string = MIGRATIONS_FOLDER): void {
  migrate(db, { migrationsFolder });
}

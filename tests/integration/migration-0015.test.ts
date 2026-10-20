import { describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { databaseBefore } from "../helpers/migrations";

const MADE = "2026-09-01T00:00:00.000Z";
const EDITED = "2026-09-05T00:00:00.000Z";

/** Shirts as they stood before Dan's mark existed. */
function oldDatabase() {
  const { sqlite, db } = databaseBefore("0015");
  sqlite.exec(`
    INSERT INTO shirts (id, slug, name, style, complexity, final_price_usd, description, status, origin, recipe, listed, created_at, updated_at) VALUES
      (1, 'untouched', 'Untouched', 'polo', 40, NULL, 'x', 'active', 'dial', 'v1:polo:40:1', 0, '${MADE}', '${MADE}'),
      (2, 'edited', 'Edited', 'polo', 41, NULL, 'x', 'active', 'dial', 'v1:polo:41:1', 0, '${MADE}', '${EDITED}'),
      (3, 'priced', 'Priced', 'polo', 42, '999.00', 'x', 'active', 'dial', 'v1:polo:42:1', 0, '${MADE}', '${MADE}'),
      (4, 'rested', 'Rested', 'polo', 43, NULL, 'x', 'inactive', 'dial', 'v1:polo:43:1', 0, '${MADE}', '${MADE}'),
      (5, 'listed', 'Listed', 'polo', 44, NULL, 'x', 'active', 'dial', 'v1:polo:44:1', 1, '${MADE}', '${MADE}'),
      (6, 'catalog', 'Catalog', 'polo', 45, NULL, 'x', 'active', 'catalog', NULL, 1, '${MADE}', '${EDITED}'),
      (7, 'owner', 'Owner', 'polo', 46, NULL, 'x', 'inactive', 'owner', 'v1:polo:46:1', 1, '${MADE}', '${EDITED}');
  `);
  return { sqlite, db };
}

describe("migration 0015 (Dan's mark)", () => {
  it("marks every shopper creation Dan already changed, and nothing else", () => {
    const { sqlite, db } = oldDatabase();
    const before = sqlite.prepare("SELECT * FROM shirts ORDER BY id").all() as Record<
      string,
      unknown
    >[];
    runMigrations(db);
    const after = sqlite.prepare("SELECT * FROM shirts ORDER BY id").all() as Record<
      string,
      unknown
    >[];
    expect(after.map((s) => [s.slug, s.owner_changed_at])).toEqual([
      ["untouched", null],
      ["edited", EDITED],
      ["priced", MADE],
      ["rested", MADE],
      ["listed", MADE],
      ["catalog", null],
      ["owner", null],
    ]);
    after.forEach((shirt, i) => {
      expect({ ...shirt, owner_changed_at: undefined }).toEqual(before[i]);
    });
  });
});

/** npm run db:seed-demo — the demo shopper, on a database that already exists (idempotent). */
import { ensureDemoShopper } from "@/lib/data/demo-shopper";
import { openDatabase } from "@/lib/db/client";
import { DEMO_SHOPPER } from "./seed-data";

async function main() {
  const { sqlite, db } = openDatabase();
  try {
    const { created } = await ensureDemoShopper(db, DEMO_SHOPPER);
    console.log(
      created
        ? `Created ${DEMO_SHOPPER.email} / ${DEMO_SHOPPER.password}: $10,000.00 Flash Credit and one past order.`
        : `${DEMO_SHOPPER.email} already exists; left untouched.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

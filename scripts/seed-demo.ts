/** npm run db:seed-demo — the demo shopper and owner, on a database that already exists (idempotent). */
import { ensureDemoOwner, ensureDemoShopper } from "@/lib/data/demo-shopper";
import { openDatabase } from "@/lib/db/client";
import { DEMO_OWNER, DEMO_SHOPPER } from "./seed-data";

async function main() {
  const { sqlite, db } = openDatabase();
  try {
    const { created } = await ensureDemoShopper(db, DEMO_SHOPPER);
    console.log(
      created
        ? `Created ${DEMO_SHOPPER.email} / ${DEMO_SHOPPER.password}: $10,000.00 Flash Credit and one past order.`
        : `${DEMO_SHOPPER.email} already exists; left untouched.`,
    );
    const owner = await ensureDemoOwner(db, DEMO_OWNER);
    console.log(
      owner.created
        ? `Created the owner ${DEMO_OWNER.email} / ${DEMO_OWNER.password} (admin).`
        : `${DEMO_OWNER.email} already exists; it's an admin.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/** npm run db:seed-demo — demo shoppers for local development (idempotent). */
import { ensureDemoShopper } from "@/lib/data/demo-shopper";
import { openDatabase } from "@/lib/db/client";

const DEMO = {
  email: "demo@danflashes.local",
  password: "password123",
  displayName: "Demo Dan",
  creditUsd: "10000.00",
  pastOrder: { slug: "fractal-fury", size: "XL" },
};

async function main() {
  const { sqlite, db } = openDatabase();
  try {
    const { created } = await ensureDemoShopper(db, DEMO);
    console.log(
      created
        ? `Created ${DEMO.email} / ${DEMO.password}: $10,000.00 Flash Credit and one past order.`
        : `${DEMO.email} already exists; left untouched.`,
    );
  } finally {
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

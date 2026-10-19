/**
 * npm run admin:grant -- <email> | npm run admin:revoke -- <email> (008 R3): the only way to make
 * an account the owner, or stop it being one. Exits 1 for an unknown email.
 */
import { setAdmin } from "@/lib/auth/admin";
import { openDatabase } from "@/lib/db/client";

const [mode, email] = process.argv.slice(2);
if ((mode !== "grant" && mode !== "revoke") || !email) {
  console.error("Usage: npm run admin:grant -- <email>  |  npm run admin:revoke -- <email>");
  process.exit(1);
}

const { sqlite, db } = openDatabase();
try {
  const on = mode === "grant";
  const result = setAdmin(db, email, on);
  if (!result.ok) {
    console.error(`No account with the email ${email}.`);
    process.exitCode = 1;
  } else {
    const state = on ? "an admin" : "not an admin";
    console.log(result.changed ? `${email} is now ${state}.` : `${email} was already ${state}.`);
  }
} finally {
  sqlite.close();
}

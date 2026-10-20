/**
 * After every e2e run, passing or failing (011 FR-002): empty the suite's own pictures folder, and
 * fail the run if it changed the real store's (FR-001, SC-001).
 */
import fs from "node:fs";
import { emptyE2eUploads, listing, REAL_LISTING, REAL_UPLOADS } from "../../scripts/e2e-uploads";

export default function globalTeardown() {
  emptyE2eUploads();
  if (!fs.existsSync(REAL_LISTING)) return;
  const before = JSON.parse(fs.readFileSync(REAL_LISTING, "utf8")) as string[];
  fs.rmSync(REAL_LISTING, { force: true });
  const after = listing(REAL_UPLOADS);
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    throw new Error(
      `The e2e run changed data/uploads/ (the real store's pictures): ${before.length} files before, ${after.length} after.`,
    );
  }
}

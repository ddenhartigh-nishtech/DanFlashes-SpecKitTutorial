/**
 * The e2e suite's own pictures folder (011 R1): `data/e2e-uploads`, emptied before every run (here,
 * first in the web server's command) and after it (tests/e2e/global-teardown.ts). It also notes
 * what the real store's folder holds, so the teardown can prove the run left it alone.
 */
import fs from "node:fs";
import path from "node:path";

export const E2E_UPLOADS = path.resolve("data/e2e-uploads");
export const REAL_UPLOADS = path.resolve("data/uploads");
export const REAL_LISTING = path.resolve("data/e2e-uploads.before.json");

export const listing = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []);

export function emptyE2eUploads(): void {
  fs.rmSync(E2E_UPLOADS, { recursive: true, force: true });
  fs.mkdirSync(E2E_UPLOADS, { recursive: true });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  emptyE2eUploads();
  fs.writeFileSync(REAL_LISTING, JSON.stringify(listing(REAL_UPLOADS)));
  console.log(`Emptied ${path.relative(process.cwd(), E2E_UPLOADS)}`);
}

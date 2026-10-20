import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  // Every browser drives one single-threaded production server that also runs pure-JS bcrypt
  // (cost 12) on each sign-up. At 7 workers (half of 14 cores) a burst of sign-ups stalled pages
  // past the 15 s expect timeout, failing a different old test each run (007 review). Four keeps
  // the server responsive.
  workers: 4,
  // Real bcrypt (cost 12) under two parallel browsers needs headroom; 5s flaked at ~3.7s actions.
  expect: { timeout: 15_000 },
  // Journeys span many pages plus real bcrypt; the no-score audit alone takes ~30s.
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: "admin/**" },
    { name: "phone", use: { ...devices["Pixel 7"] }, testIgnore: "admin/**" },
    // The owner's console (008 R15) changes shared state (switches, tiers, prices), so it runs
    // after every shopper journey, one spec at a time, desktop then phone.
    {
      name: "admin-desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "admin/**/*.spec.ts",
      dependencies: ["desktop", "phone"],
      workers: 1,
    },
    {
      name: "admin-phone",
      use: { ...devices["Pixel 7"] },
      testMatch: "admin/**/*.spec.ts",
      dependencies: ["admin-desktop"],
      workers: 1,
    },
  ],
  // A production build: no on-demand compilation (deterministic timing), and `verify` gets a
  // real `next build` — which is where Cache Components reports prerendering mistakes.
  webServer: {
    // The suite keeps its pictures in data/e2e-uploads, emptied first and again in the teardown, so
    // a run never touches the real store's data/uploads (011 R1).
    command: `npx tsx scripts/e2e-uploads.ts && npm run db:reset -- --no-backup && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_PATH: "data/e2e.db",
      MEDIA_UPLOADS_DIR: "data/e2e-uploads",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});

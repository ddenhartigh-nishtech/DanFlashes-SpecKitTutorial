# Research: Housekeeping

## R1 — The test suite's own folder

- **Decision**: the Playwright web server sets `MEDIA_UPLOADS_DIR=data/e2e-uploads`, beside
  `data/e2e.db`. `scripts/e2e-uploads.ts` empties it:
  - before the run, as the web server command's first step, before `db:reset`
  - after the run, as Playwright's `globalTeardown`, which runs whether tests pass or fail
- **Rationale**: `uploadsDir()` already honors `MEDIA_UPLOADS_DIR` (008 R8), so no app code changes.
  Cleaning before the run covers an interrupted earlier run (FR-002). The real folder,
  `data/uploads/`, is never named, so nothing the suite does can reach it (FR-001).
- **Alternative**: put the e2e database somewhere else, so `uploads/` beside it moves too. Rejected:
  every e2e spec reads `data/e2e.db` by path.
- **Vitest**: integration tests already use temp folders (`MEDIA_UPLOADS_DIR` per file). Unchanged.

## R2 — Dan's mark

- **Decision**: a new column, `shirts.owner_changed_at` (text, NULL until Dan changes the shirt).
  - Every console action that changes a shirt stamps it: `updateShirtCore`, `setShirtStatusCore`,
    `setShirtListedCore`, `attachImageCore`, `moveImageCore` and `detachImageCore`.
  - Store actions never do. That includes Make it mine claiming a maker.
  - It's stamped on every origin (harmless on catalog and owner shirts). Only dial shirts consult it.
- **Backfill** (migration 0015): a dial shirt whose `updated_at` differs from its `created_at`, or
  that has a final price, is resting, or is listed, takes `owner_changed_at = updated_at`. Every
  console edit already stamped `updated_at`, and 0014 stamped the shirts whose prices it cleared,
  which Dan had priced.
- **Rationale**: an explicit mark can't be set by accident. Inferring "touched" from `updated_at`
  would break the first time another path stamps it.
- **Alternative**: `updated_at <> created_at`. Rejected: it isn't stamped by the listing and picture
  actions today, and nothing stops a future store path from stamping it.

## R3 — Finding abandoned creations

- **Decision**: `findAbandoned(db, now)` in `src/lib/admin/sweep.ts`, a single query. A shirt
  qualifies when:
  - `origin = 'dial'` and `listed = 0`
  - `owner_changed_at IS NULL`
  - `created_at < now − 30 days`
  - there's no `order_items` row and no `cart_items` row for it

  It returns each shirt's id, name, age in days, and maker (email, or none).
- **The grace period**: `ABANDONED_AFTER_DAYS = 30`, a constant. Strictly older than 30 days
  (spec edge case).
- **Rationale**: one query, so the listing and the delete can't disagree (FR-003, FR-005).

## R4 — Deleting, and the pictures

- **Decision**: `sweep(db, { now, dir })`:
  - **In one transaction**: re-run `findAbandoned`; for each shirt, collect its `shirt_images`
    media ids; delete the `shirt_images` rows and the shirt; delete each media row that no other
    `shirt_images` row uses and that isn't `store_settings.placeholder_media_id` (FR-007).
  - **After commit**: remove the deleted media rows' files with `removeUpload`, then the stray files
    (R5).
  - **It returns** what it removed: shirts, media rows, files.
- **Rationale**: if the transaction fails, no file is touched. Files go only once the rows that
  pointed at them are gone.
- **FR-009 for free**: the dial finds a shirt by its recipe. Once the row is gone, the same recipe
  materializes a new shirt.

## R5 — Stray files

- **Decision**: `findStrayFiles(db, dir)`: each file in the uploads folder that `isUploadFile`
  accepts and that no `media.key` names (`uploads/<file>`). Anything else in the folder is left
  alone (spec edge case). Media rows that no shirt uses are kept (FR-008).

## R6 — The command

- **Decision**: `scripts/shirts-sweep.ts`, `npm run shirts:sweep`:
  - **Plain**: prints the abandoned creations (name, age, maker) and the stray files, then "Run with
    --yes to delete them." It changes nothing and doesn't back up.
  - **With `--yes`** and something to delete: `backupDatabaseFile` first (like `db:migrate`), then
    `sweep`, then prints the counts and the backup's path.
  - **With nothing to delete**: says so and stops.
- **Rationale**: the owner sees the list before anything goes (Q3, FR-006, SC-003).

## R7 — Tests

- **Integration** (`tests/integration/sweep.test.ts`): a store holding one of every kind of shirt
  (the spec's US2 independent test). The listing names only the abandoned one. The sweep deletes it
  with its art (shared art and the placeholder stay), keeps the rest, and leaves the catalog check
  and every order intact. The same recipe makes a new shirt afterwards. Covers 30 days exactly vs
  31, stray files vs other files, and library entries no shirt uses.
- **Dan's mark**: each of the six console actions stamps `owner_changed_at`; Make it mine doesn't.
- **Migration 0015**: the backfill rules.
- **The script**: plain changes nothing; `--yes` backs up and deletes (run like
  `catalog-audit.test.ts`).
- **E2E**: the suite's own folder exists while the server runs, and `data/uploads/` is untouched
  across a run (asserted in global teardown).

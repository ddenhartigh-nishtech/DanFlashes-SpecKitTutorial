# Tasks: Housekeeping

**Input**: Design documents from `/specs/011-housekeeping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/housekeeping.md, quickstart.md

**Generated**: 2026-10-20, against constitution v5.0.0 (draft; ratified by merging PR #10)

**Tests**: REQUIRED (constitution VI), and written first. Deleting is irreversible without the
backup, so every "keep" case gets a test before the sweep exists.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Record the baseline. The branch starts at 010's head (d556131, PR #10), last verified at
  1,035 unit and integration tests, 95% line coverage, and 154 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dan's mark, which the sweep relies on.

- [X] T002 [P] Write a failing tests/integration/migration-0015.test.ts (`databaseBefore("0015")`):
  - **New column**: `shirts.owner_changed_at` exists, NULL by default
  - **Backfill**: a dial shirt with `updated_at <> created_at`, one with a final price, one resting
    and one listed each take `owner_changed_at = updated_at`
  - **Left NULL**: an untouched dial shirt, and every catalog and owner shirt
  - **Everything else**: every other column is unchanged
- [X] T003 [P] Add failing "Dan's mark" cases (written as one file, tests/integration/owner-mark.test.ts):
  - each of `updateShirtCore`, `setShirtStatusCore`, `attachImageCore`, `moveImageCore`,
    `detachImageCore` and `setShirtListedCore` stamps `owner_changed_at` on a dial shirt
  - `makeItMineCore` (making it, and claiming a maker) never does
- [X] T004 Add `ownerChangedAt: text("owner_changed_at")` to `shirts` in src/lib/db/schema.ts.
  - Run `npx drizzle-kit generate --name owner_changed`, and append the backfill per data-model.md.
  - Stamp it in the six console actions (src/lib/actions/admin/shirts.ts and
    src/lib/actions/admin/generator.ts). For picture changes, stamp the shirt the picture belongs
    to.
  - T002 and T003 pass.

---

## Phase 3: User Story 1 - Test Runs Clean Up After Themselves (Priority: P1) 🎯 MVP

**Independent Test**: `data/uploads/` holds the same files before and after `npm run verify`, and
`data/e2e-uploads/` is empty afterward.

- [X] T005 [US1] Write scripts/e2e-uploads.ts. It removes `data/e2e-uploads` and recreates it empty,
  and never names `data/uploads`.
- [X] T006 [US1] Update playwright.config.ts:
  - `webServer.env.MEDIA_UPLOADS_DIR = "data/e2e-uploads"`
  - the web server command starts with `npx tsx scripts/e2e-uploads.ts`
  - `globalTeardown: "./tests/e2e/global-teardown.ts"`
- [X] T007 [US1] Write tests/e2e/global-teardown.ts:
  - it empties `data/e2e-uploads`
  - it fails the run if `data/uploads/` changed during it. Compare against a listing written to
    `data/e2e-uploads.before.json` by scripts/e2e-uploads.ts at the start, then delete that listing.

---

## Phase 4: User Story 2 - Sweep Abandoned Creations (Priority: P2)

**Independent Test**: on a store holding every kind of shirt, the plain run lists only the abandoned
one, and `--yes` deletes only it, with its art.

- [X] T008 [P] [US2] Write a failing tests/integration/sweep.test.ts (contracts/housekeeping.md
  tables). Build the store from the seed plus one of each:
  - abandoned (dial, 31 days old)
  - exactly 30 days old
  - in a guest's cart
  - in an order
  - mass-produced
  - marked by Dan
  - owner-made and resting
  - a catalog shirt

  Assert:
  - **The listing**: `findAbandoned` returns only the abandoned one, with its name, age and maker
  - **The delete**: `sweep` deletes it, its `shirt_images` rows, its media row and its file
  - **Shared art**: art also used by another shirt keeps its media row and file; so does the
    placeholder
  - **The library**: an unused library entry stays
  - **Stray files**: a stray `isUploadFile` file goes; a non-matching file stays
  - **Afterward**: `auditIssues` has no errors, every order opens with `getOrderForUser`, and
    materializing the swept recipe makes a new shirt
- [X] T009 [P] [US2] Write a failing tests/integration/shirts-sweep-script.test.ts. Run the script
  against a temp database and folder, the way catalog-audit.test.ts does:
  - **Plain**: lists the shirt and the stray file, and changes nothing (no backup file)
  - **`--yes`**: prints "Backed up to", deletes, and prints the counts
  - **Nothing to sweep**: "Nothing to sweep.", with no backup
- [X] T010 [US2] Implement src/lib/admin/sweep.ts (`ABANDONED_AFTER_DAYS`, `findAbandoned`,
  `findStrayFiles`, `sweep`) per research R3–R5. T008 passes.
- [X] T011 [US2] Implement scripts/shirts-sweep.ts and the `"shirts:sweep"` npm script per R6. It prints the database and the uploads folder it is sweeping first (analysis).
  T009 passes.

---

## Phase 5: Polish

- [X] T012 [P] README: the `shirts:sweep` command (what it keeps, what it deletes, `--yes`, the
  backup), migration 0015, and that test runs keep their own pictures in `data/e2e-uploads/`.
- [X] T013 Run the sweep on a copy of the owner's store: the plain list, then `--yes`. Record what
  it found (expected: no shirts, since the one dial shirt is under 30 days old, and the ~59 stray
  files from earlier test runs). Record in quickstart.md.
- [ ] T014 Run `npm run verify` until it's green, with `data/uploads/` checked by the teardown.
  Record the counts.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T004)** blocks US2. T002 ∥ T003 → T004.
- **US1 (T005–T007)** is independent of the rest.
- **US2 (T008–T011)** needs T004. T008 ∥ T009 → T010 → T011.
- **Polish (T012–T014)** comes last.

## Implementation Strategy

1. **MVP**: US1, so test runs stop adding files.
2. **Then**: Dan's mark, and the sweep.
3. **Then**: verify, converge, and a PR stacked on #10.

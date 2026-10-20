# Implementation Plan: Housekeeping

**Branch**: `011-housekeeping` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-housekeeping/spec.md`

## Summary

1. **The test suite's own folder** (R1): the Playwright web server sets
   `MEDIA_UPLOADS_DIR=data/e2e-uploads`. A small script empties that folder before the server
   starts, and the global teardown empties it again after the run. `data/uploads/`, the real store's
   folder, is never named.
2. **Dan's mark** (R2): migration 0015 adds `shirts.owner_changed_at`, backfilled from what Dan
   already did. Every console action that changes a shirt stamps it.
3. **The sweep** (R3–R6): `src/lib/admin/sweep.ts` finds abandoned creations in one query. It
   deletes them with their pictures in one transaction, then removes their files and any stray
   files. `npm run shirts:sweep` lists them, and with `--yes` backs up and sweeps.

It runs under constitution v5.0.0's II exception (batched into PR #10). It ratifies nothing new.

## Technical Context

**Language/Version**: unchanged (TypeScript on Node 22, Next.js 16.4)

**Primary Dependencies**: unchanged. No new packages.

**Storage**: SQLite. Migration `0015` adds `shirts.owner_changed_at` with its backfill. The sweep
deletes from `shirts`, `shirt_images` and `media`. Files go in `data/uploads/`, and
`data/e2e-uploads/` for the suite. See [data-model.md](./data-model.md).

**Testing**:
- **Vitest**: the sweep against a store holding every kind of shirt, Dan's mark on each console
  action, the migration's backfill, and the script.
- **Playwright**: the global teardown checks that `data/uploads/` is unchanged across the run.

**Target Platform / Project Type**: unchanged (one Next.js web app, plus npm scripts)

**Performance Goals**: none. The sweep is an owner's occasional command over a small catalog.

**Constraints**:
- **Never delete what was wanted**: the constitution II exception, and FR-005.
- **Back up before deleting.**
- **Files only after their rows are gone.**
- **The real uploads folder is never touched by tests.**

**Scale/Scope**:
- 1 migration
- 1 library module and 2 scripts
- the six console shirt actions
- the Playwright config, plus a global teardown

All Technical Context items are resolved. See [research.md](./research.md) (R1–R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution **v5.0.0 (draft, ratified by merging PR #10)**. II's exception for
abandoned creations is what makes deleting allowed at all.

| # | Principle / Rule | How 011 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | No shopper-facing copy changes. A swept shirt's link is the store's ordinary 404. | ✅ | ✅ |
| II | Complexity Is the Price (v5.0.0) | Only abandoned creations, exactly as II defines them, are deleted. Everything Dan made, every mass-produced shirt, and every shirt in an order or cart is kept. Bought shirts stay viewable from order history (order lines block the delete). | ✅ | ✅ |
| III | Relentlessly Vibrant | No catalog content changes. | ✅ | ✅ |
| IV / V | Manipulative / Visual Assault | Nothing changes. | ✅ | ✅ |
| VI | Fully Tested | Integration tests for every "keep" and "sweep" case, the mark, the migration and the script. No money path changes. | ✅ | ✅ |
| VII | Fast | Not on any page path. | ✅ | ✅ |
| VIII | Simple Code | One query, one transaction, one script. It reuses `uploadsDir`, `removeUpload`, `isUploadFile` and `backupDatabaseFile`. | ✅ | ✅ |
| C | Commerce constraints | Orders are never touched. | ✅ | ✅ |
| W | Workflow | A feature branch stacked on 010. Spec → plan → tasks → implement → converge, and a PR. Analyze runs too, though no money is touched, because this is the first feature that deletes data. | ✅ | ✅ |

**Result**: PASS on v5.0.0, pre-research and post-design.

## Project Structure

### Documentation (this feature)

```text
specs/011-housekeeping/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/housekeeping.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
drizzle/0015_owner_changed.sql            # shirts.owner_changed_at + backfill
playwright.config.ts                      # MEDIA_UPLOADS_DIR, clean before the server, globalTeardown
scripts/e2e-uploads.ts                    # empties data/e2e-uploads
scripts/shirts-sweep.ts                   # npm run shirts:sweep [-- --yes]
package.json                              # + "shirts:sweep"
README.md                                 # the command; tests keep their own pictures
src/lib/
├── db/schema.ts                          # shirts.ownerChangedAt
├── admin/sweep.ts                        # findAbandoned, findStrayFiles, sweep
├── actions/admin/shirts.ts               # stamp ownerChangedAt: update, status, images
└── actions/admin/generator.ts            # stamp ownerChangedAt: listed
tests/
├── integration/sweep.test.ts, migration-0015.test.ts, shirts-sweep-script.test.ts
├── integration/admin-shirts.test.ts, admin-generator.test.ts   # the mark
└── e2e/global-teardown.ts
```

**Structure Decision**: the sweep is an owner tool, so it lives beside the console's other read
models in `src/lib/admin/`, with a thin script like `catalog:audit`.

## Complexity Tracking

No constitution violations on v5.0.0.

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| A new `owner_changed_at` column | "Dan touched it" has to be certain before anything is deleted (Q4). | Comparing `updated_at` with `created_at` misses the listing and picture actions, and any future path that stamps `updated_at` would silently protect or expose shirts. |

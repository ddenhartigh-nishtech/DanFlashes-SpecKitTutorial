# Tasks: Gentler Pricing Curve

**Input**: Design documents from `/specs/010-gentler-pricing-curve/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pricing.md, quickstart.md

**Generated**: 2026-10-20, against constitution v5.0.0 (draft; ratified by merging this PR)

**Tests**: REQUIRED (constitution VI), and written first.
- **Pricing is money**, so the MSRP, final-price resolution, the BLAND rule, the migration's money
  checks and the checkout guard are tested before the code changes.
- **The MSRP gets property tests** over at least 1,000 random tunings and scores.
- **Every console action** keeps its place in the 008 door sweep.
- **Each story's journey** gets an e2e. Console journeys run in the admin projects.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story the task belongs to (US1–US3)

---

## Phase 1: Setup

- [X] T001 Record the baseline for the PR. The branch starts at 007's head (72b2d37, PR #9), last
  verified at 1,009 unit and integration tests, 95.04% line coverage, and 150 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the straight-line MSRP, its two dials, the BLAND rule's new threshold, and migration
0014. Every story needs these.

- [X] T002 [P] Rewrite tests/unit/msrp.test.ts to fail against the exponential (contracts/pricing.md):
  - **The table** at `DEFAULT_MSRP_SETTINGS` (`{ basePriceUsd: "50.00", perPointUsd: "25.00" }`):
    0 → `"50.00"`, 2 → `"100.00"`, 10 → `"300.00"`, 130 → `"3300.00"`, 9,000 → `"225050.00"`,
    10,249 → `"256275.00"`, 1,000,000 → `"25000050.00"`
  - **Properties** over at least 1,000 random tunings (base and per point from $0.01 to
    $1,000,000.00) and scores (0 to 10,000,000):
    - the same input gives the same output
    - `msrp(s + 1) − msrp(s)` is exactly the price per point
    - strictly increasing
    - always two decimals
    - with random tier sets too (two to six tiers): every BLAND score's MSRP is less than
      `realShirtStartUsd` (SC-004, analysis C1)
  - **Bad input throws**: a negative, fractional or `NaN` score (`RangeError`), and a malformed
    money string in the settings (`MoneyError`)
  - **`realShirtStartUsd`**:
    - the default tiers → `"300.00"`
    - tiers given out of order → it sorts them
    - Complicated moved to 20 → `"550.00"`
    - BLAND alone → `null`
- [X] T003 [P] Update tests/unit/resolve.test.ts and tests/unit/catalog-validate.test.ts to the new
  dials, failing first:
  - **`resolvePrice`**: Dan's price if set, else the MSRP, under the new dials
  - **`validateSettings`**: requires `msrp.basePriceUsd` and `msrp.perPointUsd`, each a money string
    ≥ $0.01; refuses `"0.00"`, negatives and malformed strings; and rejects the old keys
  - **`validateShirt`'s BLAND rule** against `realShirtStartUsd` (R4):
    - a BLAND shirt at its MSRP passes
    - a hand price of $299.99 passes, and $300.00 is refused with "BLAND shirts must cost less than
      $300.00; this one resolves to $300.00."
    - with Complicated moved to 20, $500.00 passes
    - with BLAND the only tier, nothing is checked
  - **No ceiling**: a score of 1,000,000 is never refused as "too complicated to price"
  - **The seed** (FR-010, analysis C2): tests/integration/catalog-audit.test.ts asserts no seeded
    shirt has a final price
- [X] T004 [P] Write a failing tests/integration/migration-0014.test.ts (`databaseBefore("0014")`).
  Seed the old store with:
  - tuning $300.00 / 10 / 10
  - four owner-priced shirts (catalog, owner and dial origins, one resting) and one without a price
  - a cart with lines
  - three orders: card, Flash Credit, and one with add-ons, a surcharge and a drain

  Then migrate and assert:
  - `msrp_base_price_usd = '50.00'` and `msrp_per_point_usd = '25.00'`, and the three old columns
    are gone
  - every other `store_settings` column is identical (`toMatchObject` against the row read before)
  - every `final_price_usd` is NULL. `updated_at` changed only on the rows that had a price. Every
    other shirt column is identical
  - `orders`, `order_items`, `order_add_ons`, `order_drains`, `carts` and `cart_items` are identical
    to the cent (deep-equal against the rows read before)
  - the CHECKs `store_settings_base_price` and `store_settings_per_point` refuse `'0.00'`, `'-1.00'`
    and `'abc'`
  - `foreign_key_check` is clean
  - `auditIssues(db)` reports no errors on the upgraded store (FR-016, analysis C3)
- [X] T005 Implement the line (research R1, R2, R4), so T002 and T003 pass:
  - **src/lib/catalog/types.ts**: `MsrpSettings = { basePriceUsd: Usd; perPointUsd: Usd }`
  - **src/lib/pricing/msrp.ts**:
    - `msrpUsd(score, settings) = add(basePriceUsd, mul(perPointUsd, score))`, throwing
      `RangeError` for a score that isn't a non-negative integer
    - `DEFAULT_MSRP_SETTINGS = { basePriceUsd: "50.00", perPointUsd: "25.00" }`
    - `realShirtStartUsd(tiers, settings)`
    - the doc comment states the formula
  - **src/lib/money.ts**: remove `scaleByFloat`, and its cases in tests/unit/money.test.ts
  - **src/lib/catalog/validate.ts**:
    - the settings schema takes the two dials (`positiveUsd`)
    - the BLAND rule uses `realShirtStartUsd`, skipping when it's null
    - remove the "too complicated to price" try/catch and its 008 R7 comment
- [X] T006 The columns and the upgrade (R2, R3, data-model.md), so T004 passes:
  - **src/lib/db/schema.ts**: replace `msrpStartPriceUsd`, `msrpAnchorScore` and
    `msrpDoublingInterval` (and their CHECKs) with:
    - `msrpBasePriceUsd`: `msrp_base_price_usd`, text, NOT NULL, default `'50.00'`, CHECK
      `store_settings_base_price`: "a money string, not negative, not `'0.00'`"
    - `msrpPerPointUsd`: `msrp_per_point_usd`, text, NOT NULL, default `'25.00'`, CHECK
      `store_settings_per_point`: the same
  - **The migration**:
    - Run `npx drizzle-kit generate --name gentler_pricing_curve`.
    - Hand-edit the `store_settings` rebuild: copy every other column as it is, and let the two dials
      take their defaults. Add a header comment like 0013's.
    - Append `UPDATE shirts SET final_price_usd = NULL, updated_at = <ISO now> WHERE final_price_usd
      IS NOT NULL`, using the same ISO-8601 format as the `nowIso` default.
  - **src/lib/data/settings.ts**: `getSettings`, `saveSettings` and `saveTuning` read and write the
    two dials only.
  - **scripts/seed-data.ts**: `msrp: { basePriceUsd: "50.00", perPointUsd: "25.00" }`, and Hawaiian
    Tax Return's `finalPriceUsd: null` (FR-010).
  - **tests/fixtures/catalog.ts**: the new dials.
- [X] T007 Sweep the remaining unit and integration tests that name the old dials or hard-code
  exponential prices, until `npm test` is green:
  - tests/integration/admin-door.test.ts, admin-generator.test.ts, admin-settings.test.ts,
    admin-shirts.test.ts, data-catalog.test.ts, materialize.test.ts
  - tests/unit/pattern-dial.test.ts, pattern-generate.test.ts
  - every other file `npm test` names

  Expected prices come from the formula (or `msrpUsd` itself), never pasted from a run.

**Checkpoint**: every price in the store is the straight line, and an upgraded database matches a
fresh one.

---

## Phase 3: User Story 1 - The Reprice (Priority: P1) 🎯 MVP

**Goal**: every shirt sells at $50.00 + $25.00 × its score, Dan's prices are gone, carts follow,
and orders don't move.

**Independent Test**: upgrade a store with owner prices, a cart and orders. Every price is on the
line, no owner price remains, every order is identical, and the cart shows the new prices.

- [X] T008 [P] [US1] Add to tests/integration/place-order-card.test.ts (failing first where it's
  new):
  - **Retune mid-checkout**: view checkout, retune to $40.00 a point, then place at the old
    expected total → `PRICE_CHANGED` with the new total, and nothing is charged
  - **Placing at the new total** succeeds, and `order_items.msrp_usd` snapshots the new MSRP
  - **Carts follow**: a cart line shows the new price on its next `getCartView` (FR-009)
- [X] T009 [P] [US1] Write tests/e2e/straight-line.spec.ts (shopper projects). For every shirt on
  `/shirts` (and the home page's featured shirts), the shown price equals $50.00 + $25.00 × its
  score, read from `data/e2e.db` the way no-score.spec.ts reads scores. No price on those pages
  scrolls sideways at 360px (SC-001, SC-003).
- [X] T010 [US1] Bring the e2e journeys to the new prices, keeping each journey's meaning. Fix
  whichever of these assert a shirt price or rely on one's size, until the shopper projects pass:
  - card-checkout, flash-credit-checkout and split-checkout: a split must still need card money
    beyond the credit, so pick the shirt by its new price
  - zoom-and-cart: the "huge subtotal" uses the most expensive shirt at quantity 99
  - fake-scarcity, roach-motel, add-ons, revenue-streams, per-diem-drain, drain-them-all,
    everything-on, about, pipes, dial

**Checkpoint**: US1 is the MVP. The store reprices, and nothing that was sold changes.

---

## Phase 4: User Story 2 - The Dial Still Climbs (Priority: P2)

**Goal**: the dial's top is 10,249 under any tuning, step 101 is still the joke, and old links open
the same shirts.

**Independent Test**: step the dial 0 → 101. Prices never fall, step 100 is $256,275.00, step 101
can't be bought, and the generator refuses 10,250.

- [X] T011 [P] [US2] Failing tests for the fixed top (R5):
  - **tests/unit/pattern-dial.test.ts**: `maxDialScore()` is 10,249, and `DIAL_MAX_SCORE` is
    exported. `scoreAtStep(step, 10_249)` gives the same scores as before for every step.
  - **tests/unit/pattern-generate.test.ts**: the art budget runs at `DIAL_MAX_SCORE` (under 1 MB).
  - **tests/integration/admin-generator.test.ts**:
    - `generatorPreview` at 10,249 shows MSRP `"256275.00"`
    - at 10,250 it gives `reason: "unpriceable"` with `copy.console.generator.beyond`
  - **tests/integration/materialize.test.ts**: 10,250 → `BEYOND`, under any tuning, including
    $0.01 a point.
- [X] T012 [US2] Implement the fixed top:
  - **src/lib/pattern/dial.ts**:
    - `export const DIAL_MAX_SCORE = 10_249`, with a comment saying where the number came from
    - `maxDialScore()` with no arguments
    - remove `maxPriceableScore` and `ART_MAX_SCORE`
  - **Callers**: update src/lib/pattern/dial-view.ts, src/lib/pattern/materialize.ts,
    src/lib/pattern/generator-view.ts (`readRecipe` refuses above the top),
    src/lib/actions/admin/generator.ts, and src/app/admin/shirts/generate/page.tsx (the slider's
    top comes from `view.maxScore`, so check it's 10,249; analysis U1).
  - **The joke's string**: move "That's too complicated to price, even for Dan." to
    `copy.console.generator.beyond`.
  - T011 passes.
- [X] T013 [US2] Update tests/e2e/dial.spec.ts and tests/e2e/admin/generator.spec.ts:
  - step 100 shows $256,275.00, and prices never go down (existing)
  - the generator refuses 10,250 with the dial's line
  - at 360px, the maker's step-100 shirt at quantity 99 shows a $25,371,225.00 subtotal in the
    cart with no sideways scroll (SC-003, analysis M1)

**Checkpoint**: 007's dial plays as before, at the new prices.

---

## Phase 5: User Story 3 - Dan Tunes the Line (Priority: P3)

**Goal**: two dials in Settings with a live before/after, a straight MSRP on a linear chart, and an
editor preview that prices any score.

**Independent Test**: retune to $40.00 a point, check the preview, save, see the store reprice, put
it back. A zero, negative or malformed dial is refused. The chart's MSRP is straight.

- [X] T014 [P] [US3] Failing tests:
  - **tests/integration/admin-settings.test.ts**, `saveTuningCore`:
    - `basePriceUsd` and `perPointUsd` blank, `"0"`, `"-5"` or `"lots"` → issues with
      `baseFormat` / `perPointFormat`, and nothing saved
    - valid dials save only the two columns
    - a hand-priced BLAND shirt at $250.00 with a retune to a $10.00 base and $30.00 a point (start
      $310.00) saves. A retune to a $10.00 base and $20.00 a point (start $210.00) is refused with
      `t.breaks`
  - **tests/integration/admin-door.test.ts**: the `saveTuning` sweep posts the new field names.
  - **tests/unit/admin-pricing.test.ts**, `chartPoints`:
    - `curve` is two points
    - every shirt at its MSRP lies on the line within 0.1 px
    - ticks start at $0 and step by a fifth of a 1/2/5 × 10ⁿ top at or above the highest price
    - labels are whole dollars
- [X] T015 [US3] Implement Dan's Office (R6, R7):
  - **src/lib/actions/admin/settings.ts**: `saveTuningCore` reads `basePriceUsd` and `perPointUsd`.
  - **src/components/admin/TuningForm.tsx**:
    - two fields
    - the help text "MSRP = base price + price per point × score. Only the dials change, never the
      formula."
    - "A real shirt starts at $X (Tier, score N)" from `realShirtStartUsd` under the typed dials
      (it needs the tiers: pass them from src/app/admin/settings/page.tsx)
    - the before/after table, with no "can't price" fallback
  - **src/components/admin/PricePreview.tsx**: drop `tooComplicated` and `cantPrice`.
  - **src/lib/admin/pricing.ts**: `chartPoints` on a linear axis.
  - **src/components/admin/PriceChart.tsx**: its doc comment.
  - **src/lib/copy.ts**:
    - `copy.console.settings.tuning`: `base`, `perPoint`, `help`, `baseFormat`, `perPointFormat`,
      `startsAt`
    - remove `start`, `anchor`, `interval` and their formats
    - `copy.console.pricing.chartHelp` without "log"
  - T014 passes.
- [X] T016 [US3] E2E in the admin projects:
  - **tests/e2e/admin/switchboard.spec.ts** (it drives the tuning form today; analysis A1):
    - type $40.00 a point, and see Dan's Masterpiece go from $3,300.00 to $5,250.00 in the preview
    - save, and see the store page show $5,250.00
    - put it back to $25.00
    - a $0.00 base is refused, and the refusal stays
  - **tests/e2e/admin/pricing.spec.ts**: the chart's MSRP path is a single straight segment, and
    there are no inversions.
  - **tests/e2e/admin/shirts.spec.ts**: the editor preview at 1,000,000 shows $25,000,050.00.

**Checkpoint**: Dan can tune the line, and every view of it agrees with the store.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Draft constitution v5.0.0 in .specify/memory/constitution.md (R10):
  - **II**: "a single, documented, deterministic, straight-line function of the complexity score: a
    base price plus a price per point". Its tuning parameters are "the base price and the price per
    point".
  - **III**: "the starting price of a real Dan Flashes shirt (the MSRP where the first tier above
    BLAND begins)".
  - **The Sync Impact Report**: 4.2.0 → 5.0.0, MAJOR because II's MUST is redefined, with the III
    wording batched in. Ratified by merging this PR, after 007's.
  - **The version line**: Last Amended 2026-10-20.
- [X] T018 [P] Living specs and the README (FR-018), each change marked "(010)":
  - specs/001-core-storefront/spec.md: the summary, the MSRP definition, the curve-shape Q,
    FR-003, and the MSRP Settings entity
  - specs/007-pattern-generator/spec.md: FR-007, and the edge cases "Past the end of pricing" and
    "A bland rule broken by tuning"
  - specs/008-admin-console/spec.md: the tuning scenarios, FR-014, FR-015, FR-030, the "Tuning that
    crosses a tier" edge case, and the chart's axis
  - README.md: the MSRP line, the dial's top, migration 0014, and that `db:migrate` backs up
    before clearing Dan's prices
- [X] T019 [P] Hand-check `TuningForm` and `PricePreview` in `next dev` under React Strict Mode, on
  a scratch database: no console errors or warnings.
- [X] T020 Script the quickstart scenarios e2e doesn't cover, on a copy of a pre-0014 database:
  - 1, 3 and 4 (orders identical, Dan's prices cleared)
  - 5 (a cart from before)
  - 6 (retune mid-checkout)
  - 14–16
  - 17: `catalog:audit` = 0 errors after migrating and after `db:reset`

  Record the results in quickstart.md.
- [X] T021 Run `npm run verify` until it's green. Record the counts and the coverage here.
  - **Result (2026-10-20)**: green on the second run. Unit and integration: 93 files, 1,035 tests.
    E2E: 154 tests (desktop, phone, admin-desktop, admin-phone) in 6.9 min. Coverage: statements
    94.27%, branches 92.22%, functions 88.42%, lines 95%.
  - **The first run's one failure**: the new straight-line spec counted the home page's cards on
    the phone before they streamed in. It now waits for the first card.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T007)** blocks every story:
  - T002 ∥ T003 ∥ T004
  - T002, T003 → T005
  - T004 → T006 (it needs T005's type)
  - T005, T006 → T007
- **US1 (T008–T010)** comes next. **US2 (T011–T013)** and **US3 (T014–T016)** need only
  Foundational, and can run beside US1.
- **Within each story**: tests first (they fail), then the code, then the e2e.
- **Polish (T017–T021)** comes last. T017 and T018 can start any time after the plan.

### Parallel opportunities

- T002 ∥ T003 ∥ T004
- T008 ∥ T009, T011, T014
- US2 beside US3
- T017 ∥ T018 ∥ T019

## Implementation Strategy

1. **MVP**: Setup, Foundational, US1. The store reprices on the line, and nothing sold changes.
2. **Then**: US2 (the dial's top), then US3 (Dan's dials and chart).
3. **Polish**: then verify, converge, and a PR that also ratifies constitution v5.0.0, after 007's
   PR is merged.

---

## Phase 7: Convergence

- [X] T022 Reword the console's "GROWTH" poster in src/lib/copy.ts, which still says "Prices double every ten points of complexity." The price now climbs by the same amount every point, per FR-001 (contradicts)
- [X] T023 Bring specs/008-admin-console/contracts/console.md's tuning fields (`startPriceUsd`, `anchorScore`, `doublingInterval`) and "the start price" in line with the two dials and a real shirt's start, per FR-018 (partial)

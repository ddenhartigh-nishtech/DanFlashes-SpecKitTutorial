# Tasks: Checkout Squeeze

**Input**: Design documents from `/specs/005-checkout-squeeze/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-16, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- **Add-ons change totals, so this is a money path.** Every test task comes before its
  implementation and MUST be seen failing first.
- Every new `src/lib` module gets unit or integration tests.
- Every user story gets an e2e journey at desktop and phone viewports. e2e uses the default switches
  (both on) and never toggles them in the shared e2e database (002 R7). "Off" is proven in unit and
  integration tests (research R7).
- e2e runs a production build, so the client components get a hand check against `next dev` for
  React Strict Mode (002 R7, known gap).

**Money rule**: every amount is a two-decimal USD string handled through `src/lib/money.ts`. No task
may do money math with JS numbers. Every total comes from `orderTotals` (research R2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US2)

---

## Phase 1: Setup

- [X] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR
  - **Result (2026-10-16).** Main's code is the 004 head, which was verified before the merge: 533
    unit and integration tests, 95.0% line coverage, 76 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the two switches and the two tables (data-model.md, research R1).

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts: `validateSettings`
  accepts `preCheckedAddOns` and `roachMotel` as booleans, and reports each one when it's missing or
  the wrong type
- [X] T003 [P] Write failing integration tests:
  - in tests/integration/settings-switches.test.ts: both switches default on for a row written
    without them, and round-trip off
  - in a new tests/integration/migration-0008.test.ts:
    - an existing `store_settings` row gains `pre_checked_add_ons = 1` and `roach_motel = 1`
    - `add_ons` refuses a `name` that's empty or over 60 characters, or duplicated
    - it refuses a `pitch` or `decline_line` that's empty or over 160 characters, and a `price_usd`
      that's not exact money, negative, or `0.00`
    - `order_add_ons` has PRIMARY KEY (`order_id`, `add_on_id`), with FKs ON DELETE RESTRICT to
      `orders` and `add_ons`, and a snapshot `price_usd` with the same money CHECK
    - `foreign_key_check` is clean
- [X] T004 Add `preCheckedAddOns` and `roachMotel` (booleans) to `StoreSettings` in
  src/lib/catalog/types.ts and to `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [X] T005 Extend src/lib/db/schema.ts per data-model.md:
  - **`store_settings`** gains `pre_checked_add_ons` and `roach_motel` (integer boolean, NOT NULL,
    default 1)
  - **New `add_ons`**:
    - `name` unique, "1–60 characters after trimming"
    - `pitch` and `decline_line`, "1–160 characters"
    - `price_usd` with the `money` CHECK, "not negative and not `0.00`"
    - `active` (default 1), `position` (default 0), `created_at`
  - **New `order_add_ons`**: `order_id` and `add_on_id` (FK, RESTRICT), `name`, `price_usd` (money
    CHECK, positive), `position`, PRIMARY KEY (`order_id`, `add_on_id`)

  Then run `npx drizzle-kit generate --name checkout_squeeze` to produce drizzle/0008_checkout_squeeze.sql.
  Check that it adds the columns and creates the tables, and rebuilds nothing.
- [X] T006 Carry the switches through src/lib/data/settings.ts, scripts/seed-data.ts,
  tests/fixtures/catalog.ts, and `setSwitches` in tests/helpers/db.ts (T003 passes)

**Checkpoint**: the switches and tables exist, both switches default on, and every existing test
still passes.

---

## Phase 3: User Story 1 - Pre-checked Add-ons (Priority: P1) 🎯 MVP

**Goal**: checkout lists every offered add-on already ticked, every time. The live total includes
them, and unticking shows the decline line (confirmshaming on). The server re-resolves them at
placement, refuses on any change, snapshots them onto the order, and charges shirts plus add-ons by
card, Flash Credit, or a split. The confirmation and history show them.

**Independent Test**: quickstart scenarios 1–7, 14 (add-ons).

### Tests for User Story 1 (write first; they must fail)

- [X] T007 [P] [US1] Unit tests in tests/unit/checkout-totals.test.ts for `orderTotals({ subtotalUsd,
  addOnPrices, shippingUsd, taxUsd })`:
  - no add-ons → total = subtotal
  - Geo Riot plus the four starting add-ons → `addOnsUsd` "189.96" and total "534.57"
  - exact cents: "0.10" + "0.20" → "0.30"
  - shipping and tax still add
  - the result is always two-decimal strings
- [X] T008 [P] [US1] Integration tests in tests/integration/add-ons.test.ts:
  - `listOfferedAddOns(db, settings)` returns active add-ons only, by `position` then `id`, with
    `id`, `name`, `pitch`, `declineLine` and `priceUsd`, and is empty with `preCheckedAddOns` off
  - `resolveAddOns(db, ids)` returns the offered ones and names the missing or inactive ids
  - `seedCatalog` inserts the fixture's four add-ons and, run again, changes nothing (idempotent)
- [X] T009 [P] [US1] Integration tests in tests/integration/place-order-add-ons.test.ts:
  - **By card, some ticked**: the total is the shirts plus the ticked add-ons, exactly, and
    `order_add_ons` holds each add-on's name, price and position
  - **Flash Credit covering it all**: the one spend entry equals the full total
  - **A split**: the credit applied plus the card equals the full total, and the confirmation is still
    required
  - **Refusals**: a retired add-on, a repriced one, an unknown id, or a stale `expectedTotalUsd` →
    `PRICE_CHANGED` with the new total, and no order, items or ledger entry written
  - **With `preCheckedAddOns` off**: `addOnIds` are ignored and the total is the shirts alone
  - **A replayed checkout token** returns the same order, charged once
  - **Snapshots**: renaming or repricing an add-on later leaves the order's rows and total unchanged
  - **The drain**: the per diem drain counts the full total, add-ons included (003)
  - **Parsing**: `placeOrderCore` reads repeated `addOnId` fields, and an add-on named twice is
    charged once, with no error (analysis U1)
  - **The read model**: `getOrderForUser` and `listOrdersForUser` return `addOns`
- [X] T010 [P] [US1] e2e journey in tests/e2e/add-ons.spec.ts (desktop and phone):
  - **At checkout**: all four add-ons ticked with pitch and price, and Geo Riot's total is $534.57
  - **Untick and re-tick**: unticking Complexity Insurance drops the total by $89.99 and shows "No
    thanks, I'll take my chances with complexity.", and re-ticking restores it
  - **Reload**: reloading ticks everything again
  - **A split**: with $100.00 of Flash Credit and Pattern Protection Plan™ unticked, a confirmed split
    pays $384.58 by card
  - **Afterwards**: the confirmation lists the three add-ons with their prices, and so does the
    account's purchase history
  - no sideways scroll at 360px

### Implementation for User Story 1

- [X] T011 [US1] Implement `orderTotals` in src/lib/checkout/totals.ts (pure, `money.ts`). T007 passes.
- [X] T012 [US1] Create src/lib/data/add-ons.ts (`listOfferedAddOns`, `resolveAddOns`; the only reader
  of `add_ons`). Add `addOns` to `CatalogFixture` and `seedCatalog` in src/lib/data/seed.ts, inserting
  with `onConflictDoNothing` on `name`. Put the four starting add-ons (research R9) in
  scripts/seed-data.ts and the test fixture. T008 passes.
- [X] T013 [US1] Extend `placeOrder` in src/lib/checkout/place-order.ts per contracts/changes.md:
  - take `addOnIds`, de-duplicated
  - while the switch is on, re-resolve them inside the transaction
  - total = `orderTotals`, and refuse with `PRICE_CHANGED` on any mismatch
  - insert `order_add_ons` with snapshots

  Then parse `addOnId` in src/lib/actions/checkout.ts, and add `addOns` to `OrderView` in
  src/lib/orders/orders.ts. T009 passes.
- [X] T014 [US1] Show the add-ons:
  - src/app/checkout/page.tsx passes `listOfferedAddOns`, the subtotal and `confirmshaming`
  - src/components/CheckoutForm.tsx gets ticked checkboxes (`data-testid="add-on"`), each add-on's
    decline line while confirmshaming is on and it's unticked, the live Total
    (`data-testid="total"`) from `orderTotals`, the split from that total, hidden `addOnId` fields,
    and ~~a key on the add-on list's ids and prices, so any change remounts with everything ticked
    (analysis I1)~~. *Revised in T024:* no key, because a remount after a refusal wiped Dan's
    message. The form is submitted by hand, so React's reset can't re-tick the boxes behind the
    total's back, and it forgets unticks when he leaves the page (research R4).
  - src/components/OrderSummary.tsx renders add-on rows (`data-testid="add-on-line"`) and has an
    optional Total row (off at checkout)
  - the copy goes in src/lib/copy.ts

  T010 passes.
- [X] T015 [US1] Add `untickAddOns(page)` to tests/e2e/helpers.ts and call it from `buyByCard`. Untick
  first in journeys whose numbers assume no add-ons:
  - card-checkout
  - split-checkout
  - per-diem-drain
  - drain-them-all
  - fake-scarcity
  - no-score

  flash-credit-checkout keeps every add-on ticked: it asserts the balance drops by exactly the total,
  add-ons included, so Flash Credit pays add-ons end to end (analysis C1). The full e2e suite
  passes.

**Checkpoint**: US1 works on its own. Every checkout total equals the shirts plus the ticked add-ons.

---

## Phase 4: User Story 2 - Roach-Motel Cart (Priority: P2)

**Goal**: removing a line, or lowering its quantity, asks "Are you sure?" and then "Are you sure
sure?". Only the second yes submits, and backing out changes nothing. Adding and raising never ask.

**Independent Test**: quickstart scenarios 8–13, 14 (roach motel).

### Tests for User Story 2 (write first; they must fail)

- [X] T016 [P] [US2] Unit tests in tests/unit/roach-motel.test.ts for `needsConfirm(change, on)`:
  - a remove → true
  - an update to a lower quantity → true
  - an equal or higher quantity → false
  - anything with the switch off → false
- [X] T017 [P] [US2] e2e journey in tests/e2e/roach-motel.spec.ts (desktop and phone):
  - **Remove**:
    - Keep at the first question leaves the line
    - yes, then Keep at the second, leaves it
    - yes and yes removes it
  - **Lowering**: 3 → 2 asks twice, only the second yes lowers it, and Keep leaves 3
  - **Raising and adding**: raising asks nothing (and finds another one, 004), and adding from the
    shirt page asks nothing
  - **Labels**: the yes buttons are shamed (confirmshaming on)
  - Escape keeps the line
  - the dialogs fit at 360px, with no sideways scroll

### Implementation for User Story 2

- [X] T018 [US2] Implement `needsConfirm` in src/lib/cart/roach-motel.ts (pure). Add to src/lib/copy.ts:
  - `copy.roachMotel`: `first` "Are you sure?", `second` "Are you sure sure?", `keep`
  - `copy.shame.labels`: `removeYes` and `lowerYes`, each shamed and neutral

  T016 passes.
- [X] T019 [US2] Create src/components/ConfirmTwice.tsx (client):
  - it wraps a form; when `when(form)` is true it cancels the submit and opens a native `<dialog>`
    for the first question, then the second
  - only the second yes calls `requestSubmit`, letting that one submit through
  - Keep is focused first, and Keep, Escape or a backdrop click keeps
  - the dialog closes in its effect cleanup (002 R7)
  - the yes labels come from `labelFor`

  Wire it into the Remove form in src/app/cart/page.tsx (always) and into
  src/components/CartQuantityForm.tsx (on a decrease), behind `settings.roachMotel`. The cart
  audit's removals (001, 002) stay server-side and never pass through it (FR-012, analysis C2).
  T017 passes.
- [X] T020 [US2] Add `confirmTwice(page)` to tests/e2e/helpers.ts. Use it in the journeys that remove
  a line or lower a quantity: zoom-and-cart, confirmshaming, fake-scarcity, and any others the
  suite shows. The full e2e suite passes.

**Checkpoint**: both stories work on their own, and `npm run verify` is green.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T021 [P] Add `pre_checked_add_ons` and `roach_motel` to the switches table in README.md. Note
  the add-ons in "Managing the store" (Studio, flat per order, retire rather than delete), and
  `npm run db:seed` after migrating.
- [X] T022 Check against `next dev` under React Strict Mode: ConfirmTwice (one dialog, closes cleanly,
  no duplicate submit) and CheckoutForm (ticks, live total, decline lines). The console must be
  clean (002 R7, known gap).
  - *Result:* clean. One dialog, Keep closes it. Lowering a quantity sends exactly one
    server-action POST. Checkout: $879.18 → $789.19 → $879.18 with two Geo Riots. Re-run after the
    T024 fix: a refused card keeps his untick, and a trip to the cart and back re-ticks it. No
    console errors or warnings.
- [X] T023 Constitution VII spot check: run Lighthouse (mobile) on `/checkout` (with a line) and
  `/cart` against a production build. Each must have CLS ≤ 0.1 and LCP ≤ 2.5 s (applied
  throttling), with TBT noted.
  - *Result* (two runs each, signed in with Geo Riot in the cart): all within budget.

    | Page | LCP | CLS | TBT |
    |---|---|---|---|
    | `/checkout` | 2.0 s / 1.9 s | 0.026 / 0.013 | 210 / 130 ms |
    | `/cart` | 1.7 s / 1.7 s | 0 / 0 | 140 / 290 ms |
- [X] T024 Run quickstart.md scenarios 1–15 and note the results. Scenario 14 covers the off-switch wiring (analysis C3), and scenario 15 covers store-made removals (C2).
  - *Result:* 15/15, scripted through the UI against a production build on a scratch database,
    with "Studio" edits made directly in SQLite.
    - 1–3: four ticked at $534.57, −$89.99 with its decline line, all ticked again after a reload.
    - 4: $484.58 by card, three add-on lines on the order and in history.
    - 5: split $100.00 + $434.57.
    - 6: refused with "Your new total is $544.57", and no order placed.
    - 7: a rename leaves the past order at "Complexity Insurance $89.99".
    - 8–13: the roach motel, with the dialog 322 px wide at 360 px.
    - 14: switches off gives $344.61, and Remove works at once.
    - 15: a retired shirt is pulled with the notice.
  - *Two bugs found, fixed test-first:*
    - The first run of scenario 6 lost Dan's message. The I1 key remounted the form after the
      refresh.
    - A trip to the cart and back kept his unticks. Next keeps the hidden page mounted.
  - *A third, surfaced while checking the fix:* any refusal re-ticked the boxes on screen while the
    total still left them out. React resets a `<form action>`.
  - *The fix:* no key, a hand-submitted form, and unticks forgotten when he leaves (research R4).
    - New e2e steps in add-ons.spec.ts (the trip back) and card-checkout.spec.ts (unticks survive
      a refused card).
    - A retire mid-checkout with one add-on unticked: refused at $414.59, the form shows
      $414.59, and the untick stays.
- [X] T025 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including `src/lib/checkout/totals.ts`, `src/lib/data/add-ons.ts`, and
  `src/lib/cart/roach-motel.ts`.
  - *Result:* green.
    - Unit and integration: 57 files and 562 tests.
    - Coverage on `src/lib`: 94.87% lines, 93.13% branches. The three named modules are at 100%.
    - e2e: 80 passed in 2.9 min.
    - One earlier run lost 003's drain-them-all on the desktop project only, at sign-up: bcrypt
      was still "One moment…" at 15 s. The re-run was clean.

---

## Phase 6: Owner Feedback (2026-10-16): The Cart Line Found a Few More

**Purpose**: the owner tried the roach motel and said the mechanics are good. But "One more left!"
doesn't hold up once a line goes from 1 to 5, and the green "Oh wait, we found another one!" under
the line repeats what the orange stock line already says. This changes 004's fake scarcity, recorded
in specs/004-urgency-engine/spec.md (Session 2026-10-16; FR-007, FR-009, US1 AC3, AC4).

- [X] T026 Tests first, and watch them fail:
  - tests/unit/urgency-scarcity.test.ts: `cartStockLine(line, quantity)` turns "scarce" and "again"
    into "few" at 2 or more. It leaves 1 alone, "plenty" alone, and null alone.
  - tests/integration/cart-found-another.test.ts and tests/integration/actions-cart.test.ts: a
    raise in `updateCartItemCore` has no message.
  - tests/e2e/fake-scarcity.spec.ts and tests/e2e/roach-motel.spec.ts: the line reads "You're
    lucky, we actually found a few more!" at 3 and at 2, with no "found another one" under it.
- [X] T027 Make them pass:
  - `cartStockLine` and the "few" `StockLine` in src/lib/urgency/scarcity.ts
  - `copy.urgency.fewMore` ("You're lucky, we actually found a few more!") in src/lib/copy.ts
  - src/components/StockLine.tsx renders it
  - src/app/cart/page.tsx passes each line's quantity
  - `updateCartItemCore` in src/lib/actions/cart.ts returns no message
  - src/components/CartQuantityForm.tsx drops its success bar and keeps failures. Adding from a
    shirt's page still says "Oh wait, we found another one!".
- [X] T028 Update 004's spec (an owner note; FR-007, FR-009, US1 AC3, AC4, the edge case), and its
  contracts, quickstart row 4, research R3, data model and plan, plus the README switches table.
- [X] T029 Run `npm run format`, then `npm run verify`. It must be fully green.
  - *Result:* green.
    - Unit and integration: 57 files and 569 tests.
    - Coverage on `src/lib`: 94.87% lines, 93.27% branches.
    - e2e: 80 passed in 2.7 min.
  - The first run failed four phone tests while a `next dev` server was also running. Three were
    slow adds ("Adding…" past 15 s) and passed on a re-run.
  - The fourth, 004's social-proof check, was a real race: it measured the phone pop-up mid
    slide-in (2.77 px off). It now waits for the animation to finish, and passed 6/6.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks both stories.
- **US1 (T007–T015)** and **US2 (T016–T020)** depend only on Foundational. Priority order is
  US1 → US2. Within a story: tests first, then pure functions, then data, then UI, then the
  existing-journey updates.
- Shared files are touched in turn:
  - src/lib/copy.ts (T014, T018)
  - tests/e2e/helpers.ts (T015, T020)
  - src/components/CartQuantityForm.tsx (T019)

  Do these sequentially.
- **Polish (T021–T025)** comes after both stories.
- **Owner feedback (T026–T029)** comes after Polish. T026 first, then T027 → T028 → T029.

### Parallel opportunities

- T002 ∥ T003
- Within US1: T007 ∥ T008 ∥ T009 ∥ T010
- Within US2: T016 ∥ T017
- T021 can run beside T022–T024

### Parallel example: User Story 1

```text
Task: "Unit tests for orderTotals in tests/unit/checkout-totals.test.ts"
Task: "Integration tests for add-on data in tests/integration/add-ons.test.ts"
Task: "Integration tests for placeOrder with add-ons in tests/integration/place-order-add-ons.test.ts"
Task: "e2e journey in tests/e2e/add-ons.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1 (pre-checked add-ons). It's the money path, demoable on its
   own.
2. **Increment 2**: US2 (the roach motel). Shirts check in but don't check out.
3. **Polish**: the README, the Strict Mode check, Lighthouse, the quickstart, then verify. Then
   converge, and a PR.

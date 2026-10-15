# Tasks: Urgency Engine

**Input**: Design documents from `/specs/004-urgency-engine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-15, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- This feature changes the cart actions ("found another one"). Every test task comes before its
  implementation and MUST be seen failing first.
- Every new `src/lib` module gets unit or integration tests. Time is always injected (`now`), and
  randomness through a parameter. No test sleeps longer than an e2e wait for a pop-up.
- Every user story gets an e2e journey at desktop and phone viewports. e2e uses the default switches
  (all on) and never toggles them in the shared e2e database (002 R7). "Off renders nothing" is proven
  in unit and integration tests (research R7).
- e2e runs a production build, so the client components are checked by hand against `next dev` for
  React Strict Mode (002 R7, known gap).

**Money rule**: no task changes a price, a total, or `placeOrder`. Urgency copy never shows a price
(FR-003, FR-004).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US3)

---

## Phase 1: Setup

- [X] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR
  - **Result (2026-10-15).** The branch has only docs over main, whose tree is `7492b2e`'s, which was
    verified before the merge: 477 unit and integration tests, 95.0% line coverage, 70 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the three switches (data-model.md, research R1), which every story reads.

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts: `validateSettings`
  accepts `fakeScarcity`, `countdownTimers` and `socialProof` as booleans, and reports each one when
  it's missing or the wrong type
- [X] T003 [P] Write failing integration tests:
  - in tests/integration/settings-switches.test.ts: the three switches default on for a row written
    without them, and round-trip off through `saveSettings`
  - in a new tests/integration/migration-0007.test.ts: an existing `store_settings` row gains
    `fake_scarcity = 1`, `countdown_timers = 1` and `social_proof = 1`, and nothing else changes
- [X] T004 Add `fakeScarcity`, `countdownTimers` and `socialProof` (booleans) to `StoreSettings` in
  src/lib/catalog/types.ts and to `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [X] T005 Add the columns to `storeSettings` in src/lib/db/schema.ts, each "integer (boolean), NOT
  NULL, default 1": `fake_scarcity`, `countdown_timers`, `social_proof`. Then run
  `npx drizzle-kit generate --name urgency_switches` to produce drizzle/0007_urgency_switches.sql
  (three `ALTER TABLE … ADD`, no rebuild).
- [X] T006 Carry the switches through src/lib/data/settings.ts (`getSettings`/`saveSettings`),
  scripts/seed-data.ts, tests/fixtures/catalog.ts, and `setSwitches` in tests/helpers/db.ts
  (T003 passes)

**Checkpoint**: the switches exist, default on, and every existing test still passes.

---

## Phase 3: User Story 1 - Fake Scarcity (Priority: P1) 🎯 MVP

**Goal**: "Only 1 left!" on every non-bland shirt card, beside the detail price, and on cart lines;
"Plenty left. Nobody wants these." on bland shirts; "Oh wait, we found another one!" on every add and
every quantity raise.

**Independent Test**: quickstart scenarios 1–4, 12.

### Tests for User Story 1 (write first; they must fail)

- [X] T007 [P] [US1] Unit tests in tests/unit/urgency-scarcity.test.ts:
  - `stockLine({ isBland, active, boughtBefore }, on)` returns:
    - `"scarce"` for an active non-bland shirt
    - `"again"` for one he's bought before
    - `"plenty"` for an active bland one (bought or not)
    - `null` when it's off or retired
  - `foundAnother({ previous, next, isBland }, on)` is true only when `next > previous`, the shirt
    isn't bland, and it's on. A cut, an unchanged quantity, or a remove is false.
- [X] T008 [P] [US1] Integration tests in tests/integration/cart-found-another.test.ts:
  - `addItem` and `updateItem` report `shirtId` and `previousQuantity` (0 for a new line)
  - `addToCartCore` says "It's in the cart. Excellent decision. Oh wait, we found another one!" for
    a non-bland shirt, but only "It's in the cart. Excellent decision." with `fakeScarcity` off, or
    for a bland shirt with bland shaming off
  - `updateCartItemCore` says "Oh wait, we found another one!" on a raise. It says nothing on a cut,
    an unchanged quantity, a remove, a bland shirt, or with the switch off.
  - with `fakeScarcity` on vs off, the same adds and updates leave identical quantities,
    `itemCount` and subtotal (FR-003, SC-002)
  - `orderedShirtIds(db, userId)` returns the distinct shirts in his own orders only: not another
    shopper's, and empty for a guest
- [X] T009 [P] [US1] e2e journey in tests/e2e/fake-scarcity.spec.ts (desktop and phone):
  - `/shirts`: every non-bland card says "Only 1 left!", and Beige Regret says "Plenty left. Nobody
    wants these."
  - the home page's cards carry it too
  - Geo Riot's page has the line beside an unchanged price
  - Add to cart shows "found another one", and the page still says "Only 1 left!"
  - the cart line says it
  - raising to 3 shows "found another one", and lowering to 2 shows nothing
  - after checking out, Geo Riot's page and card say "Just kidding, we actually found another one!
    One more left!" (US1 AC5)
  - no sideways scroll at 360px

### Implementation for User Story 1

- [X] T010 [US1] Implement `stockLine` and `foundAnother` in src/lib/urgency/scarcity.ts (pure).
  Add `copy.urgency.scarce`, `again`, `plenty` and `foundAnother` to src/lib/copy.ts, in voice.
  T007 passes.
- [X] T011 [US1] Add `shirtId` and `previousQuantity` to the success results of `addItem` and
  `updateItem` in src/lib/cart/cart.ts. In src/lib/actions/cart.ts, make `addToCartCore` and
  `updateCartItemCore` add the "found another one" copy when `foundAnother` says so: the shirt's
  blandness comes from `isBlandShirt`, and the switch from `getSettings`. Add
  `orderedShirtIds(db, userId)` to src/lib/orders/orders.ts. T008 passes.
- [X] T012 [US1] Create src/components/StockLine.tsx (server: `stockLine` → the loud line, or nothing,
  `data-testid="stock-line"`). Pages load the current shopper's `orderedShirtIds` once per request,
  so `boughtBefore` is a set lookup. Render it:
  - in src/components/ShirtCard.tsx, via a `fakeScarcity` prop passed by src/app/page.tsx,
    src/app/shirts/page.tsx and src/app/about/page.tsx
  - beside the price in src/app/shirts/[slug]/page.tsx (not for retired shirts)
  - on each line in src/app/cart/page.tsx

  Make src/components/CartQuantityForm.tsx show a success message. T009 passes.

**Checkpoint**: US1 works on its own. `npm test` is green.

---

## Phase 4: User Story 2 - Countdown Timers That Reset (Priority: P2)

**Goal**: one shared 10-minute clock per browser, in `MM:SS.mmm`. It shows as a deal beside the
detail price, and as a hold on the cart and checkout while the cart has lines. It restarts quietly at
zero.

**Independent Test**: quickstart scenarios 2, 5, 6, 13.

### Tests for User Story 2 (write first; they must fail)

- [ ] T013 [P] [US2] Unit tests in tests/unit/urgency-countdown.test.ts:
  - `remainingMs(now, anchor)` is 600000 at the anchor, 1 at anchor + 599999, and 600000 again at
    anchor + 600000. It stays in (0, 600000] for any time, including a `now` before the anchor.
  - `formatCountdown`: 600000 → "10:00.000", 1 → "00:00.001", 59999 → "00:59.999", 61001 →
    "01:01.001". It never shows "60" seconds and never goes negative.
  - `showCountdown(settings, "deal" | "hold", cartLines)` is false when off, and false for a hold on
    an empty cart
- [ ] T014 [P] [US2] e2e journey in tests/e2e/countdown.spec.ts (desktop and phone):
  - Geo Riot's deal clock matches `/^\d{2}:\d{2}\.\d{3}$/` and goes down
  - after an add, the cart's and checkout's hold show the same time as the deal, to within 1 s
  - navigating doesn't restart it
  - with the anchor set to 595 s ago (`addInitScript`), it reaches zero and shows `09:5x.xxx` again
    within a few seconds, with no "expired" text and an unchanged cart
  - an empty cart has no hold
  - a second page in the same browser shows the same time, to within 1 s (several tabs)
  - no sideways scroll at 360px

### Implementation for User Story 2

- [ ] T015 [US2] Implement `COUNTDOWN_MS`, `remainingMs`, `formatCountdown` and `showCountdown` in
  src/lib/urgency/countdown.ts (pure). Add `copy.urgency.deal` ("This price won't last.") and
  `hold` ("Your shirts are reserved for"). T013 passes.
- [ ] T016 [US2] Create src/components/Countdown.tsx (client):
  - it reads or creates `localStorage['df-countdown-anchor']` inside try/catch, falling back to an
    in-memory value
  - it writes `formatCountdown(remainingMs(Date.now(), anchor))` to its element on every
    `requestAnimationFrame`, with no React state per frame
  - before hydration it renders the fixed-width placeholder "10:00.000" in tabular figures
  - `data-testid="countdown"`, `data-kind="deal" | "hold"`
- [ ] T017 [US2] Render the deal countdown beside the price in src/app/shirts/[slug]/page.tsx, and
  the hold in src/app/cart/page.tsx and src/app/checkout/page.tsx when the cart has lines, each under
  its line and guarded by `showCountdown`. T014 passes.

**Checkpoint**: US1 and US2 both work on their own.

---

## Phase 5: User Story 3 - Fabricated Social Proof (Priority: P3)

**Goal**: the detail page says how many people are looking and which fake coworker just bought it,
with bland shirts at 0 and no buyer. Pop-ups of fake purchases come every 20–40 s on every page:
bottom-right on wider screens, under the header on phones, each with an (x).

**Independent Test**: quickstart scenarios 7–10, 14.

### Tests for User Story 3 (write first; they must fail)

- [ ] T018 [P] [US3] Unit tests in tests/unit/urgency-social-proof.test.ts:
  - `lookingNow(shirtId, now)` stays within 3–40 and is never 0, sampled every minute for a day
    across several shirts. It's deterministic, and it changes by at most 3 people per minute.
  - `buyerFor(shirtId, now)` is stable within a 10-minute window and is always a member of
    `copy.urgency.cast`
  - `socialProofFor(settings, shirt, now)` is null when off or retired. For a bland shirt it's
    `{ looking: 0, buyer: null }`.
  - the cast has at least 8 unique coworkers, each with a department
- [ ] T019 [P] [US3] Unit tests in tests/unit/urgency-pops.test.ts:
  - `nextDelay(rand)` is in [20000, 40000] for `rand` in [0, 1)
  - `popDue({ now, nextAt, visible })` is false while hidden, and true once when overdue
  - `scheduleNext(now, rand)`, used after a pop-up ends or is dismissed, puts `nextAt` 20–40 s ahead,
    so closing one never stops the next
  - `pickPop(candidates, cast, rand)` names a candidate and a cast member, or returns null when there
    are no candidates
- [ ] T020 [P] [US3] Integration test in tests/integration/urgency-candidates.test.ts:
  `listPopCandidates(db, settings)` returns only active, non-bland shirts (name and slug), never
  reads orders or users, and is empty with `socialProof` off
- [ ] T021 [P] [US3] e2e journey in tests/e2e/social-proof.spec.ts (desktop and phone):
  - Geo Riot shows "N people are looking at this shirt right now" (3–40) and a "just bought this
    pattern" line
  - Beige Regret shows 0 and no buyer
  - with `sessionStorage['df-pop-next']` set to now (`addInitScript`), a pop-up appears naming an
    active shirt and linking to it
  - on desktop the pop-up is in the bottom-right quarter. On a phone its top is at the header's
    bottom edge and it doesn't overlap the header.
  - its (x) closes it within 0.5 s
  - only one pop-up at a time
  - signed in (after sign-up), the page lines and a pop-up show up just as they do for a guest
    (FR-005)
  - no sideways scroll at 360px

### Implementation for User Story 3

- [ ] T022 [US3] Implement `lookingNow`, `buyerFor` and `socialProofFor` in
  src/lib/urgency/social-proof.ts, and `nextDelay`, `popDue`, `scheduleNext` and `pickPop` in src/lib/urgency/pops.ts
  (pure). Add to `copy.urgency`:
  - `looking(n)`, `nobodyLooking`
  - `boughtThis(name, department)`, `bought(name, department, shirt)`
  - `dismissPop`
  - `cast`: at least 8 `{ name, department }`, in voice

  T018 and T019 pass.
- [ ] T023 [US3] Implement `listPopCandidates` in src/lib/data/shirts.ts, and the request-time loader
  `loadPopCandidates()` in a new src/app/_data/urgency.ts (`connection()`, settings, candidates).
  T020 passes.
- [ ] T024 [US3] Create src/components/SocialProof.tsx (server: the looking line and the buyer line,
  `data-testid="social-proof"`), and render it below Add to Cart in src/app/shirts/[slug]/page.tsx
- [ ] T025 [US3] Create src/components/PurchasePops.tsx (client):
  - **schedule**: `sessionStorage['df-pop-next']` (try/catch), `nextDelay`; it pauses while hidden
    and shows one when overdue
  - **behavior**: one pop-up at a time (`data-testid="purchase-pop"`), about 6 s, then it slides
    away. The (x) is labelled `copy.urgency.dismissPop`.
  - **placement**: fixed bottom-right at `md` and up; an absolute full-width banner at the header's
    bottom edge below `md`

  Mount it in src/components/SiteHeader.tsx inside `<Suspense fallback={null}>`, fed by
  `loadPopCandidates()`. T021 passes.

**Checkpoint**: all three stories work on their own, and `npm run verify` is green.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Add `fake_scarcity`, `countdown_timers` and `social_proof` to the switches table in
  README.md
- [ ] T027 Check the client components (Countdown, PurchasePops, CartQuantityForm, AddToCart) against
  `next dev` under React Strict Mode: the clock ticks once per frame (no double loops), there's one
  pop-up at a time with no doubled timers, and "found another one" shows (002 R7, known gap)
- [ ] T028 Constitution VII spot check: run Lighthouse (mobile) on `/shirts/geo-riot`, `/cart` (with
  a line) and `/` against a production build. Each must have CLS ≤ 0.1 and LCP ≤ 2.5 s (applied
  throttling), with TBT noted. The ticking clock and the pop-ups must cause no layout shift.
- [ ] T029 Run quickstart.md scenarios 1–14 and note the results
- [ ] T030 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including `src/lib/urgency/`.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks every story: each one reads its switch.
- **US1 (T007–T012)**, **US2 (T013–T017)** and **US3 (T018–T025)** depend only on Foundational, and
  can be built in any order. Priority order is US1 → US2 → US3. Within a story: tests first, then pure
  functions, then data, then components.
- Shared files are touched in turn:
  - src/app/shirts/[slug]/page.tsx (T012, T017, T024)
  - src/app/cart/page.tsx (T012, T017)
  - src/lib/copy.ts (T010, T015, T022)

  Do these sequentially across stories.
- **Polish (T026–T030)** comes after all three stories.

### Parallel opportunities

- T002 ∥ T003 (different test files)
- Within US1: T007 ∥ T008 ∥ T009
- Within US2: T013 ∥ T014
- Within US3: T018 ∥ T019 ∥ T020 ∥ T021
- T026 can run beside T027–T029

### Parallel example: User Story 3

```text
Task: "Unit tests for lookingNow/buyerFor/socialProofFor in tests/unit/urgency-social-proof.test.ts"
Task: "Unit tests for nextDelay/popDue/pickPop in tests/unit/urgency-pops.test.ts"
Task: "Integration test for listPopCandidates in tests/integration/urgency-candidates.test.ts"
Task: "e2e journey in tests/e2e/social-proof.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1 (fake scarcity). It's demoable on its own: the whole
   catalog is running out.
2. **Increment 2**: US2 (the countdown). The pressure now has a deadline.
3. **Increment 3**: US3 (social proof). Everyone in his office is buying.
4. **Polish**: the README, the Strict Mode check, Lighthouse, the quickstart, then verify. Then
   converge, and a PR.

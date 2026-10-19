# Tasks: Pattern Generator

**Input**: Design documents from `/specs/007-pattern-generator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/generator.md, quickstart.md

**Generated**: 2026-10-19, against constitution v4.2.0 (draft; ratified by merging this PR)

**Tests**: REQUIRED (constitution VI), and written first.
- **The generator is pure**: property tests over at least 1,000 recipes (determinism, exact counts,
  monotonic dial, the palettes, the art budget).
- **Every action** gets integration tests, and joins the 008 door sweep where it's a console action.
- **Each story's journey** gets an e2e. The dial journeys run in the shopper projects (dial shirts
  are unlisted, R12). Console journeys run in the admin projects.
- **Scores**: e2e checks that no shirt's score appears, by reading the made shirt's score from
  `data/e2e.db` and looking for it on every page and link.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story the task belongs to (US1–US3)

---

## Phase 1: Setup

- [X] T001 Record the baseline for the PR. Main is 008's merge (9f7e2b3), last verified at 863 unit
  and integration tests, 94.83% line coverage, and 124 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the columns and the switch (0012), the pure generator, the listing rule, and
materializing. Every story needs these.

- [X] T002 [P] Write a failing tests/integration/migration-0012.test.ts (`databaseBefore("0012")`):
  - **Existing rows**: existing shirts become `origin = 'catalog'`, `recipe` NULL, `listed` 1, with
    every other column unchanged (`toMatchObject`)
  - **The switch**: `store_settings` gains `pattern_generator = 1`
  - **The CHECKs refuse**: a catalog shirt with a recipe; an owner or dial shirt without one; an
    unlisted non-dial shirt; an unknown origin; a duplicate recipe
  - **References**: `shirt_images`, `cart_items` and `order_items` still point at their shirts, and
    `foreign_key_check` is clean
- [X] T003 [P] Update the 008 switch tests: tests/unit/admin-switches.test.ts expects 14 keys,
  including `patternGenerator`; tests/unit/catalog-validate.test.ts makes `validateSettings` require
  `patternGenerator`; tests/integration/settings-switches.test.ts covers its default and round trip.
- [X] T004 Extend src/lib/db/schema.ts per data-model.md:
  - `shirts.origin`: text, NOT NULL, default `'catalog'`, CHECK in (`catalog`, `owner`, `dial`)
  - `shirts.recipe`: text, UNIQUE, NULL exactly when `origin = 'catalog'`
  - `shirts.listed`: boolean, NOT NULL, default true, with `origin = 'dial' OR listed = 1`
  - `store_settings.pattern_generator`: boolean, NOT NULL, default true

  Then:
  - Run `npx drizzle-kit generate --name pattern_generator`. Hand-check the shirts rebuild: any
    copied column the old table lacks becomes its default.
  - Carry the switch through the switch plumbing: `StoreSettings`, `settingsSchema`, `getSettings` /
    `saveSettings`, scripts/seed-data.ts, tests/fixtures/catalog.ts, `setSwitches`, `SWITCH_KEYS`,
    and `copy.console.settings.switches.patternGenerator`.
  - T002 and T003 pass.
- [X] T005 [P] Write failing tests/unit/pattern-generate.test.ts:
  - **Determinism (SC-001)**: for 1,000 recipes from a fixed seed sequence, `generate` twice gives
    byte-identical SVG.
  - **Exact counts**: `countPattern` of every structure equals the target, across sampled scores
    from 0 to `ART_MAX_SCORE`. Adding a shape, a color or a layer never lowers the count.
  - **Palettes**: with `bland`, every fill and stroke color is in the bland palette; without it,
    only loud colors and the outline ink are used.
  - **The SVG itself**: one `<svg>` root, no `<title>`, `<desc>`, `<metadata>` or comments.
  - **The budget (SC-005)**: under 2 MB at `ART_MAX_SCORE`, and under 300 KB at 10,249.
- [X] T006 [P] Write failing tests/unit/pattern-dial.test.ts:
  - **`scoreAtStep`**: non-decreasing over 0–100 for `maxDial` values 10,249, 120,000, 120 and 0;
    step 0 is 0, step 100 is `maxDial`, step 101 is "beyond".
  - **`maxPriceableScore`**: at the default tuning it's 10,249 (`msrpUsd` prices it and throws one
    above), and it's lower with a doubling interval of 1.
  - **Recipe codes**: `encodeRecipe` / `decodeRecipe` round-trip 1,000 random recipes;
    `decodeRecipe` rejects junk, a wrong version, an unknown style and an out-of-range score; a
    code never contains the score's decimal digits as a run (sampled); `recipeKey` is
    `v1:<style>:<score>:<seed>`.
  - **Names**: `nameFor` is deterministic, has no digits, and draws BLAND names from the bland bank;
    the uniqueness helper appends II, III, and so on.
- [X] T007 Create the generator:
  - src/lib/pattern/rng.ts (mulberry32)
  - src/lib/pattern/silhouette.ts: move `BODY` and the collars out of scripts/shirt-art.ts, and make
    the script import them. Check `npm run art:generate` leaves `public/media` byte-identical
    (`git diff --stat public/media` is empty).
  - src/lib/pattern/count.ts and src/lib/pattern/generate.ts, per R1

  T005 passes.
- [X] T008 Create src/lib/pattern/dial.ts (`DIAL_STEPS`, `scoreAtStep`, `maxPriceableScore`,
  `ART_MAX_SCORE`, `maxDial`), src/lib/pattern/recipe.ts (codes, keys) and src/lib/pattern/names.ts,
  with `copy.dial.names` word banks in src/lib/copy.ts. T006 passes.
- [X] T009 [P] Write failing tests/integration/listing-unlisted.test.ts. Insert an unlisted dial
  shirt.
  - It's absent from `listCatalogShirts` (the default), `buildLadder` input and
    `listPopCandidates`.
  - It's present with `includeUnlisted`, in `getShirtBySlug` and in `getCatalogShirtsByIds`.
  - Once `listed = 1`, it's in the listing.
- [X] T010 Make `listCatalogShirts` in src/lib/data/shirts.ts return listed shirts only, with an
  `includeUnlisted` option. T009 passes.
- [X] T011 [P] Write failing tests/integration/materialize.test.ts (`MEDIA_UPLOADS_DIR` pointed at a
  temp dir):
  - **The shirt**: a dial recipe becomes an active, unlisted `dial` shirt, and an owner recipe a
    resting, listed `owner` shirt.
  - **Its art**: an uploaded SVG byte-equal to `generate`, a media row, and `shirt_images` at
    position 0.
  - **Its price**: the counted score, priced at the MSRP.
  - **Once only**: the same recipe returns the same id and writes no new rows or files.
  - **Refusals, writing nothing**: scores past `maxDial` or unpriceable under steep tuning, and a
    bland-rule break (anchor 0).
  - **Names**: colliding names get II; the slug is a kebab-case name with a code fragment.
  - **SC-006**: `auditCatalog` reports 0 errors after 50 materializations across the range.
- [X] T012 Create src/lib/pattern/materialize.ts, per R6. T011 passes.

**Checkpoint**: the generator, codes, names and materializing exist and are fully tested. The store
is unchanged except that unlisted shirts never list.

---

## Phase 3: User Story 1 - How Complicated Can It Get? (Priority: P1) 🎯 MVP

**Goal**: the dial: step by step, the badge and price climb, with shuffle, style, share links and
the unpriceable top, and never a score.

**Independent Test**: quickstart 1–8 and 14; e2e dial (US1).

### Tests for User Story 1 ⚠️

- [X] T013 [P] [US1] Write failing tests/integration/dial-view.test.ts for
  `buildDial(db, { r, seed, style })`:
  - 102 steps, and no step has a `score` or `complexity` key
  - prices are non-decreasing; step 101 has a null price
  - step 0 is BLAND
  - a materialized recipe's step carries `made`, with its current price, even after the owner
    re-scores it
  - an invalid `r` falls back to the default; a code between steps snaps to the nearest step
  - the switch off returns null
- [X] T014 [P] [US1] Write failing tests/integration/dial-route.test.ts for
  `GET /how-complicated/art/[code]`: SVG byte-equal to `generate` for a valid code, the stored art
  for a made shirt, `nosniff`, and a 404 for junk, beyond, or the switch off.
- [X] T015 [P] [US1] Write failing tests/e2e/dial.spec.ts (US1 journeys):
  - `/shirts` and `/` link to the dial
  - steps 0, 10, … 100 give non-decreasing prices, and badges that move up through the tiers
  - step 0 is BLAND copy
  - Shuffle changes the art at the same tier; the style toggle switches the silhouette
  - the URL reopens the same art, badge and price in a fresh context
  - step 101 shows "That's too complicated to price, even for Dan." with Make it mine disabled
  - at 360px with Extreme Awesomeness on, the price, badge and button are steady, with no sideways
    scroll
  - the top step's preview draws in under 2 s

### Implementation for User Story 1

- [X] T016 [US1] Create src/lib/pattern/dial-view.ts (`buildDial`, per R4) and src/app/_data/dial.ts
  (`loadDial`: `connection()`, `notFound()` while off). T013 passes.
- [X] T017 [US1] Create src/app/how-complicated/art/[code]/route.ts. T014 passes.
- [X] T018 [US1] Build the store side:
  - src/components/Dial.tsx (client): a range input 0–101 with `aria-valuetext` set to the tier
    name, Shuffle, the style toggle, the preview `<img>` on settle, URL replace, and `data-steady`
    price, badge and button
  - src/app/(store)/how-complicated/page.tsx
  - `copy.dial` (store voice)
  - the switch-gated calls to action in src/app/(store)/shirts/page.tsx and src/app/(store)/page.tsx

  The US1 journeys in T015 pass.

**Checkpoint**: the dial works end to end, read-only.

---

## Phase 4: User Story 2 - Buy the Monster (Priority: P2)

**Goal**: "Make it mine" turns the setting into the one real shirt and goes to its page, where he
buys it like any shirt.

**Independent Test**: quickstart 9–13; e2e dial (US2).

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Write failing tests/integration/make-it-mine.test.ts for `makeItMineCore(db, form)`:
  - it materializes and returns the slug; the same code twice gives the same slug
  - it's refused while the switch is off, and for an invalid or beyond code
  - step 0 makes a BLAND shirt, whose page runs the loop
  - a materialized shirt can be bought by Flash Credit and by split (`placeOrder`, FR-016; analysis
    G1)
  - a setting whose shirt the owner rested lands on that shirt, now retired (analysis U1)
- [X] T020 [P] [US2] Extend tests/e2e/dial.spec.ts (US2 journeys):
  - **Make it mine**: it lands on the shirt's page (name, art, badge, price); the same setting
    again lands on the same page
  - **Buying**: add XL and check out by card (Flash Credit is covered by 001); order history shows
    the art
  - **One of a kind**: `/shirts` and `/` never show it
  - **BLAND**: the BLAND step's page runs the "You sure about that?" loop
  - **No score**: the made shirt's score, read from data/e2e.db, appears on none of its pages and in
    no `r` link

### Implementation for User Story 2

- [X] T021 [US2] Create src/lib/actions/dial.ts (`makeItMineCore`) and src/actions/dial.ts (the
  wrapper, which redirects to `/shirts/<slug>`). Wire up Make it mine in `Dial`. T019 and T020
  pass.

---

## Phase 5: User Story 3 - Dan's Generator (Priority: P3)

**Goal**: the owner generates shirts in the console, sees and filters generated shirts, re-scores
them, and lists or unlists the shopper-made ones.

**Independent Test**: quickstart 15–19; e2e admin generator.

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Write failing tests/integration/admin-generator.test.ts:
  - **`saveGeneratedShirtCore`**: creates a resting, listed `owner` shirt with the given name and
    the counted score. Refused: out of range, unpriceable, a recipe already made (the message links
    to it), a name outside 1–80 characters.
  - **`setShirtListedCore`**: dial shirts only, toggles `listed`, and the listing follows.
  - **`listAdminShirts`**: has `origin`, and the origin filter works.
  - **`GET /admin/generator/art/[code]`**: SVG for an admin (switch off too); a 404 for a shopper
    or a guest, with the session read from the Request's Cookie header.

  Add both cores to the tests/integration/admin-door.test.ts sweep.
- [X] T023 [P] [US3] Write failing tests/e2e/admin/generator.spec.ts:
  - generate score 48 polo; Shuffle changes the preview; Save lands on the editor, resting, marked
    "Generated by you"
  - put it on the floor, and the store shows it
  - a shopper-made shirt (made from the dial in a guest context) appears under `?origin=dial`; List
    puts it in `/shirts`, and Unlist takes it out
  - changing a generated shirt's score changes its store price
  - add `/admin/shirts/generate` and `/admin/shirts/generate?score=48` to `CONSOLE_PAGES` in
    tests/e2e/admin/helpers.ts, so 008's door, calm and 360px sweeps cover the generator (FR-022,
    FR-024; analysis G2)

### Implementation for User Story 3

- [X] T024 [US3] Build the console's data and actions:
  - src/lib/actions/admin/generator.ts (`saveGeneratedShirtCore`, `setShirtListedCore`) and their
    wrappers in src/actions/admin.ts
  - src/app/admin/generator/art/[code]/route.ts
  - `origin` and `listed` in src/lib/data/admin-shirts.ts, with the origin filter
  - origin marks in `ShirtTable`
  - `copy.console.generator`

  T022 passes.
- [X] T025 [US3] Build the console's pages: src/app/admin/shirts/generate/page.tsx,
  src/components/admin/GeneratorForm.tsx, and src/components/admin/ListedControl.tsx (on the
  editor, dial shirts only). Add a "Generate one" link and the origin filter on `/admin/shirts`.
  T023 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Update the README: the dial and the console generator, the `pattern_generator` row
  in the switch table, and that `art:generate` shares the silhouettes.
- [X] T027 [P] Hand-check `Dial`, `GeneratorForm` and `ListedControl` in `next dev` under React
  Strict Mode, on a scratch database. There should be no console errors or warnings.
- [X] T028 [P] Run Lighthouse on `/how-complicated` (mobile, applied throttling): LCP ≤ 2.5 s,
  CLS ≤ 0.1. Record the numbers.
- [X] T029 Script the quickstart scenarios e2e doesn't cover, on a scratch database (an owner
  re-score reprices, the switch off, `catalog:audit` = 0 errors). Record the results in
  quickstart.md, noting that SC-004 (under 2 minutes) and SC-005 (a mid-range phone) are
  approximated by the e2e timings and phone emulation (analysis A1).
- [X] T030 Run `npm run verify` until it's green. Record the counts and the coverage.
  - **Result (2026-10-19)**: green on the second run. Unit and integration: 89 files, 955 tests.
    E2E: 142 tests, desktop, phone and the console. Coverage: statements 94.25%, branches 91.8%,
    functions 88.92%, lines 95.12%.
  - **The first run's one failure**: 001's browse filter test on desktop. Its trace shows every
    request waiting about 15 s early in the run, under 7 workers. It passed on phone in the same
    run, and on both in the second. The dial's server work isn't the cause: the 101-step dial
    builds in 2–4 ms, and art at the 120,000 maximum draws in 16 ms.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T012)** blocks every story:
  - T002 ∥ T003 → T004
  - T005 ∥ T006 → T007 → T008
  - T009 → T010
  - T011 → T012 (it needs T004, T007 and T008)
- **US1 (T013–T018)** comes next, then **US2 (T019–T021)**, which needs US1's dial. **US3
  (T022–T025)** needs only Foundational and can run beside US1 and US2.
- **Within each story**: tests first (they fail), then lib, then the route or action, then UI.
- **Polish (T026–T030)** comes last.

### Parallel opportunities

- T002 ∥ T003, T005 ∥ T006, T009 ∥ T011
- Each story's tests (T013–T015, T019–T020, T022–T023)
- US3 beside US1 and US2

## Implementation Strategy

1. **MVP**: Setup, Foundational, US1. Shoppers can turn the dial and see how complicated it gets.
2. **Then**: US2 (buy it), then US3 (Dan's generator).
3. **Polish**: then verify, converge, and a PR that also ratifies constitution v4.2.0.

---

## Phase 7: Owner Review Round (spec Q4–Q9, 2026-10-19)

**Goal**: shopper-made shirts are made to order for their maker, the Uniquity Surcharge™ is
charged on each, Dan mass-produces shopper creations, generated art is as busy as the seed shirts,
the dial's link sits under the filters, and the console generator has a slider.

**Independent Test**: quickstart 21–30, and the amended e2e journeys.

⚠️ T038–T039 touch money (cart totals, checkout, orders): tests first (constitution VI), and T044
analyzes the money before polish.

### Foundation

- [X] T031 Migration `0013_made_to_order` and src/lib/db/schema.ts, test-first in
  tests/integration/migration-0013.test.ts:
  - `shirts.maker_user_id` (FK users, CHECK `origin = 'dial' OR maker_user_id IS NULL`; the
    rebuild copies every row), backfilled from each dial shirt's earliest order
  - `store_settings.uniquity_surcharge` (default true) and `uniquity_surcharge_usd` (default
    `'499.99'`)
  - `orders.surcharge_usd` and `order_items.surcharge_usd` (NOT NULL, default `'0.00'`)

  Plumb the `uniquitySurcharge` switch and amount through the settings types, validation, the
  settings reader, seed data, the fixtures, `setSwitches`, the 15-key switchboard and its copy.
  Update the switch-count tests to 15.

### The art (R1, R13)

- [ ] T032 [P] Amend tests/unit/pattern-generate.test.ts and tests/unit/pattern-dial.test.ts first:
  - the count is `⌊points ÷ 10⌋ + 5 × extra colors + 10 × extra layers`, exact over 1,000 recipes
    and up to `ART_MAX_SCORE` (24,000)
  - at score 130 there are at least 200 shapes, and the shape count never falls as the score climbs
    (sampled)
  - under 1 MB at the default top, under 2 MB at the art limit
  - the bland and loud palettes, determinism and no metadata, as before
- [ ] T033 Recalibrate src/lib/pattern/count.ts, generate.ts and dial.ts (`ART_MAX_SCORE = 24_000`)
  to the scratch prototype (R1). T032 passes, and so do the dial, route and materialize tests.

### Made to order (R14, R16)

- [ ] T034 [P] Write failing tests/integration/made-to-order.test.ts:
  - **`makeItMineCore`**: a guest gets the sign-in redirect and nothing is made. A signed-in
    shopper becomes the maker. An unmade-by-anyone shirt is claimed. Someone else's stays theirs.
  - **`canBuy` everywhere**: the maker adds any quantity. Anyone else, or a guest cart, is refused
    `NOT_YOURS` on an add and on a raise. The audit takes out such lines with reason `unique`
    (after a sign-in merge, or after Dan makes it one of a kind again). `placeOrder` refuses with
    `CART_AUDITED`.
  - **Mass production**: anyone can buy it. Owner-generated and catalog shirts are unaffected.
  - **The dial**: a made setting says whether it's his.
- [ ] T035 Build it: `materialize` takes a maker. `makeItMineCore` takes the user, and the wrapper
  redirects a guest to sign in with the dial setting as `next`. Add `canBuy` and the guards in
  src/lib/cart/cart.ts (`NOT_YOURS`, removal reason `unique`, with copy). Give the shopper shirt a
  `oneOfAKind` flag and keep the maker server-side. `buildDial` marks `made.mine`. T034 passes.
- [ ] T036 [P] Write failing unit tests:
  - scarcity's `made` and `madeMany` lines
  - `socialProofFor` is null for a one-of-a-kind shirt
  - the add message on a one-of-a-kind shirt says "make another"
- [ ] T037 Build the urgency changes and the shirt page's two states:
  - **For the maker**: the made-to-order stock line, the surcharge note, the size picker and Add to
    Cart.
  - **For anyone else**: "One of a kind, and it's someone else's.", plus a sign-in link for a guest.
  - The cart page's stock lines and removal notices.

  T036 passes.

### The Uniquity Surcharge™ (R15, money)

- [ ] T038 [P] Write failing tests first:
  - tests/unit/checkout-totals.test.ts: `orderTotals` with a surcharge
  - tests/integration/uniquity-surcharge.test.ts:
    - the cart view's surcharge is the amount × quantity on one-of-a-kind lines only, with nothing
      while the switch is off or after mass production
    - `placeOrder` by card, by Flash Credit and split: total = shirts + surcharges + add-ons, to the
      cent
    - a changed amount or a flipped switch is `PRICE_CHANGED`
    - the order keeps the surcharge per line and in all, and the order view shows its line
    - `saveSurchargeCore` validates the amount, and joins tests/integration/admin-door.test.ts
- [ ] T039 Build it:
  - src/lib/cart/cart.ts: the surcharge per line, and in all, on the cart view and checkout lines
  - src/lib/checkout/totals.ts and place-order.ts: the total, the check and the snapshot
  - src/lib/orders/orders.ts and `OrderSummary`: the "Uniquity Surcharge™ × N" line on the cart,
    checkout, receipt and history
  - `CheckoutForm`'s expected total
  - the console Settings surcharge form, `saveSurcharge` and its wrapper, and the switchboard's 15th
    row

  T038 passes.

### Console and store

- [ ] T040 Mass production and the slider, test-first where it's logic:
  - `ListedControl` becomes "Put it into mass production" or "Make it one of a kind again"
  - the editor shows the maker, linked to the customer
  - the list marks a mass-produced shirt, and has a "Review shopper creations" link
  - `ScoreField`: a number box plus a slider spaced through `scoreAtStep`, on
    /admin/shirts/generate

  Update tests/integration/admin-generator.test.ts.
- [ ] T041 Move `DialCta` under the filters on /shirts (the sidebar, and under the toggle on a
  phone).

### E2E and polish

- [ ] T042 Amend the e2e:
  - **tests/e2e/dial.spec.ts**:
    - the guest's Make it mine goes to sign-in, then back to the setting
    - signed in, a made shirt shows the made-to-order line, no crowd and the surcharge note
    - the cart, checkout and order show the surcharge line, and the total includes it
    - quantity 2 pays it twice
    - another account sees "someone else's" and no Add to Cart
    - the BLAND journey signs in first
  - **tests/e2e/admin/generator.spec.ts**: the shopper creation comes from a signed-up context;
    mass-produce, then one of a kind again; the maker link; the slider moves the score box
  - **tests/e2e/browse.spec.ts**: the dial's link sits under the filters
  - **switchboard**: 15 switches, and the surcharge amount saves
- [ ] T043 Update the README and quickstart.md (scenarios 21–30): made to order, the surcharge row
  in the switch table, mass production, the art's density and budgets, and the slider.
- [ ] T044 Analyze the money: run `/speckit-analyze` on the amended artifacts, and audit the
  surcharge's path from cart to receipt by hand. Record the findings and how they were fixed.
- [ ] T045 On a scratch database in `next dev`:
  - a Strict Mode pass over the new and changed client components
  - the scripted quickstart 21–30
  - Lighthouse on `/how-complicated`, whose art is heavier now

  Record the results.
- [ ] T046 Run `npm run verify` until it's green. Record the counts and the coverage.

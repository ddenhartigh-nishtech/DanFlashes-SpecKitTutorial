# Tasks: Brand Pages & Bland-Shirt Shaming

**Input**: Design documents from `/specs/002-brand-pages-and-shaming/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-13, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- Each test task comes before its implementation and MUST be seen failing first.
- Every new `src/lib` module gets unit or integration tests.
- Every user story gets an e2e journey at desktop and phone viewports.
- e2e uses the default switches (both on) and never toggles them in the shared e2e database. "Off"
  behavior is covered by unit and integration tests (R7).

**Scale note**: the seed has two BLAND shirts, Beige Regret (score 2) and Khaki Commitment (6). The
ladder starts at Geo Riot (12) and tops out at Dan's Masterpiece (130). e2e assertions may rely on
that order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US3)

---

## Phase 1: Setup

- [X] T001 Run `npm run verify` on the branch before changing anything, so later failures are known to be new. Record the result in the PR notes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the two switches and the shared label helper. US1 and US2 both need them.

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts. `validateSettings` must:
  - accept `blandShaming` and `confirmshaming` as booleans
  - report an issue for each when it is missing or not a boolean
- [X] T003 [P] Write failing unit tests in tests/unit/shaming-labels.test.ts for `labelFor(key, confirmshaming)`. For each key, `true` returns the shamed label and `false` the neutral one, with exact strings from spec Assumptions:
  - `insist`: "Yes, I'd rather blend in" / "Yes, I'm sure"
  - `remove`: "Remove (and lose your edge)" / "Remove"
  - `signOut`: "Sign out (go back to being normal)" / "Sign out"
- [X] T004 Add `blandShaming: boolean` and `confirmshaming: boolean` to `StoreSettings` in src/lib/catalog/types.ts, and `z.boolean()` for both to `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [X] T005 Add the columns to `storeSettings` in src/lib/db/schema.ts:
  - `blandShaming: integer("bland_shaming", { mode: "boolean" }).notNull().default(true)`
  - `confirmshaming: integer("confirmshaming", { mode: "boolean" }).notNull().default(true)`

  Then run `npx drizzle-kit generate --name shaming_switches` to produce drizzle/0001_shaming_switches.sql. Per data-model.md it must be `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT 1`, with no table rebuild.
- [X] T006 Wire the switches through, using `blandShaming: true, confirmshaming: true` for both seed sources:
  - read and write both in `getSettings` / `saveSettings` in src/lib/data/settings.ts
  - add them to the seed settings in scripts/seed-data.ts and tests/fixtures/catalog.ts
- [X] T007 Write an integration test in tests/integration/settings-switches.test.ts:
  - a `store_settings` row inserted with raw SQL that omits the new columns reads both switches as `true`
  - `saveSettings` round-trips both as `false`
- [X] T008 [P] Add `setSwitches(db, patch: Partial<Pick<StoreSettings, "blandShaming" | "confirmshaming">>)` to tests/helpers/db.ts. It reads with `getSettings`, merges, and writes with `saveSettings`.
- [X] T009 Add `copy.shame.labels` (the three `{ shamed, neutral }` pairs from T003) to src/lib/copy.ts. Implement `labelFor(key: keyof typeof copy.shame.labels, confirmshaming: boolean): string` in src/lib/shaming/labels.ts (T003 passes).

**Checkpoint**: settings carry both switches (default on), migration 0001 exists, `labelFor` works, and the existing suite is still green.

---

## Phase 3: User Story 1 - "You Sure About That?" (Priority: P1) 🎯 MVP

**Goal**: with shaming on, a BLAND shirt can never be added. Trying opens an endless dialog that climbs to the most complicated shirt. The store keeps bland shirts out of every cart: adds and quantity raises are refused, sign-in merges skip them, and bland lines already in a cart are pulled with a notice.

**Independent Test**: quickstart scenarios 3–7, 10 and 11.

### Tests for User Story 1 (write first; they must fail)

- [X] T010 [P] [US1] Unit tests in tests/unit/shaming-loop.test.ts:
  - `buildLadder(shirts)`:
    - drops BLAND and inactive shirts
    - orders by ascending complexity, one shirt per distinct score
    - output objects have **no** `complexity` or `msrpUsd` key (constitution II)
  - `recommendationFor(round, ladder)`: rounds count from 1. Round 1 returns `ladder[0]`, each round climbs one step, it stays on the last entry once past the end, and it returns `null` for an empty ladder.
  - `lineOrder(poolSize, random, previous)`, with a seeded `random`:
    - returns a permutation of `0..poolSize-1`
    - its first entry is never `previous` when `poolSize > 1`
    - is deterministic
  - `shameFor({ isBland, blandShaming, confirmshaming }, ladder)` returns `null` unless the shirt is bland and `blandShaming` is on. Otherwise it returns `{ ladder, insistLabel }`, where the label follows `confirmshaming`. Cover all eight on/off combinations: this proves the switches are independent (FR-012) and that each tactic disappears when its switch is off (SC-005).
- [X] T011 [P] [US1] Integration tests in tests/integration/bland-refusal.test.ts, using `createSeededTestDb` and `setSwitches`:
  - with shaming on, `addItem` of a BLAND shirt returns `BLAND_REFUSED` and writes no cart line
  - with shaming on, for a bland line added while shaming was off:
    - `updateItem` raising its quantity returns `BLAND_REFUSED` and leaves the quantity unchanged
    - `auditCart` removes it and reports `{ reason: "bland" }`, and `getCartView` lists it in `removed`
    - `placeOrder` returns `CART_AUDITED` with the bland line in `removed` and writes no order (US1-8)
  - `auditCart` still reports retired shirts with `{ reason: "retired" }`
  - with shaming on, `mergeGuestCart` doesn't carry the guest's bland lines into the account's cart, and an existing bland line there doesn't grow. Non-bland lines merge as in 001.
  - with shaming off, the following behave exactly as in 001 (FR-011):
    - a BLAND shirt adds normally
    - `auditCart` keeps bland lines
    - `mergeGuestCart` carries bland lines over
  - a non-bland shirt adds normally either way
  - re-tiering a shirt into BLAND (raising the second tier's `min_score` above its score) makes the next add refused, because blandness is decided at the moment of the add
  - `addToCartCore` and `updateCartItemCore` return `{ ok: false, code: "BLAND_REFUSED", message: copy.codes.BLAND_REFUSED }`
- [X] T012 [P] [US1] e2e journey in tests/e2e/shaming.spec.ts (desktop and phone):
  - **Opening the dialog**: on `/shirts/beige-regret`, pick S and click Add to cart. The `shame-dialog` is open with "You sure about that?", a line, and Geo Riot as the recommendation.
  - **Insisting**: click the insist button ("Yes, I'd rather blend in") 20 times. Each click advances `data-round`. No line repeats within one pass through the pool. The recommendation climbs the seed order and stays on Dan's Masterpiece.
  - **Leaving**: Escape closes the dialog, and so does "Fine. I'll look at real shirts". The URL stays on beige-regret.
  - **Taking it**: taking the recommendation lands on that shirt's page.
  - **Cart unchanged**: after all of it, `/cart` shows the empty-cart state.
  - **Non-bland shirt**: adding Geo Riot still shows "It's in the cart. Excellent decision." in one click (SC-006).
  - **Phone**: the dialog has no horizontal overflow at 360px wide.

### Implementation for User Story 1

- [X] T013 [US1] Add `isBlandShirt(db, shirtId): boolean` to src/lib/data/shirts.ts: `isBlandTier(tierOf(complexity, listTiers(db)))` for that shirt row
- [X] T014 [US1] Add `"BLAND_REFUSED"` to `CartErrorCode` in src/lib/cart/cart.ts:
  - `addItem`: after the inactive check, return it when `getSettings(db).blandShaming && isBlandShirt(db, shirt.id)`
  - `updateItem`: read the line's current quantity, and return it when the new quantity is greater and the same condition holds
  - neither writes nor touches the cart when refusing
  - `RemovedLine` gains `reason: "retired" | "bland"`. While `blandShaming` is on, `auditCart` also deletes bland lines and reports them with `reason: "bland"`. `placeOrder` already audits first, so bland lines can't be bought.
  - `mergeGuestCart` skips the guest's bland lines while `blandShaming` is on
- [X] T015 [US1] Add `copy.codes.BLAND_REFUSED` (brand voice, e.g. "Dan Flashes does not sell boring shirts. Not to you. Not to anyone.") to src/lib/copy.ts. T011 passes.
- [X] T016 [US1] Show the bland removals:
  - add `copy.cart.blandRemovedNotice` to src/lib/copy.ts in voice, e.g. "Dan took these out of your cart. You'll thank him later:"
  - reword `copy.codes.CART_AUDITED` so it covers both retired and bland removals
  - in src/app/cart/page.tsx, have `RemovedNotice` list `reason: "bland"` lines under `blandRemovedNotice` and `reason: "retired"` lines under 001's `removedNotice`
- [X] T017 [US1] Fix the existing tests that 002 breaks:
  - shaming is on by default, so tests that add a BLAND shirt need updating:
    - call `setSwitches(db, { blandShaming: false })` where the test needs a bland line: tests/integration/cart.test.ts (the BLAND badge in the cart view) and tests/integration/cart-audit.test.ts
    - swap to a non-bland shirt where blandness doesn't matter: tests/integration/cart-merge.test.ts and tests/integration/actions-cart.test.ts
  - add `reason: "retired"` to expected `RemovedLine`s in tests/integration/cart-audit.test.ts and tests/integration/place-order-card.test.ts
- [X] T018 [P] [US1] Implement `recommendationFor`, `lineOrder` and `shameFor` in src/lib/shaming/loop.ts as pure functions with no framework imports (`shameFor` uses `labelFor` from T009). Implement `buildLadder` in src/lib/shaming/ladder.ts, which is server-side because it imports the catalog layer's `toShopperShirt`; this keeps the browser bundle free of Drizzle and Zod. Ties on score keep the higher-priced shirt. T010 passes.
- [X] T019 [US1] Add the rest of `copy.shame` to src/lib/copy.ts, all in voice and never explaining the joke:
  - `title` "You sure about that?"
  - `lines`: at least 8 disparaging lines about the man who wears bland shirts
  - `relent` "Fine. I'll look at real shirts"
  - `takeIt`, e.g. "Okay. Show me the complicated one"
  - `nothingBetter`, the escape label when the ladder is empty, linking to `/shirts`
- [X] T020 [US1] Extend `loadShirt` in src/app/_data/storefront.ts to also return:
  - `blandShaming` and `confirmshaming` from settings
  - `ladder`: `buildLadder(listCatalogShirts(db))` only when the shirt is BLAND and shaming is on, otherwise `[]`
- [X] T021 [US1] Create the `ShameDialog` client component in src/components/ShameDialog.tsx on native `<dialog>` with `showModal()` (R4):
  - **Props**: `open`, `onClose`, `ladder: ShopperShirt[]`, `insistLabel`
  - **Each round shows**:
    - the title
    - the current line, drawn from a `lineOrder` queue built in the open/insist handlers, never during render (no hydration mismatch); a new cycle starts with `previous` set to the last line shown
    - the recommendation card (`ShirtImage`, `ShirtBadge`, `PriceTag`, name), plus a `takeIt` link to `/shirts/[slug]`, or `nothingBetter` → `/shirts` when the ladder is empty
  - **Buttons**:
    - relent closes the dialog
    - the dialog's `cancel` event (Escape) also closes it, which counts as relenting
    - insist advances the round and never calls the server
  - **Test hooks**: `data-testid` `shame-dialog`, `shame-line`, `shame-recommendation`, and `data-round` on the dialog (it is `1` when the dialog opens)
  - **Styling**: loud tokens; scrolls inside the dialog with a max height so it fits at 360px
- [X] T022 [US1] Update `AddToCart` in src/components/AddToCart.tsx with a new prop, `shame: { ladder: ShopperShirt[]; insistLabel: string } | null`:
  - when `shame` is set and a size is picked, `onSubmit` calls `preventDefault()` and opens `ShameDialog` instead of running the action
  - with no size picked, submit normally so 001's `SIZE_REQUIRED` message still shows
  - `null` keeps 001 behavior exactly
- [X] T023 [US1] In src/app/shirts/[slug]/page.tsx, pass `shame={shameFor({ isBland: shirt.tier.isBland, blandShaming, confirmshaming }, ladder)}` to `AddToCart`. The page holds no switch logic of its own. T012 passes.
- [X] T024 [US1] In tests/e2e/card-checkout.spec.ts, replace `addShirt(page, "beige-regret", "S")` and the "Beige Regret" summary assertion with `paisley-panic` / "Paisley Panic"

**Checkpoint**: US1 works on its own, and `npm run verify` is green.

---

## Phase 4: User Story 2 - Confirmshaming (Priority: P2)

**Goal**: the loop's insist button, cart Remove, and Sign out carry shaming labels while confirmshaming is on, and neutral labels while it is off. Behavior is identical either way.

**Independent Test**: quickstart scenarios 8 and 9.

### Tests for User Story 2 (write first; they must fail)

- [X] T025 [P] [US2] e2e journey in tests/e2e/confirmshaming.spec.ts (desktop and phone):
  - **Remove**: a guest adds Geo Riot. The cart line's button reads "Remove (and lose your edge)", and clicking it empties the cart.
  - **Sign out**: after sign-up, `/account` shows "Sign out (go back to being normal)", and clicking it signs out (`/account` then redirects to sign-in).
  - **Insist**: the insist button on beige-regret's dialog reads "Yes, I'd rather blend in".

### Implementation for User Story 2

- [X] T026 [US2] In src/app/cart/page.tsx, read `getSettings(db).confirmshaming` in `CartContents` and label each line's Remove button with `labelFor("remove", confirmshaming)`. Delete the now-unused `copy.cart.remove` from src/lib/copy.ts.
- [X] T027 [US2] In src/app/account/page.tsx, label the Sign out button with `labelFor("signOut", settings.confirmshaming)`. Delete the now-unused `copy.auth.signOut` from src/lib/copy.ts.
- [X] T028 [US2] Update the existing e2e locators that match the old exact labels to the shamed defaults:
  - `name: "Sign out"` in tests/e2e/card-checkout.spec.ts
  - `name: "Remove"` in tests/e2e/zoom-and-cart.spec.ts

  T025 passes.

**Checkpoint**: US1 and US2 both work, and `npm run verify` is green.

---

## Phase 5: User Story 3 - About Dan (Priority: P3)

**Goal**: an About page with Dan's bio and a live Exhibit A, linked from the header on every page.

**Independent Test**: quickstart scenarios 1 and 2.

### Tests for User Story 3 (write first; they must fail)

- [ ] T029 [P] [US3] e2e journey in tests/e2e/about.spec.ts (desktop and phone):
  - **Navigation**: from `/` and from a shirt page, the header's "About" link opens `/about`. On phone, open Menu first.
  - **Bio**: the three bio sections are visible.
  - **Exhibit A**: the `exhibit-a` section shows Dan's Masterpiece with its tier badge and price, and its link opens `/shirts/dans-masterpiece`.
- [ ] T030 [P] [US3] Add a case to tests/unit/listing.test.ts: when the priciest shirt is inactive, `mostExpensive` returns the next priciest active shirt (Edge Case: Exhibit A deactivated)

### Implementation for User Story 3

- [ ] T031 [US3] Add to src/lib/copy.ts, in Dan's egocentric voice and never explaining the joke (FR-002, FR-015):
  - `copy.nav.about` "About"
  - `copy.about`: `title`, `heading`, three `sections` (`{ heading, body }`: who he is, the method — complexity, always more complexity — and why the prices are generous), and `exhibitA` (heading plus a one-line intro)
- [ ] T032 [US3] Create src/app/about/page.tsx:
  - `metadata.title` from `copy.about.title`
  - the bio sections rendered statically from `copy.about`, so they're in the static shell (R6, constitution VII)
  - a `<Suspense>` Exhibit A section (`data-testid="exhibit-a"`) that calls `loadStorefront()` → `mostExpensive()` → `toShopperShirt()` → `ShirtCard` (`headingLevel={3}`), and is omitted when there's no active shirt
  - loud tokens, responsive from 360px
- [ ] T033 [US3] Add `{ href: "/about", label: copy.nav.about }` to `links` in src/components/SiteHeader.tsx, which covers both the desktop nav and the phone menu. T029 passes.

**Checkpoint**: all three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Document both switches in README.md (store settings section: the `store_settings.bland_shaming` / `confirmshaming` columns, both on by default, edited in Drizzle Studio) and the `npm run db:migrate` step after pulling. Mark 002 in progress in ROADMAP.md.
- [ ] T035 Constitution VII spot check: run Lighthouse (mobile) on `/about` and `/shirts/beige-regret` against a production build. Both pages must have CLS ≤ 0.1 and LCP ≤ 2.5 s, measured with applied throttling. For reference, 001's `/shirts` measured 2.2 s. Opening the dialog must cause no layout shift.
- [ ] T036 Run quickstart.md scenarios 1–11 by hand (dev server plus Drizzle Studio for 9–11) and note the results
- [ ] T037 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage ≥ 90% on `src/lib`, including `src/lib/shaming/`.

---

## Phase 7: Developer Experience (owner request, 2026-10-13)

**Why**: after pulling US1, the owner's homepage 500'd. The database was one migration behind, and nothing said so. A `db:reset` fixed it but lost Demo Dan.

- [X] T038 Write an integration test in tests/integration/db-health.test.ts, then implement src/lib/db/health.ts:
  - `pendingMigrations(sqlite)` uses drizzle's own rule: journal entries newer than the newest applied `created_at`
  - `assertCurrent(sqlite, file)` throws, naming the file, the missing migrations, and `npm run db:migrate`
  - `startupProblems(file)` is read-only, so looking never creates the file. It reports a missing file (`db:reset`), pending migrations, and missing store settings.
  - `diagnose(error)` returns a plain-English fix for known SQLite errors: no such column/table, locked, can't open
- [X] T039 Wire the diagnostics into the app:
  - `getDb()` in src/lib/db/client.ts calls `assertCurrent`, re-checked whenever the migration journal changes, so a running dev server notices a pull and recovers after `db:migrate`
  - src/instrumentation.ts `register()` logs `startupProblems` at server start (skipped during `next build`)
  - `onRequestError` adds one `[Dan Flashes] … Fix:` line per recognized error (deduped for 5 s, because Next already logs the error itself)
  - src/app/error.tsx and global-error.tsx log a browser-console pointer to the terminal, with the digest
  - the 500 page itself is unchanged
- [X] T040 Make `db:reset` recreate Demo Dan: move the demo shopper to `DEMO_SHOPPER` in scripts/seed-data.ts, call `ensureDemoShopper` from scripts/db-reset.ts (`db:seed-demo` reuses it), and update README.md with the quick start plus a "When a page 500s" section

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001)** comes first.
- **Foundational (T002–T009)** blocks every story:
  - T004 depends on T002.
  - T005 → T006 → T007.
  - T008 depends on T006.
  - T009 depends on T003.
- **US1 (T010–T024)** needs Foundational. Within it:
  - the tests (T010–T012) come first
  - T013 → T014 → T015 → T016 → T017
  - T018 is independent
  - T019 → T021
  - T020 depends on T018
  - T021 → T022 → T023
  - T024 can run any time after T014
- **US2 (T025–T028)** needs Foundational, and needs T021/T022 for the insist label (or run it after US1).
- **US3 (T029–T033)** needs only Foundational.
- **Polish (T034–T037)** comes after the stories you are shipping.

### User story dependencies

- **US1** is independent after Foundational.
- **US2**: its Remove and Sign out labels are independent, but the insist label is rendered by US1's dialog.
- **US3** is fully independent.

### Parallel opportunities

- **Foundational**: T002, T003 and T008 can run together.
- **US1 tests**: T010, T011 and T012 can run together, then T018 alongside the T013–T017 chain.
- **Across stories**: US3 (T029–T033) can run in parallel with US1 once Foundational is done.

## Parallel Example: User Story 1

```text
Task: "Unit tests for buildLadder / recommendationFor / lineOrder in tests/unit/shaming-loop.test.ts"
Task: "Integration tests for BLAND_REFUSED in tests/integration/bland-refusal.test.ts"
Task: "e2e endless loop in tests/e2e/shaming.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1. Stop and validate with quickstart 3–7, 10 and 11. Bland shirts are now unsellable while shaming is on.
2. **Then** US2: the labels.
3. **Then** US3: the About page.
4. **Then** Polish, converge, and open a PR to main.

## Notes

- The complexity score never leaves the server. The ladder and Exhibit A are shopper-shaped.
- No new dependencies (constitution VIII).
- Commit after each phase checkpoint.

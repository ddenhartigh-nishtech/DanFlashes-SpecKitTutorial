# Tasks: Core Storefront

> ⚠️ **STALE (2026-10-13)**: the plan changed after the owner's review. The catalog moved from JSON
> files to SQLite, and media, backups, Prettier, responsive layout, and the 404/500/418 pages were
> added. Money also changed to exact dollars (big.js), BLAND became the lowest tier, and tiers gained
> styling. Regenerate this file with `/speckit-tasks` once the plan review is finished. Don't
> implement from it.

**Input**: Design documents from `/specs/001-core-storefront/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED (constitution v3.0.0, Principle VI). Money paths are test-first: each test task
listed before its implementation MUST be written and seen failing first. Every `src/lib` module and
Server Action gets tests, and every user story gets an e2e journey. `npm run verify` is the
one-glance health check.

**Organization**: tasks are grouped by user story so each story can be implemented and tested on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US4)

## Path Conventions

Single Next.js project at the repo root. App code is in `src/`, catalog data in `catalog/` and
`config/`, utility scripts in `scripts/`, and tests in `tests/` (see plan.md → Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Scaffold Next.js 16 into the repo root with `npx create-next-app@16 . --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --use-npm`. Scaffold into a temp dir and copy in if the CLI refuses a non-empty folder. Preserve the existing `.specify/`, `.claude/`, `specs/`, `README.md`, `ROADMAP.md`, and `.gitignore` (merge its rules into the generated one).
- [ ] T002 Install runtime deps `drizzle-orm better-sqlite3 zod bcryptjs` and dev deps `drizzle-kit @types/better-sqlite3 vitest @vitest/coverage-v8 @playwright/test tsx` in package.json
- [ ] T003 [P] Configure Vitest in vitest.config.ts: `@/*` → `src/*` alias, include `tests/unit/**` and `tests/integration/**`, node environment, v8 coverage over `src/lib/**` with a `lines: 90` threshold
- [ ] T004 [P] Configure Playwright in playwright.config.ts: testDir `tests/e2e`, chromium only, `webServer` command `npm run db:reset && npm run dev -- -p 3100` with env `DATABASE_PATH=data/e2e.db`, and baseURL `http://localhost:3100`
- [ ] T005 [P] Add `data/`, `coverage/`, `test-results/`, `playwright-report/` to .gitignore, and create .env.example documenting `DATABASE_PATH` (default `data/danflashes.db`)
- [ ] T006 Add package.json scripts:
  - `typecheck` (`tsc --noEmit`)
  - `test` (`vitest run`)
  - `test:coverage` (`vitest run --coverage`)
  - `test:e2e` (`playwright test`)
  - `verify` (`npm run lint && npm run typecheck && npm run test:coverage && npm run test:e2e`)
  - `db:generate` (`drizzle-kit generate`)
  - `db:migrate` (`tsx scripts/migrate.ts`)
  - `db:reset` (`tsx scripts/db-reset.ts`)
  - `db:seed-demo` (`tsx scripts/seed-demo.ts`)
  - `catalog:check` (`tsx scripts/catalog-check.ts`)
  - `art:generate` (`tsx scripts/generate-shirt-art.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

### Money & pricing (test-first)

- [ ] T007 [P] Write failing tests in tests/unit/money.test.ts for `dollarsToCents`, `formatCents` (full digits with thousands separators, e.g. `$161,061,273,600.00`, never abbreviated), and `isSafeCents` (≤ `Number.MAX_SAFE_INTEGER`)
- [ ] T008 [P] Implement src/lib/money.ts to pass T007
- [ ] T009 [P] Write failing tests in tests/unit/msrp.test.ts. Table with defaults (start 300, anchor 10, interval 10): score 0→$150, 10→$300, 20→$600, 30→$1,200, 50→$4,800. Determinism. Monotonic property over scores 0..400 (never decreases). Custom settings change the result.
- [ ] T010 Implement `msrpDollars(score, settings)` = `round(start × 2^((score − anchor)/interval))` in src/lib/pricing/msrp.ts to pass T009
- [ ] T011 [P] Write failing tests in tests/unit/resolve.test.ts: `resolvePrice(shirt, settings)` returns `{ finalPriceCents, msrpCents }`, using the owner `finalPrice` when set and the MSRP otherwise
- [ ] T012 Implement src/lib/pricing/resolve.ts to pass T011
- [ ] T013 [P] Write failing tests in tests/unit/warnings.test.ts: flags a shirt whose final price is lower than any shirt with a strictly lower complexity; no warnings when all prices are MSRP; equal scores never warn against each other
- [ ] T014 Implement `orderWarnings(shirts)` in src/lib/catalog/warnings.ts to pass T013
- [ ] T015 [P] Write failing tests in tests/unit/tiers.test.ts:
  - `tierOf(score, tiers)` returns the last tier with `minScore` ≤ score, using the defaults (0 Complicated, 20 Very, 40 Seriously, 70 Dangerously, 100 Too Complicated for Most Men): 0→Complicated, 19→Complicated, 20→Very, 99→Dangerously, 100→Too…, 10000→Too…
  - `badgeOf(shirt, tiers)` returns "BLAND" when `bland`
  - tier validation rejects a first `minScore` ≠ 0, non-increasing values, and an empty list
- [ ] T016 Implement src/lib/catalog/tiers.ts to pass T015

### Catalog

- [ ] T017 [P] Write failing tests in tests/unit/catalog-schema.test.ts:
  - slug pattern `^[a-z0-9-]+$`
  - `style` is "polo" | "button-down"
  - `complexity` is an integer ≥ 0
  - `finalPrice` is an integer ≥ 1 (optional)
  - `bland: true` requires final price < $300
  - final price over the safe-money limit is rejected
  - `images` has ≥ 1 entry, each `{src, alt}`
  - `status` is "active" | "inactive", defaulting to "active"
  - the store config's tiers, msrp, tactics, and presets are validated
- [ ] T018 Implement the Zod schemas for Shirt and Store Config in src/lib/catalog/schema.ts. They must match contracts/catalog.schema.json and data-model.md, and pass T017.
- [ ] T019 Create config/store.json with:
  - `msrp {startPriceDollars: 300, anchorScore: 10, doublingInterval: 10}`
  - `tiers` with the five defaults from data-model.md
  - `tactics {checkoutGate: true}`
  - `flashCredit {presetsDollars: [500, 1000, 5000]}`
- [ ] T020 [P] Write failing tests in tests/unit/catalog-load.test.ts against fixture directories in tests/fixtures/catalog-*:
  - a valid catalog loads, with resolved prices and badges attached
  - a slug ≠ file name is an error
  - a duplicate slug is an error
  - an invalid JSON file is an error naming the file
  - inactive shirts are excluded from `getActiveShirts` but returned by `getShirt`
  - the seed checks (≥ 12 active, both styles, ≥ 2 bland, every tier populated, a T.C. Tugger slug) produce warnings, not errors
- [ ] T021 Implement src/lib/catalog/load.ts (`loadCatalog(dir)` pure core + cached `getCatalog()`, `getStoreConfig()`, `getActiveShirts()`, `getShirt(slug)`, logging `orderWarnings` at load) to pass T020

### Database

- [ ] T022 Define the Drizzle schema in src/lib/db/schema.ts for `users`, `sessions`, `carts`, `cart_items`, `orders`, `order_items`, and `flash_credit_entries`, exactly as in data-model.md. Required details:
  - `cart_items` PK (cart_id, shirt_slug, size)
  - `quantity` 1–99
  - `orders.checkout_token` UNIQUE
  - `orders.subtotal_cents`/`shipping_cents`/`tax_cents`/`total_cents`
  - `order_items.badge` snapshot
  - `card_last4` exactly 4 digits
  - `flash_credit_entries.amount_cents` never 0
  - no price columns on carts
- [ ] T023 Implement src/lib/db/client.ts (better-sqlite3 at `process.env.DATABASE_PATH ?? "data/danflashes.db"`, `foreign_keys = ON`, WAL), drizzle.config.ts, scripts/migrate.ts, and scripts/db-reset.ts (delete the DB file, plus its `-wal`/`-shm`, then migrate). Run `npm run db:generate` to create the initial migration in drizzle/.
- [ ] T024 [P] Create the tests/helpers/db.ts test helper: a fresh temp-file SQLite database with migrations applied, per test file, deleted afterward
- [ ] T025 Write failing tests in tests/integration/catalog-check.test.ts (FR-009): an order item whose slug has no catalog file is an error, while an inactive shirt with orders is fine. Then implement scripts/catalog-check.ts, with its core in src/lib/catalog/check.ts so it's testable: run the load, validation, and order-slug check, print errors (exit 1) and warnings (exit 0).

### Brand primitives

- [ ] T026 [P] Create src/lib/copy.ts with the brand-voice strings (headlines, gate copy, empty-cart "You sure about that?", retired-shirt banner, audit notice, every error code from contracts/actions.md, confirmations) per constitution Principle I
- [ ] T027 [P] Create the brand tokens and loud base styles in src/app/globals.css (Tailwind 4 `@theme`: clashing palette, display font), plus src/app/layout.tsx with a header shell
- [ ] T028 [P] Create public/shirts/placeholder.svg (loud, "IMAGE TOO COMPLICATED TO LOAD") and the src/components/ShirtImage.tsx client component, which falls back to the placeholder when `src` is missing or `onError` fires (FR-019)
- [ ] T029 [P] Create the src/components/PriceTag.tsx and src/components/ShirtBadge.tsx components (tier name, or BLAND with distinct styling). Both sit on solid backings (constitution V). The complexity score is never rendered.

**Checkpoint**: `npm test` passes the money, pricing, tiers, and catalog tests. `npm run db:reset` creates the database.

---

## Phase 3: User Story 1 - Browse and Filter by Complexity (Priority: P1) 🎯 MVP

**Goal**: home page and shirt listing, with tier badges, tier/price/style filters, and sorting.

**Independent Test**: quickstart scenarios 1–3.

### Tests for User Story 1

- [ ] T030 [P] [US1] Write failing tests in tests/unit/listing.test.ts for `parseListingQuery` + `applyListing`:
  - `tier` (repeatable indexes, non-bland only), `bland` (`include|exclude|only`), `minPrice`/`maxPrice`, and `style` filters are ANDed
  - invalid params are ignored
  - sorts `complexity-desc` (default), `complexity-asc`, `price-desc`, `price-asc`
  - inactive shirts are excluded
  - `featuredShirts(shirts)` returns the `featured: true` shirts, or else the top 4 active by complexity

### Implementation for User Story 1

- [ ] T031 [P] [US1] Create scripts/generate-shirt-art.ts (`npm run art:generate`), which deterministically generates placeholder SVG patterns from a slug + complexity into public/shirts/. Higher complexity means more shapes, colors, and layers. Bland shirts get muted beige/grey.
- [ ] T032 [US1] Seed catalog/shirts/*.json with at least 14 shirts per FR-007:
  - both polos and button-downs
  - at least one non-bland shirt in every default tier (scores spread across about 10–150)
  - ≥ 2 bland shirts (complexity < 10, e.g. `beige-regret`, `khaki-commitment`)
  - 1 T.C. Tugger cross-over (`tc-tugger-belly-breather`)
  - 1 shirt with `status: "inactive"` for retired-page demos
  - hype descriptions, and alt text describing each pattern

  Run T031, and `npm run catalog:check` must report zero errors.
- [ ] T033 [US1] Implement src/lib/catalog/listing.ts to pass T030
- [ ] T034 [P] [US1] Create src/components/ShirtCard.tsx (ShirtImage, name, style, ShirtBadge, PriceTag, links to `/shirts/[slug]`)
- [ ] T035 [P] [US1] Create src/components/ListingFilters.tsx (client component: tier multi-select by name, bland include/exclude/only, price range, style, sort labeled "Most Complicated" etc.; writes the query string per contracts/routes.md)
- [ ] T036 [US1] Implement the /shirts page in src/app/shirts/page.tsx (Server Component: reads searchParams → `applyListing` → grid of ShirtCard, with an empty-result state in brand voice)
- [ ] T037 [US1] Implement the / home page in src/app/page.tsx (hype headline, `featuredShirts`, and a CTA to /shirts)
- [ ] T038 [US1] Add header navigation (Home, Shirts, Cart, Account/Sign in) in src/app/layout.tsx
- [ ] T039 [US1] Write and pass the Playwright test tests/e2e/browse.spec.ts: the home page shows featured shirts → /shirts shows only badges and prices (assert no element renders a complexity number) → filter to the top tier → sort by price descending → the BLAND shirts are under $300 → the inactive seed shirt is absent

**Checkpoint**: US1 is demoable. The joke works.

---

## Phase 4: User Story 2 - Zoom, Enhance, Add to Cart (Priority: P2)

**Goal**: a detail page with zoom/enhance and sizes, a guest cart with an audit, and the empty-cart pitch.

**Independent Test**: quickstart scenarios 4–6 and 12.

### Tests for User Story 2

- [ ] T040 [P] [US2] Write failing tests in tests/integration/cart.test.ts:
  - `addItem` creates a guest cart
  - the same shirt+size increments quantity
  - a missing size → `SIZE_REQUIRED`
  - an unknown slug → `SHIRT_NOT_FOUND`
  - an inactive shirt → `SHIRT_INACTIVE`
  - `updateItem` quantity 0 removes; outside 1–99 → `INVALID_QUANTITY`
  - `getCartView` resolves live final prices and badges, and the total = Σ final price × qty
  - changing a shirt's `finalPrice` changes the view (no stored prices)
- [ ] T041 [P] [US2] Write failing tests in tests/integration/cart-audit.test.ts:
  - `auditCart` deletes lines for inactive or missing shirts and returns them
  - leaves active lines alone
  - is a no-op on an empty cart
  - `getCartView` runs the audit first and reports the removed lines

### Implementation for User Story 2

- [ ] T042 [US2] Implement src/lib/cart/cart.ts (`getOrCreateCart(cartId?, userId?)`, `addItem`, `updateItem`, `removeItem`, `auditCart`, `getCartView`) to pass T040 and T041
- [ ] T043 [US2] Write failing tests in tests/integration/actions-cart.test.ts for the cart Server Action logic (the cookie created for a new guest, contract error codes passed through), then implement src/actions/cart.ts `addToCart`, `updateCartItem`, `removeCartItem` per contracts/actions.md. The guest cart id goes in an httpOnly, SameSite=Lax `df_cart` cookie.
- [ ] T044 [P] [US2] Create the src/components/ZoomViewer.tsx client component (ShirtImage inside, CSS transform zoom 1×–8×, wheel/pinch/drag pan, +/−/reset buttons labeled "ENHANCE", ShirtBadge overlaid on the viewer)
- [ ] T045 [P] [US2] Create src/components/AddToCart.tsx (size picker S/M/L/XL/XXL, a required-size message using the `SIZE_REQUIRED` copy, calls `addToCart`)
- [ ] T046 [US2] Implement the /shirts/[slug] page in src/app/shirts/[slug]/page.tsx:
  - active: ZoomViewer, name, style, PriceTag, description, AddToCart
  - inactive: "Retired from the floor" banner, images, name, style, badge, description, no price, no AddToCart (FR-014)
  - unknown: `notFound()`
- [ ] T047 [US2] Implement the /cart page in src/app/cart/page.tsx:
  - a notice for audit-removed lines
  - lines with ShirtImage, name, ShirtBadge, size, qty controls, remove, and PriceTag
  - a running total and a Checkout button
  - **empty state**: "You sure about that?", a spotlight card for the most expensive active shirt, and a link to `/shirts?tier=<last index>&sort=price-desc` (FR-018)

  Also add a cart item count to the header in src/app/layout.tsx.
- [ ] T048 [US2] Write and pass the Playwright test tests/e2e/zoom-and-cart.spec.ts: an empty /cart shows "You sure about that?" plus the spotlight → open a shirt → Add without a size is refused → pick L → add → the cart shows the line with its badge and price → the zoom buttons change the scale

**Checkpoint**: US1 + US2 work. A guest can browse, zoom, and build a cart.

---

## Phase 5: User Story 3 - The Checkout Gate, an Account, and a Faux Card (Priority: P3)

**Goal**: accounts, the checkout gate, faux card checkout, a receipt with $0 shipping and tax,
purchase history, and retired-shirt links.

**Independent Test**: quickstart scenarios 7–11.

### Tests for User Story 3

- [ ] T049 [P] [US3] Write failing tests in tests/unit/faux-card.test.ts:
  - Luhn passes for 4242424242424242 and fails for 4242424242424241
  - 12–19 digits; spaces and dashes are stripped
  - expiry MM/YY must be in the future, while the current month is valid
  - CVC is 3–4 digits
  - brand detection (Visa 4, Mastercard 51–55/2221–2720, Amex 34/37, Discover 6011/65, else "Card")
  - returns only `{brand, last4}`
- [ ] T050 [P] [US3] Write failing tests in tests/integration/auth.test.ts:
  - sign-up lowercases and trims the email
  - bcrypt hash stored (cost 12)
  - duplicate → `EMAIL_TAKEN`
  - password < 8 → `WEAK_PASSWORD`
  - an unknown email and a wrong password both → `BAD_CREDENTIALS`
  - the session stores only the SHA-256 of the token
  - an expired session is rejected
  - `safeNext` honors only relative paths
- [ ] T051 [P] [US3] Write failing tests in tests/integration/cart-merge.test.ts: the guest cart merges into the user cart, identical shirt+size quantities add (capped at 99), the guest cart row is deleted, and merging into a user with no cart reassigns it
- [ ] T052 [P] [US3] Write failing tests in tests/integration/place-order-card.test.ts:
  - order subtotal = Σ final price × qty, shipping = 0, tax = 0, total = subtotal
  - `order_items` snapshot `final_price_cents`, `msrp_cents`, `shirt_name`, `badge`, `complexity`
  - a client-sent price or total is never charged
  - an `expectedTotalCents` mismatch → `PRICE_CHANGED` with the new total and nothing written
  - an inactive line → `CART_AUDITED` (the line is removed, no order)
  - a replayed `checkoutToken` returns the same order
  - an empty cart → `CART_EMPTY`
  - a total over the safe limit → `TOO_COMPLICATED`
  - an invalid card → `CARD_*` with nothing written
  - with the gate on and no user → `GATE_SIGN_IN_REQUIRED`
  - after success, the cart is cleared and the Flash Credit balance is unchanged
  - a scan of every table finds no full card number and no CVC

### Implementation for User Story 3

- [ ] T053 [P] [US3] Implement src/lib/payments/faux-card.ts to pass T049. It must never log its input.
- [ ] T054 [US3] Implement src/lib/auth/password.ts (bcryptjs cost 12), src/lib/auth/session.ts (create: random 32-byte token in an httpOnly, SameSite=Lax `df_session` cookie with SHA-256 stored and a 30-day expiry; `getCurrentUser`; destroy), and src/lib/auth/safe-next.ts to pass T050
- [ ] T055 [US3] Add `mergeGuestCart(guestCartId, userId)` to src/lib/cart/cart.ts to pass T051
- [ ] T056 [US3] Implement the card path of `placeOrder` in src/lib/checkout/place-order.ts, inside one `BEGIN IMMEDIATE` transaction: gate check → idempotency check → `auditCart` → re-resolve prices → validations → validate the card → insert the order (subtotal/shipping/tax/total) + items → clear the cart. Must pass T052.
- [ ] T057 [US3] Write failing tests in tests/integration/actions-auth-checkout.test.ts for the auth and checkout Server Action logic (merge on sign-in, `next` redirect, gate enforcement, error-code passthrough), then implement src/actions/auth.ts (`signUp`, `signIn`, `signOut`) and src/actions/checkout.ts (`placeOrder`, redirect to `/orders/[id]`) per contracts/actions.md
- [ ] T058 [P] [US3] Implement the /sign-in and /sign-up pages in src/app/sign-in/page.tsx and src/app/sign-up/page.tsx, with gate copy when `next=/checkout`
- [ ] T059 [P] [US3] Create the src/components/OrderSummary.tsx component (lines with ShirtImage, linked name → `/shirts/[slug]`, ShirtBadge, size, qty, PriceTag, then Subtotal, Shipping $0.00, Tax $0.00, Total), used by checkout, confirmation, and history (FR-030)
- [ ] T060 [US3] Implement the /checkout page in src/app/checkout/page.tsx:
  - the gate redirect to `/sign-in?next=/checkout`
  - `auditCart`, with a redirect to `/cart` if the cart is now empty
  - OrderSummary with live prices
  - a hidden `checkoutToken` + `expectedTotalCents`
  - the price-changed and audit notices
  - the Faux Card form (number, MM/YY, CVC)
- [ ] T061 [P] [US3] Implement the /orders/[id] confirmation page in src/app/orders/[id]/page.tsx (visible only to the order's owner: OrderSummary from snapshots, "charged to {brand} ending {last4}" or "paid with Flash Credit", plus brand-voice congratulations)
- [ ] T062 [US3] Implement the /account page purchase history in src/app/account/page.tsx (orders newest first, each rendered with OrderSummary from snapshots, item links reaching retired shirt pages) and a sign-out button
- [ ] T063 [US3] Write and pass the Playwright test tests/e2e/card-checkout.spec.ts: guest adds 2 shirts → /checkout redirects to sign-in → sign up → back at checkout with the cart intact and Shipping $0.00 / Tax $0.00 visible → pay with 4242 4242 4242 4242 → confirmation shows "ending 4242" → order is in /account → the item link opens the shirt page

**Checkpoint**: the full buying loop works with a faux card.

---

## Phase 6: User Story 4 - Flash Credit (Priority: P4)

**Goal**: Flash Credit top-ups and spending at checkout, backed by a ledger.

**Independent Test**: quickstart scenarios 13–15.

### Tests for User Story 4

- [ ] T064 [P] [US4] Write failing tests in tests/integration/ledger.test.ts:
  - a top-up writes a positive `top_up` entry with brand/last4
  - balance = SUM(amount_cents)
  - `INVALID_AMOUNT` for ≤ 0 or non-integer dollars
  - `TOO_COMPLICATED` above the safe limit
  - entries list newest first
- [ ] T065 [P] [US4] Write failing tests in tests/integration/place-order-flash-credit.test.ts:
  - when the balance ≥ total: the order is created, one `spend` entry of −total is linked to the order, and the balance drops by exactly the total
  - when the balance < total: `INSUFFICIENT_FLASH_CREDIT` and nothing is written
  - two sequential checkouts that together exceed the balance: the second is refused and the balance never goes negative
  - a replayed `checkoutToken` doesn't double-spend
  - a guest (gate off) choosing Flash Credit → refused

### Implementation for User Story 4

- [ ] T066 [US4] Implement src/lib/flash-credit/ledger.ts (`getBalanceCents`, `topUp`, `listEntries`) to pass T064
- [ ] T067 [US4] Add the `flash_credit` path to src/lib/checkout/place-order.ts (balance check + spend entry in the same `BEGIN IMMEDIATE` transaction) to pass T065
- [ ] T068 [US4] Write failing tests in tests/integration/actions-flash-credit.test.ts (sign-in required, preset and custom amounts, error passthrough), then implement src/actions/flash-credit.ts `topUpFlashCredit` per contracts/actions.md
- [ ] T069 [US4] Add the Flash Credit panel to src/app/account/page.tsx (balance, entry history with spend → order links, top-up form with presets from `config/store.json` plus a custom amount and the Faux Card form)
- [ ] T070 [US4] Add the Flash Credit method to src/app/checkout/page.tsx (shows the balance; on `INSUFFICIENT_FLASH_CREDIT`, offers a top-up link or the card with hype copy; hidden for guests)
- [ ] T071 [US4] Write and pass the Playwright test tests/e2e/flash-credit-checkout.spec.ts: sign up → top up $5,000 → check out a cart ≤ balance with Flash Credit → the balance drops by exactly the total → the spend entry links to the order

**Checkpoint**: all four stories work on their own and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T072 Add an integration test in tests/integration/checkout-gate-off.test.ts: with `tactics.checkoutGate = false`, a guest can place a card order (`orders.user_id` NULL) and Flash Credit is refused (FR-022)
- [ ] T073 [P] Implement scripts/seed-demo.ts (`npm run db:seed-demo`): it creates `demo@danflashes.local` / `password123` with $10,000 in Flash Credit and one past card order, and is idempotent (re-running doesn't duplicate)
- [ ] T074 [P] Brand-voice pass: route every shopper-facing string through src/lib/copy.ts and confirm the joke is never explained (FR-034)
- [ ] T075 [P] No-score audit: add tests/e2e/no-score.spec.ts, which visits every shopper page type and asserts that no raw complexity value from the catalog appears as text (SC-003)
- [ ] T076 [P] Performance pass: run Lighthouse (mobile) on /, /shirts, and one detail page. Confirm LCP ≤ 2.5 s, CLS ≤ 0.1, and lazy-loaded below-the-fold images (SC-007, constitution VII), and record the results in specs/001-core-storefront/quickstart.md
- [ ] T077 [P] Update README.md with setup, the utility scripts table, and `npm run verify` (pointing to quickstart.md)
- [ ] T078 Run `npm run verify` until it is fully green (lint, typecheck, coverage ≥ 90% on src/lib, e2e)
- [ ] T079 Walk quickstart.md manual scenarios 1–18 and fix anything that fails

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup. Blocks all stories.
- **US1 (Phase 3)**: depends on Foundational. This is the MVP.
- **US2 (Phase 4)**: depends on Foundational. It uses the ShirtCard and catalog from US1 for navigation but is testable through direct URLs.
- **US3 (Phase 5)**: depends on US2 (the cart).
- **US4 (Phase 6)**: depends on US3 (accounts, `placeOrder`).
- **Polish (Phase 7)**: depends on all stories.

### Within Each Story

Tests are written and failing first. Then lib logic, then Server Actions (with their own tests),
then pages, then e2e.

### Parallel Opportunities

- Setup: T003, T004, T005
- Foundational: the test files T007, T009, T011, T013, T015, T017, T020 and T024, T026–T029
- US1: T030, T031, T034, T035
- US2: T040, T041, T044, T045
- US3: T049–T052 (all four test files), T053, T058, T059, T061
- US4: T064, T065
- Polish: T073–T077

---

## Parallel Example: User Story 3

```text
# Write all US3 failing tests together:
T049 tests/unit/faux-card.test.ts
T050 tests/integration/auth.test.ts
T051 tests/integration/cart-merge.test.ts
T052 tests/integration/place-order-card.test.ts

# Then implement independent units together:
T053 src/lib/payments/faux-card.ts
T054 src/lib/auth/*
T055 src/lib/cart/cart.ts (merge)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1)
3. **Stop and validate**: `npm run verify` plus quickstart scenarios 1–3. Demo the catalog. The joke lands here.

### Incremental Delivery

1. US1 → demo (MVP)
2. US2 → guests can build carts
3. US3 → real faux purchases
4. US4 → Flash Credit
5. Polish → `npm run verify` green → merge PR `001-core-storefront` → `main`

Run `/speckit-converge` after `/speckit-implement`, and repeat until it reports Converged.

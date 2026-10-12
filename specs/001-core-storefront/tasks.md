# Tasks: Core Storefront

**Input**: Design documents from `/specs/001-core-storefront/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. Constitution VI requires test-first development for pricing, cart totals, Flash
Credit, and checkout. Each test task listed before its implementation task MUST be written and seen
failing first.

**Organization**: tasks are grouped by user story so each story can be implemented and tested on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US4)

## Path Conventions

Single Next.js project at the repo root. App code is in `src/`, catalog data in `catalog/` and
`config/`, and tests in `tests/` (see plan.md → Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: scaffold the project and tooling.

- [ ] T001 Scaffold Next.js 16 into the repo root with `npx create-next-app@16 . --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --use-npm`. Scaffold into a temp dir and copy in if the CLI refuses a non-empty folder. Preserve the existing `.specify/`, `.claude/`, `specs/`, `README.md`, `ROADMAP.md`, and `.gitignore` (merge its rules into the generated one).
- [ ] T002 Install runtime deps `drizzle-orm better-sqlite3 zod bcryptjs` and dev deps `drizzle-kit @types/better-sqlite3 vitest @playwright/test tsx` in package.json
- [ ] T003 [P] Configure Vitest in vitest.config.ts: `@/*` → `src/*` alias, include `tests/unit/**` and `tests/integration/**`, node environment
- [ ] T004 [P] Configure Playwright in playwright.config.ts: testDir `tests/e2e`, chromium only, `webServer` running `npm run dev` on port 3100 with `DATABASE_PATH=data/e2e.db`
- [ ] T005 [P] Add `data/`, `test-results/`, `playwright-report/` to .gitignore, and create .env.example documenting `DATABASE_PATH` (default `data/danflashes.db`)
- [ ] T006 Add package.json scripts: `test` (vitest run), `test:e2e` (playwright test), `db:generate` (drizzle-kit generate), `db:migrate` (tsx scripts/migrate.ts), `catalog:check` (tsx scripts/catalog-check.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: money, pricing, catalog loading, the database, and brand primitives that every story needs.

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

### Money & pricing (test-first)

- [ ] T007 [P] Write failing tests in tests/unit/money.test.ts for `dollarsToCents`, `formatCents` (full digits with thousands separators, e.g. `$161,061,273,600.00`, never abbreviated), and `isSafeCents` (≤ `Number.MAX_SAFE_INTEGER`)
- [ ] T008 [P] Implement src/lib/money.ts to pass T007
- [ ] T009 [P] Write failing tests in tests/unit/msrp.test.ts. Table with defaults (start 300, anchor 10, interval 10): score 0→$150, 10→$300, 20→$600, 30→$1,200, 50→$4,800. Determinism (same input → same output). Monotonic property over scores 0..400 (never decreases). Custom settings change the result.
- [ ] T010 Implement `msrpDollars(score, settings)` = `round(start × 2^((score − anchor)/interval))` in src/lib/pricing/msrp.ts to pass T009
- [ ] T011 [P] Write failing tests in tests/unit/resolve.test.ts: `finalPriceCents` uses the owner `finalPrice` when set and the MSRP otherwise. It returns `{ finalPriceCents, msrpCents }`. Size never affects it.
- [ ] T012 Implement src/lib/pricing/resolve.ts to pass T011
- [ ] T013 [P] Write failing tests in tests/unit/warnings.test.ts: flags a shirt whose final price is lower than any shirt with a strictly lower complexity; no warnings when all prices are MSRP; equal scores never warn against each other
- [ ] T014 Implement `orderWarnings(shirts)` in src/lib/catalog/warnings.ts to pass T013

### Catalog

- [ ] T015 [P] Write failing tests in tests/unit/catalog-schema.test.ts:
  - slug pattern `^[a-z0-9-]+$` and slug equals the file name
  - `style` is "polo" | "button-down"
  - `complexity` is an integer ≥ 0
  - `finalPrice` is an integer ≥ 1 (optional)
  - `bland: true` requires final price < $300
  - final price over the safe-money limit is rejected
  - `images` has ≥ 1 entry, each `{src, alt}`
  - `status` is "active" | "removed"
  - duplicate slugs are rejected
- [ ] T016 Implement the Zod schemas for Shirt and Store Config in src/lib/catalog/schema.ts. They must match specs/001-core-storefront/contracts/catalog.schema.json and data-model.md, and pass T015.
- [ ] T017 Create config/store.json with `msrp {startPriceDollars: 300, anchorScore: 10, doublingInterval: 10}`, `tactics {checkoutGate: true}`, and `flashCredit {presetsDollars: [500, 1000, 5000]}`
- [ ] T018 Implement src/lib/catalog/load.ts: read `catalog/shirts/*.json` + `config/store.json`, validate, attach resolved prices, cache per process, log `orderWarnings` at load, and export `getStoreConfig()`, `getActiveShirts()`, `getShirt(slug)` (returns removed shirts with their status)
- [ ] T019 Implement scripts/catalog-check.ts: run the load and validation, print errors (exit 1) and complexity-order warnings (exit 0), and report the FR-007 seed checks (≥ 12 active, both styles, ≥ 2 bland, a T.C. Tugger shirt) as warnings

### Database

- [ ] T020 Define the Drizzle schema in src/lib/db/schema.ts for `users`, `sessions`, `carts`, `cart_items`, `orders`, `order_items`, and `flash_credit_entries`, exactly as in data-model.md. Required details:
  - `cart_items` PK (cart_id, shirt_slug, size)
  - `quantity` 1–99
  - `orders.checkout_token` UNIQUE
  - `card_last4` exactly 4 digits
  - `flash_credit_entries.amount_cents` never 0
  - no price columns on carts
- [ ] T021 Implement src/lib/db/client.ts (better-sqlite3 at `process.env.DATABASE_PATH ?? "data/danflashes.db"`, `foreign_keys = ON`, WAL), drizzle.config.ts, and scripts/migrate.ts. Run `npm run db:generate` to create the initial migration in drizzle/.
- [ ] T022 [P] Create the tests/helpers/db.ts test helper: a fresh temp-file SQLite database with migrations applied, per test file

### Brand primitives

- [ ] T023 [P] Create src/lib/copy.ts with the brand-voice strings (headlines, gate copy, empty states, every error code from contracts/actions.md, confirmations) per constitution Principle I
- [ ] T024 [P] Create the brand tokens and loud base styles in src/app/globals.css (Tailwind 4 `@theme`: clashing palette, display font), plus src/app/layout.tsx with a header shell
- [ ] T025 [P] Create the src/components/PriceTag.tsx and src/components/ComplexityBadge.tsx components. The score is rendered at least as large as the price (FR-010), both on solid backings (constitution V).

**Checkpoint**: `npm test` passes the money, pricing, and catalog tests. `npm run db:migrate` creates the database.

---

## Phase 3: User Story 1 - Browse and Filter by Complexity (Priority: P1) 🎯 MVP

**Goal**: home page and shirt listing, where price visibly tracks complexity and filters and sorts
work.

**Independent Test**: quickstart scenarios 1–3. Every card shows score + price. Sorts agree when no
owner prices are set. Bland shirts are badged and under $300.

### Tests for User Story 1

- [ ] T026 [P] [US1] Write failing tests in tests/unit/listing.test.ts for `parseListingQuery` + `applyListing`:
  - `minScore`/`maxScore`/`minPrice`/`maxPrice`/`style` filters are ANDed
  - invalid params are ignored
  - sorts `complexity-desc` (default), `complexity-asc`, `price-desc`, `price-asc`
  - removed shirts are excluded

### Implementation for User Story 1

- [ ] T027 [P] [US1] Create scripts/generate-shirt-art.ts, which deterministically generates placeholder SVG patterns from a slug + complexity into public/shirts/. Higher complexity means more shapes, colors, and layers. Bland shirts get muted beige/grey.
- [ ] T028 [US1] Seed catalog/shirts/*.json with at least 12 shirts per FR-007:
  - both polos and button-downs
  - complexity spread across about 2–120
  - ≥ 2 bland shirts (complexity < 10, e.g. "Beige Regret", "Khaki Commitment")
  - 1 T.C. Tugger cross-over (`tc-tugger-belly-breather`)
  - hype descriptions, and alt text describing each pattern

  Run T027 to produce the art, and `npm run catalog:check` must pass with zero errors.
- [ ] T029 [US1] Implement src/lib/catalog/listing.ts to pass T026
- [ ] T030 [P] [US1] Create src/components/ShirtCard.tsx (image, name, style, ComplexityBadge + PriceTag, a BLAND badge when `bland`, links to `/shirts/[slug]`)
- [ ] T031 [P] [US1] Create src/components/ListingFilters.tsx (client component: complexity range, price range, style, sort; writes the query string per contracts/routes.md)
- [ ] T032 [US1] Implement the /shirts page in src/app/shirts/page.tsx (Server Component: reads searchParams → `applyListing` → grid of ShirtCard, with an empty-result state in brand voice)
- [ ] T033 [US1] Implement the / home page in src/app/page.tsx (hype headline, featured shirts: those with `featured: true`, else the top 4 by complexity, and a CTA to /shirts)
- [ ] T034 [US1] Add header navigation (Home, Shirts, Cart, Account/Sign in) in src/app/layout.tsx

**Checkpoint**: US1 is demoable. The joke works.

---

## Phase 4: User Story 2 - Zoom, Enhance, Add to Cart (Priority: P2)

**Goal**: a detail page with zoom/enhance and size selection, and a guest cart.

**Independent Test**: quickstart scenarios 4–5. Open a shirt as a guest, zoom to max, pick a size,
and add it to the cart. The cart holds the right shirt, size, and live price.

### Tests for User Story 2

- [ ] T035 [P] [US2] Write failing tests in tests/integration/cart.test.ts:
  - `addItem` creates a guest cart
  - the same shirt+size increments quantity
  - a missing size → `SIZE_REQUIRED`
  - an unknown slug → `SHIRT_NOT_FOUND`
  - a removed shirt → `SHIRT_REMOVED`
  - `updateItem` quantity 0 removes; outside 1–99 → `INVALID_QUANTITY`
  - `getCartView` resolves live final prices, and the total = Σ final price × qty
  - changing a shirt's `finalPrice` changes the cart view (no stored prices)

### Implementation for User Story 2

- [ ] T036 [US2] Implement src/lib/cart/cart.ts (`getOrCreateCart(cartId?, userId?)`, `addItem`, `updateItem`, `removeItem`, `getCartView`) to pass T035
- [ ] T037 [US2] Implement src/actions/cart.ts Server Actions `addToCart`, `updateCartItem`, `removeCartItem` per contracts/actions.md. The guest cart id goes in an httpOnly, SameSite=Lax `df_cart` cookie.
- [ ] T038 [P] [US2] Create the src/components/ZoomViewer.tsx client component (CSS transform zoom 1×–8×, wheel/pinch/drag pan, +/−/reset buttons labeled "ENHANCE")
- [ ] T039 [P] [US2] Create src/components/AddToCart.tsx (size picker S/M/L/XL/XXL, a required-size message using the `SIZE_REQUIRED` copy, calls `addToCart`)
- [ ] T040 [US2] Implement the /shirts/[slug] page in src/app/shirts/[slug]/page.tsx (ZoomViewer, name, style, ComplexityBadge + PriceTag, description, AddToCart). `notFound()` for unknown or removed shirts.
- [ ] T041 [US2] Implement the /cart page in src/app/cart/page.tsx (line items with qty controls and remove, running total, Checkout button, empty state linking to /shirts) and add a cart item count to the header in src/app/layout.tsx

**Checkpoint**: US1 + US2 work. A guest can browse, zoom, and build a cart.

---

## Phase 5: User Story 3 - The Checkout Gate, an Account, and a Faux Card (Priority: P3)

**Goal**: accounts, the checkout gate, faux card checkout, confirmation, and purchase history.

**Independent Test**: quickstart scenarios 6–9. A guest cart hits the gate, then sign-up, then card
checkout. The order total is correct and appears in history.

### Tests for User Story 3

- [ ] T042 [P] [US3] Write failing tests in tests/unit/faux-card.test.ts:
  - Luhn passes for 4242424242424242 and fails for 4242424242424241
  - 12–19 digits; spaces and dashes are stripped
  - expiry MM/YY must be in the future, while the current month is valid
  - CVC is 3–4 digits
  - brand detection (Visa 4, Mastercard 51–55/2221–2720, Amex 34/37, Discover 6011/65, else "Card")
  - returns only `{brand, last4}`
- [ ] T043 [P] [US3] Write failing tests in tests/integration/auth.test.ts:
  - sign-up lowercases and trims the email
  - bcrypt hash stored (cost 12)
  - duplicate → `EMAIL_TAKEN`
  - password < 8 → `WEAK_PASSWORD`
  - an unknown email and a wrong password both → `BAD_CREDENTIALS`
  - the session stores only the SHA-256 of the token
  - an expired session is rejected
- [ ] T044 [P] [US3] Write failing tests in tests/integration/cart-merge.test.ts: the guest cart merges into the user cart, identical shirt+size quantities add (capped at 99), the guest cart row is deleted, and merging into a user with no cart reassigns it
- [ ] T045 [P] [US3] Write failing tests in tests/integration/place-order-card.test.ts:
  - order total = Σ final price × qty
  - `order_items` snapshot `final_price_cents` + `msrp_cents` + name + complexity
  - a client-sent price or total is never charged
  - an `expectedTotalCents` mismatch → `PRICE_CHANGED` with the new total and nothing written
  - a replayed `checkoutToken` returns the same order
  - an empty cart → `CART_EMPTY`
  - a removed shirt → `SHIRT_REMOVED`
  - a total over the safe limit → `TOO_COMPLICATED`
  - an invalid card → `CARD_*` with nothing written
  - after success, the cart is cleared and the Flash Credit balance is unchanged
  - a scan of every table finds no full card number and no CVC

### Implementation for User Story 3

- [ ] T046 [P] [US3] Implement src/lib/payments/faux-card.ts to pass T042. It must never log its input.
- [ ] T047 [US3] Implement src/lib/auth/password.ts (bcryptjs cost 12) and src/lib/auth/session.ts (create: random 32-byte token in an httpOnly, SameSite=Lax `df_session` cookie with SHA-256 stored and a 30-day expiry; `getCurrentUser`; destroy) to pass T043
- [ ] T048 [US3] Add `mergeGuestCart(guestCartId, userId)` to src/lib/cart/cart.ts to pass T044
- [ ] T049 [US3] Implement the card path of `placeOrder` in src/lib/checkout/place-order.ts, inside one `BEGIN IMMEDIATE` transaction: idempotency check → re-resolve prices → validations → validate the card → insert the order + items → clear the cart. Must pass T045.
- [ ] T050 [US3] Implement src/actions/auth.ts `signUp`, `signIn`, and `signOut` per contracts/actions.md (merges the guest cart on success, and honors `next` only when it is a relative path)
- [ ] T051 [US3] Implement src/actions/checkout.ts `placeOrder` (enforces `tactics.checkoutGate` → `GATE_SIGN_IN_REQUIRED`, and redirects to `/orders/[id]` on success)
- [ ] T052 [P] [US3] Implement the /sign-in and /sign-up pages in src/app/sign-in/page.tsx and src/app/sign-up/page.tsx, with gate copy when `next=/checkout`
- [ ] T053 [US3] Implement the /checkout page in src/app/checkout/page.tsx: gate redirect to `/sign-in?next=/checkout`, re-resolved line items and total, a hidden `checkoutToken` + `expectedTotalCents`, a price-changed notice, and the Faux Card form (number, MM/YY, CVC)
- [ ] T054 [P] [US3] Implement the /orders/[id] confirmation page in src/app/orders/[id]/page.tsx (visible only to the order's owner, showing "charged to {brand} ending {last4}" or "paid with Flash Credit", plus brand-voice congratulations)
- [ ] T055 [US3] Implement the /account page purchase history in src/app/account/page.tsx (orders newest first: date, items with size/qty/score/price, total, payment method) and a sign-out button
- [ ] T056 [US3] Write and pass the Playwright test tests/e2e/card-checkout.spec.ts: guest adds 2 shirts → /checkout redirects to sign-in → sign up → back at checkout with the cart intact → pay with 4242 4242 4242 4242 → confirmation shows "ending 4242" → order is in /account

**Checkpoint**: the full buying loop works with a faux card.

---

## Phase 6: User Story 4 - Flash Credit (Priority: P4)

**Goal**: Flash Credit top-ups and spending at checkout, backed by a ledger.

**Independent Test**: quickstart scenarios 10–12. A top-up raises the balance, and a Flash Credit
checkout lowers it by exactly the order total.

### Tests for User Story 4

- [ ] T057 [P] [US4] Write failing tests in tests/integration/ledger.test.ts:
  - a top-up writes a positive `top_up` entry with brand/last4
  - balance = SUM(amount_cents)
  - `INVALID_AMOUNT` for ≤ 0 or non-integer dollars
  - `TOO_COMPLICATED` above the safe limit
  - entries list newest first
- [ ] T058 [P] [US4] Write failing tests in tests/integration/place-order-flash-credit.test.ts:
  - when the balance ≥ total: the order is created, one `spend` entry of −total is linked to the order, and the balance drops by exactly the total
  - when the balance < total: `INSUFFICIENT_FLASH_CREDIT` and nothing is written
  - two sequential checkouts that together exceed the balance: the second is refused and the balance never goes negative
  - a replayed `checkoutToken` doesn't double-spend

### Implementation for User Story 4

- [ ] T059 [US4] Implement src/lib/flash-credit/ledger.ts (`getBalanceCents`, `topUp`, `listEntries`) to pass T057
- [ ] T060 [US4] Add the `flash_credit` path to src/lib/checkout/place-order.ts (balance check + spend entry in the same `BEGIN IMMEDIATE` transaction) to pass T058
- [ ] T061 [US4] Implement src/actions/flash-credit.ts `topUpFlashCredit` per contracts/actions.md
- [ ] T062 [US4] Add the Flash Credit panel to src/app/account/page.tsx (balance, entry history, top-up form with presets from `config/store.json` plus a custom amount and the Faux Card form)
- [ ] T063 [US4] Add the Flash Credit method to src/app/checkout/page.tsx (shows the balance; on `INSUFFICIENT_FLASH_CREDIT`, offers a top-up link or the card with hype copy; hidden for guests)
- [ ] T064 [US4] Write and pass the Playwright test tests/e2e/flash-credit-checkout.spec.ts: sign up → top up $5,000 → check out a cart ≤ balance with Flash Credit → the balance drops by exactly the total → the spend entry links to the order

**Checkpoint**: all four stories work on their own and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T065 Add an integration test in tests/integration/checkout-gate-off.test.ts: with `tactics.checkoutGate = false`, a guest can place a card order (`orders.user_id` NULL) and Flash Credit is refused (FR-017)
- [ ] T066 [P] Brand-voice pass: route every shopper-facing string through src/lib/copy.ts and confirm the joke is never explained (FR-029)
- [ ] T067 [P] Performance pass: run Lighthouse (mobile) on /, /shirts, and one detail page. Confirm LCP ≤ 2.5 s, CLS ≤ 0.1, and lazy-loaded below-the-fold images (SC-007, constitution VII), and record the results in specs/001-core-storefront/quickstart.md
- [ ] T068 [P] Update README.md with setup and run commands (pointing to quickstart.md)
- [ ] T069 Run `npm run lint`, `npm run build`, `npm test`, and `npm run test:e2e` until all are clean
- [ ] T070 Walk quickstart.md manual scenarios 1–14 and fix anything that fails

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

Tests are written and failing first. Then lib logic, then Server Actions, then pages, then e2e.

### Parallel Opportunities

- Setup: T003, T004, T005
- Foundational: the test-first pairs (T007/T008, T009, T011, T013, T015) and T022–T025
- US1: T026, T027, T030, T031
- US2: T035, T038, T039
- US3: T042–T045 (all four test files), T046, T052, T054
- US4: T057, T058

---

## Parallel Example: User Story 3

```text
# Write all US3 failing tests together:
T042 tests/unit/faux-card.test.ts
T043 tests/integration/auth.test.ts
T044 tests/integration/cart-merge.test.ts
T045 tests/integration/place-order-card.test.ts

# Then implement independent units together:
T046 src/lib/payments/faux-card.ts
T047 src/lib/auth/*
T048 src/lib/cart/cart.ts (merge)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1)
3. **Stop and validate**: quickstart scenarios 1–3. Demo the catalog. The joke lands here.

### Incremental Delivery

1. US1 → demo (MVP)
2. US2 → guests can build carts
3. US3 → real faux purchases
4. US4 → Flash Credit
5. Polish → merge PR `001-core-storefront` → `main`

Run `/speckit-converge` after `/speckit-implement`, and repeat until it reports Converged.

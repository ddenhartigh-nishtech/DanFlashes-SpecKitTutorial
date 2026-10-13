# Tasks: Core Storefront

**Input**: Design documents from `/specs/001-core-storefront/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Generated**: 2026-10-13, against constitution v3.0.0

**Tests**: REQUIRED (constitution VI).
- Money paths are test-first: each test task listed before its implementation MUST be written and
  seen failing first.
- Every `src/lib` module and Server Action gets tests.
- Every user story gets an e2e journey at desktop and phone viewports.
- `npm run verify` is the one-glance health check.

**Money rule** (constitution "Exact money", R4): every money value is a two-decimal USD string
handled through `src/lib/money.ts` (big.js). No task may do money math with JS numbers.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US4)

## Path Conventions

Single Next.js project at the repo root:
- app code in `src/`
- utility scripts in `scripts/`
- image files in `public/media/`
- tests in `tests/`

**No product data in code files.** The only catalog content in the repo is the seed fixture (T029)
and the image files.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Scaffold Next.js 16 into the repo root with `npx create-next-app@16 . --ts --app --src-dir --tailwind --eslint --import-alias "@/*" --use-npm`. Scaffold into a temp dir and copy in if the CLI refuses a non-empty folder. Preserve the existing `.specify/`, `.claude/`, `specs/`, `README.md`, `ROADMAP.md`, and `.gitignore` (merge its rules into the generated one).
- [ ] T002 Install dependencies in package.json:
  - runtime: `drizzle-orm better-sqlite3 zod bcryptjs big.js`
  - dev: `drizzle-kit @types/better-sqlite3 @types/big.js vitest @vitest/coverage-v8 @playwright/test tsx prettier prettier-plugin-tailwindcss eslint-config-prettier`
- [ ] T003 [P] Configure code hygiene (R21):
  - .prettierrc (with `prettier-plugin-tailwindcss`)
  - .prettierignore (`.next/`, `data/`, `backups/`, `coverage/`, `drizzle/meta/`, `.specify/`, `.claude/`)
  - .editorconfig (2-space indent, LF, final newline)
  - `eslint-config-prettier` appended to the ESLint flat config in eslint.config.mjs
- [ ] T004 [P] Configure Vitest in vitest.config.ts: `@/*` → `src/*` alias, include `tests/unit/**` and `tests/integration/**`, node environment, v8 coverage over `src/lib/**` with a `lines: 90` threshold
- [ ] T005 [P] Configure Playwright in playwright.config.ts:
  - testDir `tests/e2e`
  - **two projects**: `desktop` (Desktop Chrome) and `phone` (Pixel 7)
  - `webServer` command `npm run db:reset -- --no-backup && npm run dev -- -p 3100`, with env `DATABASE_PATH=data/e2e.db`
  - baseURL `http://localhost:3100`
- [ ] T006 [P] Add `data/`, `backups/`, `coverage/`, `test-results/`, `playwright-report/` to .gitignore, and create .env.example documenting `DATABASE_PATH` (default `data/danflashes.db`)
- [ ] T007 Add package.json scripts:
  - `format`, `format:check`
  - `lint`, `typecheck` (`tsc --noEmit`)
  - `test` (`vitest run`), `test:coverage`, `test:e2e`
  - `verify` (`format:check && lint && typecheck && test:coverage && test:e2e`)
  - `db:generate`, `db:migrate`, `db:reset`, `db:backup`, `db:restore`, `db:seed`, `db:seed-demo`, `db:studio` (`drizzle-kit studio`)
  - `catalog:audit`, `art:generate` (all scripts run with `tsx scripts/<name>.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

### Money, pricing, tiers, media (test-first, pure modules)

- [ ] T008 [P] Write failing tests in tests/unit/money.test.ts:
  - `parseUsd` accepts `"200.18"`, `"1450"`, and `"0.5"`, normalizing to `"200.18"`/`"1450.00"`/`"0.50"`, and rejects >2 decimals, non-numeric input, `NaN`, and empty strings
  - `isUsdString` matches `^-?\d+\.\d{2}$`
  - exact arithmetic: `add("0.10","0.20") === "0.30"`, plus `sub`, `mul(price, qty)`, `sum([...])`, `cmp`
  - `roundHalfUp2`
  - `formatUsd("1234567.89") === "$1,234,567.89"`, and a 20-digit value is formatted in full, never abbreviated or in exponent notation
- [ ] T009 [P] Implement src/lib/money.ts with big.js to pass T008. It accepts strings only and throws on a JS number argument.
- [ ] T010 [P] Write failing tests in tests/unit/msrp.test.ts:
  - with defaults (start `300.00`, anchor 10, interval 10): 0→`150.00`, 10→`300.00`, 15→`424.26`, 20→`600.00`, 50→`4800.00`
  - returns money strings
  - determinism
  - monotonic (never decreasing) over scores 0..400
  - custom settings change the result
  - score 1000 returns a plain digit string (no exponent)
- [ ] T011 Implement `msrpUsd(score, settings)` in src/lib/pricing/msrp.ts (float `2**x` → immediately `Big` → round half-up to cents) to pass T010
- [ ] T012 [P] Write failing tests in tests/unit/resolve.test.ts: `resolvePrice(shirt, settings)` returns `{ finalPriceUsd, msrpUsd }`, using `final_price_usd` when set and the MSRP when NULL
- [ ] T013 Implement src/lib/pricing/resolve.ts to pass T012
- [ ] T014 [P] Write failing tests in tests/unit/warnings.test.ts (the pricing outlier alarm, R6): flags a shirt whose final price is lower than any shirt with a strictly lower score; no warnings when every price is MSRP; equal scores never warn against each other
- [ ] T015 Implement `orderWarnings(shirts)` in src/lib/catalog/warnings.ts to pass T014
- [ ] T016 [P] Write failing tests in tests/unit/tiers.test.ts:
  - `tierOf(score, tiers)` with the seed defaults (BLAND 0, Complicated 10, Very 25, Seriously 45, Dangerously 70, Too Complicated for Most Men 100): 0→BLAND, 9→BLAND, 10→Complicated, 24→Complicated, 25→Very, 99→Dangerously, 100→Too…, 10000→Too…
  - `isBland` is true only for the `min_score = 0` tier
  - `validateTiers` rejects a missing `min_score = 0`, duplicate `min_score`, duplicate names, and colors that aren't `#RRGGBB`
- [ ] T017 Implement src/lib/catalog/tiers.ts to pass T016
- [ ] T018 [P] Write failing tests in tests/unit/media.test.ts:
  - `resolveMediaUrl("shirts/a.svg", "")` → `/media/shirts/a.svg`
  - `resolveMediaUrl(key, "https://cdn.example.com/df/")` → `https://cdn.example.com/df/shirts/a.svg` (no double slash)
  - `isValidMediaKey` rejects a leading `/`, `..`, backslashes, and drive letters such as `C:`
- [ ] T019 Implement src/lib/media.ts to pass T018
- [ ] T020 [P] Write failing tests in tests/unit/catalog-validate.test.ts:
  - `validateShirt` (with its tiers and settings):
    - slug pattern `^[a-z0-9-]+$`
    - name 1–80 chars
    - style `polo|button-down`
    - complexity an integer ≥ 0
    - `final_price_usd` NULL or money ≥ `0.01`
    - a **BLAND-tier shirt with a final price ≥ the MSRP start price is an error**
    - an active shirt with 0 images is an error
  - `validateSettings`:
    - start price money ≥ `0.01`
    - anchor an integer ≥ 0
    - interval an integer ≥ 1
    - presets an array of money strings
    - `media_base_url` empty or `http(s)://`
  - `seedChecks` (warnings): ≥ 12 active, both styles, ≥ 2 BLAND, every tier populated, a T.C. Tugger slug
- [ ] T021 Implement src/lib/catalog/validate.ts (Zod) to pass T020

### Database & utilities

- [ ] T022 Define the Drizzle schema in src/lib/db/schema.ts **exactly per data-model.md**:
  - catalog tables: `media`, `shirts` (no `bland` column), `shirt_images`, `complexity_tiers` (`name`, `tagline`, `min_score` UNIQUE, `badge_bg_color`, `badge_text_color`), `store_settings` (single row, CHECK `id = 1`)
  - shopper tables: `users`, `sessions`, `carts`, `cart_items` (with `added_at`, PK (`cart_id`, `shirt_id`, `size`), quantity 1–99), `orders` (`subtotal_usd`/`shipping_usd`/`tax_usd`/`total_usd`, `checkout_token` UNIQUE), `order_items` (`tier_name`, `final_price_usd`, `msrp_usd`, `shirt_id` FK **ON DELETE RESTRICT**), `flash_credit_entries` (`amount_usd` signed, never `0.00`)
  - every `*_usd` column is TEXT with a GLOB CHECK for the two-decimal shape
  - `card_last4` is exactly 4 digits
- [ ] T023 Implement:
  - src/lib/db/client.ts (better-sqlite3 at `process.env.DATABASE_PATH ?? "data/danflashes.db"`, `foreign_keys = ON`, WAL)
  - src/lib/db/backup.ts (`backupTo(dir)` using better-sqlite3 `db.backup()` → `backups/danflashes-YYYYMMDD-HHMMSS.db`)
  - drizzle.config.ts
  - scripts/migrate.ts (**backup first**, then migrate)
  - scripts/db-backup.ts
  - scripts/db-restore.ts (takes a file path, makes a safety backup, then replaces the DB file)
  - scripts/db-reset.ts (backup unless `--no-backup`, delete the DB plus `-wal`/`-shm`, migrate, run the seed)

  Then run `npm run db:generate` to create the initial migration in drizzle/.
- [ ] T024 [P] Write tests in tests/integration/backup.test.ts: a backup writes a timestamped copy with identical rows; a restore replaces the data and leaves a safety backup; the migrate script backs up before applying
- [ ] T025 [P] Create the tests/helpers/db.ts test helper: a fresh temp-file SQLite database with migrations applied, an optional `seed` flag, deleted after the test file

### Data-access layer & seed

- [ ] T026 [P] Write failing tests in tests/integration/data-catalog.test.ts:
  - `getSettings` returns typed values (presets as money strings)
  - `listTiers` is ordered by `min_score`
  - `listActiveShirts` returns shirts with resolved image URLs, `finalPriceUsd`, `msrpUsd`, and tier (name + colors) attached, and **no complexity field in the shopper-facing shape**
  - `getShirtBySlug` also returns inactive shirts, with their status
  - saving an invalid shirt surfaces T021's errors
  - deleting a shirt referenced by an `order_items` row fails (FK RESTRICT)
- [ ] T027 Implement the data-access layer in src/lib/data/settings.ts, src/lib/data/tiers.ts, src/lib/data/media.ts, and src/lib/data/shirts.ts to pass T026. The shopper-facing types MUST omit `complexity` (FR-002).
- [ ] T028 [P] Create scripts/generate-shirt-art.ts (`npm run art:generate`), which deterministically writes SVG patterns to public/media/shirts/<slug>.svg from a slug + complexity (more complexity means more shapes, colors, and layers; BLAND-range scores get muted beige/grey) and writes a loud public/media/placeholder.svg ("IMAGE TOO COMPLICATED TO LOAD")
- [ ] T029 Create the seed in scripts/seed-data.ts and scripts/seed.ts (`npm run db:seed`, idempotent: upsert by slug/key/name):
  - the `store_settings` defaults
  - the 6 default tiers with taglines and loud badge colors
  - the placeholder media row (set as `placeholder_media_id`)
  - ≥ 14 shirts per FR-007: both styles, every tier populated, ≥ 2 BLAND (scores < 10, e.g. `beige-regret`, `khaki-commitment`), 1 `tc-tugger-belly-breather`, 1 shirt with `status: inactive`, hype descriptions, alt text describing each pattern
  - media + shirt_images rows for each shirt

  Run T028 first.
- [ ] T030 Write failing tests in tests/integration/catalog-audit.test.ts, then implement src/lib/catalog/audit.ts and scripts/catalog-audit.ts (`npm run catalog:audit`): validation errors exit 1, while outlier and seed-check warnings print and exit 0. The seeded catalog MUST audit with 0 errors.

### Brand primitives, layout, error pages

- [ ] T031 [P] Create src/lib/copy.ts with the brand-voice strings per constitution I:
  - headlines and gate copy
  - the empty-cart "You sure about that?"
  - the "Retired from the floor" banner
  - the audit notice
  - the 404/500/418 copy
  - every error code from contracts/actions.md
  - confirmations
- [ ] T032 [P] Create the brand tokens and mobile-first base styles in src/app/globals.css (Tailwind 4 `@theme`: clashing palette, display font; breakpoints sm/md/lg per R22), src/app/layout.tsx, and src/components/SiteHeader.tsx (collapses to a menu below `md`, with tap targets ≥ 44px)
- [ ] T033 [P] Create the src/components/ShirtImage.tsx client component. It takes a resolved `src`, `alt`, and the placeholder URL, and swaps to the placeholder when `src` is empty or `onError` fires (FR-019, FR-035).
- [ ] T034 [P] Create the src/components/PriceTag.tsx (`formatUsd`) and src/components/ShirtBadge.tsx (tier name with that tier's `badge_bg_color`/`badge_text_color`, optional tagline) components. Both sit on solid backings. They never receive or render a score.
- [ ] T035 [P] Create the error pages:
  - src/app/not-found.tsx (branded 404)
  - src/app/error.tsx (branded 500 with a reset button)
  - src/app/global-error.tsx (last-resort branded page)
  - src/app/teapot/route.ts (GET → branded HTML with **status 418**)

  Add tests/integration/teapot.test.ts asserting 418 and an HTML content-type (FR-037).

**Checkpoint**: `npm test` passes. `npm run db:reset` builds and seeds the database, and `npm run catalog:audit` reports 0 errors.

---

## Phase 3: User Story 1 - Browse and Filter by Complexity (Priority: P1) 🎯 MVP

**Goal**: home page and listing, with tier badges, tier/price/style filters, and sorting, on phone
and desktop.

**Independent Test**: quickstart scenarios 1–4.

- [ ] T036 [P] [US1] Write failing tests in tests/unit/listing.test.ts for `parseListingQuery` + `applyListing` + `featuredShirts`:
  - `tier` (repeatable tier ids; BLAND is tier 1)
  - `minPrice`/`maxPrice` (money strings, cents optional)
  - `style`
  - all filters ANDed; invalid params ignored
  - sorts `complexity-desc` (default), `complexity-asc`, `price-desc`, `price-asc`, comparing money exactly
  - inactive shirts excluded
  - `featuredShirts` returns the featured ones, or else the top 4 active by complexity
- [ ] T037 [US1] Implement src/lib/catalog/listing.ts to pass T036 (it sorts by complexity internally and never exposes it)
- [ ] T038 [P] [US1] Create src/components/ShirtCard.tsx (ShirtImage, name, style, ShirtBadge, PriceTag, links to `/shirts/[slug]`)
- [ ] T039 [P] [US1] Create the src/components/ListingFilters.tsx client component (tier multi-select by name, including BLAND, price range, style, sort labeled "Most Complicated"/"Least Complicated"/price; it's a slide-over drawer below `md` and writes the query string per contracts/routes.md)
- [ ] T040 [US1] Implement the /shirts page in src/app/shirts/page.tsx (Server Component: searchParams → `applyListing` → a responsive grid of ShirtCard going 1 → 2 → 3–4 columns, with an empty-result state in brand voice)
- [ ] T041 [US1] Implement the / home page in src/app/page.tsx (hype headline, `featuredShirts`, and a CTA to /shirts)
- [ ] T042 [US1] Write and pass the Playwright test tests/e2e/browse.spec.ts, running in both projects:
  - home shows featured shirts
  - /shirts shows badges and prices, with **no seeded complexity value appearing as text**
  - filter to the top tier, then sort by price descending
  - selecting BLAND shows only shirts under $300
  - the inactive seed shirt is absent
  - no horizontal scroll (`scrollWidth ≤ innerWidth`)
  - `/no-such-page` shows the branded 404
  - `/teapot` responds 418

**Checkpoint**: US1 is demoable on phone and desktop. The joke works.

---

## Phase 4: User Story 2 - Zoom, Enhance, Add to Cart (Priority: P2)

**Goal**: a detail page (active and retired), zoom/enhance, sizes, a guest cart with an audit, and the
empty-cart pitch.

**Independent Test**: quickstart scenarios 5–7 and 14.

- [ ] T043 [P] [US2] Write failing tests in tests/integration/cart.test.ts:
  - `addItem` creates a guest cart and sets `added_at`
  - the same shirt+size increments quantity and keeps `added_at`
  - a missing size → `SIZE_REQUIRED`
  - an unknown slug → `SHIRT_NOT_FOUND`
  - an inactive shirt → `SHIRT_INACTIVE`
  - `updateItem` quantity 0 removes; outside 1–99 → `INVALID_QUANTITY`
  - `getCartView` lines are ordered newest `added_at` first, with live `finalPriceUsd` and tier
  - total = exact Σ price × qty
  - changing `final_price_usd` changes the view (no stored prices)
- [ ] T044 [P] [US2] Write failing tests in tests/integration/cart-audit.test.ts: `auditCart` deletes inactive lines and returns them, leaves active lines alone, and is a no-op on an empty cart; `getCartView` runs the audit first and reports the removed lines
- [ ] T045 [US2] Implement src/lib/cart/cart.ts (`getOrCreateCart`, `addItem`, `updateItem`, `removeItem`, `auditCart`, `getCartView`) to pass T043 and T044
- [ ] T046 [US2] Write failing tests in tests/integration/actions-cart.test.ts (a new guest gets the `df_cart` cookie, and contract error codes pass through), then implement src/actions/cart.ts `addToCart`, `updateCartItem`, `removeCartItem` per contracts/actions.md (httpOnly, SameSite=Lax cookie)
- [ ] T047 [P] [US2] Create the src/components/ZoomViewer.tsx client component (ShirtImage inside, CSS transform 1×–8×, wheel + **touch pinch** + drag pan, +/−/reset buttons labeled "ENHANCE" with ≥ 44px targets, ShirtBadge overlaid)
- [ ] T048 [P] [US2] Create src/components/AddToCart.tsx (size picker S/M/L/XL/XXL, the `SIZE_REQUIRED` copy when no size is picked, calls `addToCart`)
- [ ] T049 [US2] Implement the /shirts/[slug] page in src/app/shirts/[slug]/page.tsx:
  - active: ZoomViewer, name, style, PriceTag, description, AddToCart
  - inactive: the "Retired from the floor" banner, images, name, style, badge, description, **no price, no AddToCart** (FR-014)
  - unknown: `notFound()`
- [ ] T050 [US2] Implement the /cart page in src/app/cart/page.tsx:
  - an audit notice
  - lines newest first with ShirtImage, name, ShirtBadge, size, qty controls, remove, and PriceTag
  - a running total and a Checkout button
  - **empty**: "You sure about that?", a spotlight on the most expensive active shirt, and a link to `/shirts?tier=<highest tier id>&sort=price-desc`

  Also add the cart count to SiteHeader.
- [ ] T051 [US2] Write and pass the Playwright test tests/e2e/zoom-and-cart.spec.ts, running in both projects: empty /cart shows "You sure about that?" plus the spotlight → open a shirt → Add without a size is refused → pick L → add → the cart shows the line with its badge and price → the zoom buttons change the scale

**Checkpoint**: US1 + US2 work. A guest can browse, zoom, and build a cart.

---

## Phase 5: User Story 3 - The Checkout Gate, an Account, and a Faux Card (Priority: P3)

**Goal**: accounts, the gate, faux card checkout, receipts with $0 shipping and tax, history, and
retired-shirt links.

**Independent Test**: quickstart scenarios 8–13.

- [ ] T052 [P] [US3] Write failing tests in tests/unit/faux-card.test.ts:
  - Luhn passes for 4242424242424242 and fails for 4242424242424241
  - 12–19 digits; spaces and dashes are stripped
  - future MM/YY, with the current month valid
  - CVC is 3–4 digits
  - brand detection (Visa 4, Mastercard 51–55/2221–2720, Amex 34/37, Discover 6011/65, else "Card")
  - returns only `{brand, last4}`
- [ ] T053 [P] [US3] Write failing tests in tests/integration/auth.test.ts:
  - sign-up lowercases and trims the email
  - bcrypt hash stored (cost 12)
  - duplicate → `EMAIL_TAKEN`
  - password < 8 → `WEAK_PASSWORD`
  - an unknown email and a wrong password both → `BAD_CREDENTIALS`
  - only the SHA-256 of the session token is stored
  - an expired session is rejected
  - `safeNext` allows only relative paths
- [ ] T054 [P] [US3] Write failing tests in tests/integration/cart-merge.test.ts: lines merge, identical shirt+size quantities add (capped at 99) and keep the **earlier** `added_at`, the guest cart row is deleted, and merging into a user with no cart reassigns it
- [ ] T055 [P] [US3] Write failing tests in tests/integration/place-order-card.test.ts:
  - subtotal = exact Σ final price × qty; shipping `0.00`; tax `0.00`; total = subtotal
  - `order_items` snapshot `shirt_name`, `tier_name`, `complexity`, `final_price_usd`, `msrp_usd`
  - a client-sent price is never charged
  - an `expectedTotalUsd` mismatch → `PRICE_CHANGED` with nothing written
  - an inactive line → `CART_AUDITED` (the line is removed, no order)
  - a replayed `checkoutToken` → the same order
  - an empty cart → `CART_EMPTY`
  - an invalid card → `CARD_*` with nothing written
  - gate on with no user → `GATE_SIGN_IN_REQUIRED`
  - after success the cart lines are deleted, the cart row remains, and the Flash Credit balance is unchanged
  - a scan of every table finds no full card number and no CVC
- [ ] T056 [P] [US3] Implement src/lib/payments/faux-card.ts to pass T052. It must never log its input.
- [ ] T057 [US3] Implement src/lib/auth/password.ts, src/lib/auth/session.ts (`df_session` httpOnly SameSite=Lax cookie with a random 32-byte token, SHA-256 stored, 30-day expiry), and src/lib/auth/safe-next.ts to pass T053
- [ ] T058 [US3] Add `mergeGuestCart(guestCartId, userId)` to src/lib/cart/cart.ts to pass T054
- [ ] T059 [US3] Implement the card path of src/lib/checkout/place-order.ts, inside one `BEGIN IMMEDIATE` transaction: gate → idempotency → `auditCart` → re-resolve prices → validate → card → insert the order + `order_items` snapshot → delete the cart lines. Must pass T055.
- [ ] T060 [US3] Write failing tests in tests/integration/actions-auth-checkout.test.ts (merge on sign-in, `next` redirect, gate enforcement, error passthrough), then implement src/actions/auth.ts (`signUp`, `signIn`, `signOut`) and src/actions/checkout.ts (`placeOrder` → redirect `/orders/[id]`)
- [ ] T061 [P] [US3] Implement the /sign-in and /sign-up pages in src/app/sign-in/page.tsx and src/app/sign-up/page.tsx, with gate copy when `next=/checkout`
- [ ] T062 [P] [US3] Create the src/components/OrderSummary.tsx component (lines: ShirtImage, linked name → `/shirts/[slug]`, ShirtBadge, size, qty, PriceTag; then Subtotal, Shipping $0.00, Tax $0.00, Total). Checkout, confirmation, and history all use it (FR-030).
- [ ] T063 [US3] Implement the /checkout page in src/app/checkout/page.tsx:
  - gate redirect to `/sign-in?next=/checkout`
  - `auditCart` → redirect to `/cart` if the cart is now empty
  - OrderSummary
  - a hidden `checkoutToken` + `expectedTotalUsd`
  - the price-changed and audit notices
  - the Faux Card form
- [ ] T064 [P] [US3] Implement the /orders/[id] confirmation page in src/app/orders/[id]/page.tsx (visible only to the order's owner: OrderSummary from snapshots, "charged to {brand} ending {last4}" or "paid with Flash Credit", brand-voice congratulations)
- [ ] T065 [US3] Implement the /account purchase history in src/app/account/page.tsx (`WHERE user_id = me ORDER BY created_at DESC`, each order through OrderSummary, links reaching retired shirt pages) and a sign-out button
- [ ] T066 [US3] Write and pass the Playwright test tests/e2e/card-checkout.spec.ts, running in both projects: guest adds 2 shirts → /checkout redirects to sign-in → sign up → back at checkout with the cart intact and Shipping $0.00 / Tax $0.00 → pay with 4242 4242 4242 4242 → "ending 4242" → the order is in /account → the item link opens the shirt page → /cart shows the empty-cart pitch

**Checkpoint**: the full buying loop works with a faux card.

---

## Phase 6: User Story 4 - Flash Credit (Priority: P4)

**Goal**: Flash Credit top-ups and spending at checkout, backed by an exact-decimal ledger.

**Independent Test**: quickstart scenarios 15–17.

- [ ] T067 [P] [US4] Write failing tests in tests/integration/ledger.test.ts:
  - a top-up writes a positive `top_up` entry with brand/last4
  - balance = the exact decimal sum (top-ups of `0.10` + `0.20` → `0.30`)
  - a custom amount with cents (`123.45`) works
  - `INVALID_AMOUNT` for `0`, negatives, and 3 decimals
  - entries list newest first
- [ ] T068 [P] [US4] Write failing tests in tests/integration/place-order-flash-credit.test.ts:
  - when the balance ≥ total: the order is created, one `spend` entry of −total is linked to the order, and the balance drops by exactly the total
  - when the balance < total: `INSUFFICIENT_FLASH_CREDIT` and nothing is written
  - two sequential checkouts that together exceed the balance: the second is refused and the balance never goes negative
  - a replayed token doesn't double-spend
  - a guest (gate off) choosing Flash Credit → refused
- [ ] T069 [US4] Implement src/lib/flash-credit/ledger.ts (`getBalanceUsd`, `topUp`, `listEntries`; sums in the app via money.ts, never SQL `SUM`) to pass T067
- [ ] T070 [US4] Add the `flash_credit` path to src/lib/checkout/place-order.ts (balance check + spend entry in the same `BEGIN IMMEDIATE` transaction) to pass T068
- [ ] T071 [US4] Write failing tests in tests/integration/actions-flash-credit.test.ts (sign-in required, preset and custom amounts, error passthrough), then implement src/actions/flash-credit.ts `topUpFlashCredit`
- [ ] T072 [US4] Add the Flash Credit panel to src/app/account/page.tsx (balance, entry history with spend → order links, top-up form with presets from `store_settings` plus a custom dollars-and-cents amount and the Faux Card form)
- [ ] T073 [US4] Add the Flash Credit method to src/app/checkout/page.tsx (shows the balance; on `INSUFFICIENT_FLASH_CREDIT`, offers a top-up link or the card with hype copy; hidden for guests)
- [ ] T074 [US4] Write and pass the Playwright test tests/e2e/flash-credit-checkout.spec.ts, running in both projects: sign up → top up $5,000 → check out a cart ≤ balance with Flash Credit → the balance drops by exactly the total → the spend entry links to the order

**Checkpoint**: all four stories work on their own and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T075 Add an integration test in tests/integration/checkout-gate-off.test.ts: with `store_settings.checkout_gate = 0`, a guest can place a card order (`orders.user_id` NULL) and Flash Credit is refused (FR-022)
- [ ] T076 [P] Implement scripts/seed-demo.ts (`npm run db:seed-demo`): it creates `demo@danflashes.local` / `password123` with $10,000.00 in Flash Credit and one past card order, and is idempotent
- [ ] T077 [P] Brand-voice pass: route every shopper-facing string through src/lib/copy.ts and confirm the joke is never explained (FR-034)
- [ ] T078 [P] Add the no-score audit tests/e2e/no-score.spec.ts, running in both projects: visit every shopper page type and assert that no seeded complexity value appears as text (SC-003)
- [ ] T079 [P] Performance pass: run Lighthouse (mobile) on /, /shirts, and one detail page. Confirm LCP ≤ 2.5 s, CLS ≤ 0.1, and lazy-loaded below-the-fold images (SC-007), and record the results in specs/001-core-storefront/quickstart.md
- [ ] T080 [P] Update README.md with setup, the utility scripts table, Drizzle Studio usage, and `npm run verify` (pointing to quickstart.md)
- [ ] T081 Run `npm run format`, then `npm run verify` until it is fully green
- [ ] T082 Walk quickstart.md manual scenarios 1–24 and fix anything that fails

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup. Blocks all stories. Within it: money (T009) → MSRP, resolve, and validation; schema (T022) → client/scripts (T023) → data layer (T027) → seed (T029, after art T028) → audit (T030).
- **US1 (Phase 3)**: depends on Foundational. This is the MVP.
- **US2 (Phase 4)**: depends on Foundational. It uses US1 components for navigation.
- **US3 (Phase 5)**: depends on US2 (the cart).
- **US4 (Phase 6)**: depends on US3 (accounts, `placeOrder`).
- **Polish (Phase 7)**: depends on all stories.

### Within Each Story

Tests are written and failing first. Then lib logic, then Server Actions (with their own tests),
then pages, then e2e.

### Parallel Opportunities

- Setup: T003–T006
- Foundational: the test files T008, T010, T012, T014, T016, T018, T020, plus T024, T025, T026, T028, and T031–T035
- US1: T036, T038, T039
- US2: T043, T044, T047, T048
- US3: T052–T055, T056, T061, T062, T064
- US4: T067, T068
- Polish: T076–T080

---

## Parallel Example: Foundational pure modules

```text
# Write the failing tests together:
T008 tests/unit/money.test.ts
T010 tests/unit/msrp.test.ts
T016 tests/unit/tiers.test.ts
T018 tests/unit/media.test.ts
T020 tests/unit/catalog-validate.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1)
3. **Stop and validate**: `npm run verify` plus quickstart scenarios 1–4. Demo the catalog on phone and desktop.

### Incremental Delivery

1. US1 → demo (MVP)
2. US2 → guests build carts
3. US3 → faux purchases
4. US4 → Flash Credit
5. Polish → `npm run verify` green → PR `001-core-storefront` → `main`

Run `/speckit-converge` after `/speckit-implement`, and repeat until it reports Converged.

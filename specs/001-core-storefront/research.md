# Research: Core Storefront (001)

**Date**: 2026-10-12, revised 2026-10-13 after the owner's plan review | **Plan**: [plan.md](./plan.md)

This file records each technical decision, why it was made, and what else was considered. It is the
"how the agent came to that decision" record.

## R1. Application framework

- **Decision**: Next.js 16 (App Router) with TypeScript on Node 22. The project is scaffolded with
  `create-next-app`, which picks a TypeScript version compatible with Next 16.
- **Rationale**: one project covers pages, server logic (Server Actions), and static assets. That
  fits Principle VIII (no separate API service). Server Components read data on the server, which
  keeps pricing and the money paths server-authoritative. It is very well documented, widely used,
  and matches the owner's existing Next.js experience, which helps maintenance and future
  contributors.
- **Alternatives considered**: Vite + a separate Express API, rejected as two projects where one
  will do. Remix/React Router 7 is equivalent, but there's no reason to switch from familiar tooling.

## R2. Product data lives in the database

- **Decision**: every piece of catalog data lives in SQLite: shirts, shirt images (media), complexity
  tiers, and store settings (MSRP, tactic switches, Flash Credit presets, media base URL, placeholder
  image). Nothing product-related is read from files in the codebase at runtime.
  - Pages read the database directly through one **data-access layer** (`src/lib/data/`), with no
    HTTP round-trip.
  - A demo data loader (`npm run db:seed`) inserts about 14 shirts the first time. It is a fixture
    for development only.
  - Until the Admin Console (ROADMAP 008) exists, the owner edits data with **Drizzle Studio**
    (`npm run db:studio`), a free browser-based table editor.
- **Rationale**: this is the owner's direction. Data is separated from code, an admin UI can manage
  everything later without a redeploy, and catalog edits get the same transactional safety as
  orders.
- **Alternatives considered**:
  - JSON files in the repo (the earlier draft), rejected by the owner because product data
    shouldn't live in the codebase.
  - A JSON REST API in front of the database for our own pages, deferred. Server Components make it
    an extra hop with no benefit today. Route handlers (`/api/...`) can expose the same data-access
    layer when an outside client needs it, such as a mobile app or a separate admin front end.

## R3. Storage engine: SQLite + better-sqlite3 + Drizzle

- **SQLite** is the whole database in a single file (`data/danflashes.db`). The app opens the file
  directly, so there's no database server to install, secure, or pay for.
  - **Capacity**: it handles thousands of reads per second on modest hardware, far beyond this
    store's needs.
  - **Writes** happen one at a time. In WAL mode, readers aren't blocked during a write. One writer
    at a time is exactly what makes the Flash Credit check-and-spend safe (R10).
  - **Limits**: it lives on one machine, so it needs a persistent disk (R20). Very high write
    concurrency or multi-server scaling would mean moving to Postgres or a hosted SQLite service.
- **better-sqlite3** is the Node.js driver. It is synchronous (simple code, no callback juggling) and
  consistently the fastest SQLite driver for Node.
- **Drizzle ORM**:
  - Tables are defined in TypeScript (`src/lib/db/schema.ts`), and queries are type-checked, so a
    wrong column name fails at compile time.
  - Schema changes generate **migration files**: versioned SQL scripts in `drizzle/`, committed to
    git and applied in order by `npm run db:migrate`. The database records which have run.
  - Drizzle Studio (R2) is a free data editor.
  - The SQL-first style keeps a later move to Postgres mostly mechanical: change the dialect and
    driver, regenerate the migrations.
- **Alternatives considered**: Postgres, rejected as a server to run for a low-traffic local
  tutorial (YAGNI). Prisma, rejected as heavier, with a codegen step and an engine binary. Node's
  built-in `node:sqlite`, rejected as still experimental on Node 22.12.

## R4. Money: exact dollars to the cent

- **Decision**: money is US dollars to the cent, stored as **exact two-decimal text** (`"200.18"`) in
  `*_usd` columns.
  - Every value is validated against `^-?\d+\.\d{2}$` (data layer + CHECK constraint).
  - All arithmetic goes through `src/lib/money.ts`, which wraps **big.js** (arbitrary-precision
    decimals): add, subtract, multiply by quantity, compare, round half-up to 2 places, and format as
    `$1,234,567.89`.
  - Sums such as order subtotals and the Flash Credit balance are computed in the app, not with SQL
    `SUM` (which would convert to floats).
- **Rationale**:
  - The owner wants money stored as readable dollars and cents, and cent granularity everywhere.
  - Binary floating point (SQLite `REAL`, JS `number`) can't represent most cent values exactly
    (`0.10 + 0.20 = 0.30000000000000004`), and the errors accumulate across orders and balances.
  - SQLite has no exact DECIMAL type, so exact decimal text plus a decimal library is the standard
    approach. It reads naturally in Drizzle Studio and maps directly to Postgres `NUMERIC(…, 2)` if
    the store moves later.
  - Exact decimals have **no ceiling**, so "no price ceiling" (constitution II) holds literally. The
    earlier safe-integer cap and its Complexity Tracking entry are gone.
- **Alternatives considered**:
  - Integer cents (the earlier draft), rejected by the owner because stored values don't read as
    dollars.
  - `REAL`/float dollars, rejected as inexact.
  - decimal.js, an equivalent but larger library. big.js covers everything a store needs.

## R5. MSRP algorithm

- **Decision**: `msrpUsd(score) = roundHalfUp₂(startPrice × 2^((score − anchorScore) / doublingInterval))`,
  with defaults startPrice = `300.00`, anchorScore = 10, doublingInterval = 10.
  - The power of two is computed in floating point and **immediately converted to an exact decimal
    and rounded to the cent**. The float never escapes, and the result is deterministic.
  - Examples: 0 → `150.00`, 10 → `300.00`, 15 → `424.26`, 20 → `600.00`, 50 → `4800.00`.
  - The values live in `store_settings`. Final price = `final_price_usd` if set, else the MSRP.
- **Rationale**: this is the most direct expression of "exponential, owner-tunable," at cent
  granularity as the owner asked. Rounding a monotonic function keeps it non-decreasing. Scores in
  the BLAND tier (below the anchor) land under $300 automatically.

## R6. (Removed) Pricing outlier alarm

- **Status**: removed 2026-10-13 by the owner (constitution v4.0.0). The owner's prices are the
  owner's business. Pricing-vs-complexity analysis is a downstream Admin Console feature
  (ROADMAP 008).
- **What remains**: the **hard rule** that a BLAND-tier shirt can't be priced at or above the MSRP
  start price (constitution III). It is enforced on save and by `catalog:audit`.
- The number is kept so other R-references stay stable.

## R7. Authentication and sessions

- **Decision**: self-hosted email + password. Passwords are hashed with `bcryptjs` (cost 12).
  Sessions use a random 32-byte token in an httpOnly, SameSite=Lax cookie, and only its SHA-256 hash
  is stored in a `sessions` table with a 30-day expiry.
- **Rationale**: this is the simplest thing that meets FR-019, with no external provider and no
  native build on Windows.
- **Alternatives considered**: Auth.js Credentials, rejected as more configuration than the logic it
  replaces. Argon2, rejected because it needs a native module.

## R8. Guest cart, merge, and line order

- **Decision**: carts live in SQLite. A guest's cart id lives in an httpOnly `df_cart` cookie. On
  sign-in or sign-up, the guest cart's lines merge into the account cart (identical shirt and size
  pairs add their quantities, capped at 99, and keep the earlier `added_at`) and the guest cart is
  deleted.
- **Line order**: most recently added first (`added_at DESC`).
- **Rationale**: the server-side cart means checkout never trusts client contents or prices.
  Newest-first is the convention shoppers expect.
- **Alternatives considered**:
  - Sorting by price or tier, available as a one-line change if wanted.
  - **Drag-to-reorder**, rejected for 001: it needs touch and keyboard support plus a stored
    position per line, for a cart that usually holds a few shirts (Principle VIII). It could come
    back as a gag in 005 Checkout Squeeze.

## R9. Faux card validation

- **Decision**: in-house validation: Luhn checksum on 12–19 digits, a future MM/YY expiry, and a
  3–4 digit CVC. The brand is detected from the leading digits. Only the brand and last 4 digits are
  persisted. The full number and CVC never leave the Server Action.
- **Rationale**: this follows the constitution ("Card numbers are props").

## R10. Flash Credit ledger and checkout atomicity

- **Decision**: a `flash_credit_entries` table holds signed `amount_usd` values, and the balance is
  their exact decimal sum (R4). A Flash Credit checkout runs in one `BEGIN IMMEDIATE` transaction:
  audit cart → re-resolve prices → sum the balance → refuse if short → insert the order and its
  item snapshots → insert the spend entry → delete the cart lines. A one-time `checkout_token`
  (UNIQUE) makes double submits idempotent.
- **Rationale**: the SQLite write lock serializes competing spends, so the balance can't go negative
  (constitution "Flash Credit is a ledger").

## R11. Store settings

- **Decision**: a `store_settings` table with a single row of typed columns holds:
  - the MSRP settings (start price as money text)
  - `checkout_gate`
  - the Flash Credit presets (a JSON array of money strings)
  - `media_base_url`
  - `placeholder_media_id`

  The tiers are their own table (R15). Defaults come from the seed.
- **Rationale**: typed columns are validated by the database and the ORM, which a key/value table
  wouldn't give us. A single row is the simplest model for one store. Each future tactic (ROADMAP)
  adds its own switch column through a migration.

## R12. Zoom / enhance

- **Decision**: a client component that uses CSS transforms (scale + translate) with wheel, pinch,
  drag, and +/− buttons, up to 8×. Seed shirt art is SVG, which stays sharp at any zoom.
- **Rationale**: no dependency (Principle VIII), and touch support is built in (FR-034).

## R13. Styling

- **Decision**: Tailwind CSS 4, with a brand token layer of loud colors and display fonts, written
  mobile-first.
- **Rationale**: fast iteration on an intentionally maximal design. Responsive by default (R22).

## R14. Testing: one command, full suite

- **Decision**:
  - **Vitest** for unit tests (pure modules) and integration tests (data layer, cart, audit, merge,
    auth, checkout, ledger, and Server Action logic), each against a fresh temp-file SQLite
    database. `@vitest/coverage-v8` enforces at least 90% line coverage on `src/lib/**`.
  - **Playwright** end-to-end tests: one per user story's primary journey, run in **two projects**,
    desktop Chrome and a phone viewport (Pixel 7 emulation).
  - **`npm run verify`** runs `format:check` → `lint` → `typecheck` → `test:coverage` → `test:e2e`
    and fails fast. This is the one-glance health check.
- **Rationale**: this is constitution VI and SC-010.

## R15. Complexity tiers (and BLAND)

- **Decision**: a `complexity_tiers` table holds `id` (stable integer), `name` (the badge text),
  `tagline`, `min_score` (UNIQUE), `badge_bg_color`, and `badge_text_color`.
  - A shirt's tier is **looked up from its score** (the highest `min_score` ≤ the score). Shirts don't
    store a `tier_id`.
  - Validation requires a tier at `min_score = 0`, which guarantees no gaps, no overlaps, and an
    open-ended last tier.
  - **The lowest tier is the BLAND tier.** There is no separate bland flag.
  - The listing filters by tier `id`, so renaming or restyling a tier never breaks a URL.
- **Rationale**: the owner can add, rename, re-range, or restyle tiers as data. Looking tiers up
  from scores means a range change re-buckets every shirt instantly, with nothing to resync. A
  stored `tier_id` would duplicate information that the score already determines, and it could
  drift. Making bland simply the bottom tier was the owner's call, and it removes a redundant flag.
- **Alternatives considered**: `shirts.tier_id` as a foreign key, rejected for the drift reason above.
  It would only make sense if tiers stopped being score-based.

## R16. Cart audit (inactive shirts)

- **Decision**: one function, `auditCart(cartId)`, deletes lines whose shirt is inactive and returns
  them. Lines can't reference missing shirts because foreign keys prevent it. It runs in the cart
  view, the checkout page load, and `placeOrder`, and removed lines are shown once in brand voice.

## R17. Database utilities: migrations, backups, seed, reset

- **Migrations change structure; backups copy data.** Migrations are SQL files in git (`drizzle/`).
  Backups are copies of the data file, taken outside git.
- **Decision**: these scripts are run through `tsx`:

  | Script | What it does |
  |---|---|
  | `db:backup` | Uses SQLite's online backup API (`db.backup()`, safe while the app is running) to write `backups/danflashes-YYYYMMDD-HHMMSS.db` (gitignored) |
  | `db:restore <file>` | Takes a safety backup of the current database, then replaces it with the chosen file |
  | `db:migrate` | **Backs up automatically first**, then applies pending migrations |
  | `db:reset` | **Backs up first** (skippable with `--no-backup`, which the end-to-end tests use), deletes the database, migrates, and seeds |
  | `db:seed` | Inserts the demo catalog, tiers, settings, and media if absent. Idempotent. |
  | `db:seed-demo` | Adds demo shoppers (one with $10,000 in Flash Credit and a past order) |
  | `db:studio` | Opens Drizzle Studio |

- **Rationale**: the owner asked about backups. Automatic pre-change backups mean there's always a
  copy from right before any structural change or reset.

## R18. Media and the placeholder image

- **Decision**:
  - Image **files** live in `public/media/` (shirts in `public/media/shirts/`). Next.js serves them
    statically with caching.
  - A `media` table stores a **relative key** (`shirts/geo-riot.svg`), alt text, and a kind
    (`shirt | placeholder`).
  - The full URL = `store_settings.media_base_url` + key. An empty base means this site
    (`/media/` + key).
  - The placeholder is a `media` row, selected by `store_settings.placeholder_media_id`. A shared
    `ShirtImage` component falls back to it when a shirt has no image or the image fails to load.
- **Rationale**:
  - **Relative key + base URL, not absolute paths**: an absolute file path like `C:\dev\...` breaks
    on any other machine, and a browser can't load it. With a base URL, moving to Azure Blob
    Storage or S3 later means uploading the folder and changing one setting. No rows change.
  - **Not base64 in SQLite**: it bloats the database, defeats browser and CDN caching, and slows
    every query that touches shirts.
- **Alternatives considered**: an image CDN now, rejected as unnecessary at this traffic level and
  something the owner doesn't want to configure yet.

## R19. Retired shirt pages and order permanence

- **Decision**: `order_items.shirt_id` is a foreign key to `shirts` with `ON DELETE RESTRICT`, so the
  database itself refuses to delete an ordered shirt (FR-008). Owners deactivate shirts instead.
  `/shirts/[slug]` renders inactive shirts in a "Retired from the floor" state. Order items also
  snapshot the name, badge, and prices.

## R20. Hosting (future, not part of 001)

- **Decision**: 001 runs locally only. The design is deployable to **any always-on Node 22 host with a
  persistent disk** (`next build && next start`, or a small Docker image), such as a $5 VPS,
  Fly.io, Railway, Render with a disk, or Azure App Service. The `data/` and `public/media/` folders
  sit on the persistent volume.
- **Not serverless**: Vercel, Netlify, and similar serverless hosts don't keep a writable disk
  between requests, so SQLite can't live there. Nothing in the plan requires a paid platform.
- **Scale path**: if traffic ever outgrows one box, move the database to Postgres or Turso (a hosted,
  SQLite-compatible service) through Drizzle, and move media to blob storage by changing the base
  URL (R18).

## R21. Code hygiene

- **Decision**:
  - **Prettier**, with `prettier-plugin-tailwindcss` (consistent Tailwind class order) and an
    `.prettierrc` (single source of style).
  - **ESLint** with Next's config plus `eslint-config-prettier`, so they don't fight.
  - An `.editorconfig` for editors.
  - Scripts: `format` (write) and `format:check` (part of `verify`).
- **Rationale**: this is the constitution's "Clean, consistent code" rule. It's tool-enforced, so
  reviews talk about behavior, not style.
- **Optional later**: a pre-commit hook (husky + lint-staged) to format staged files automatically.
  It's not added now so commits don't depend on hooks; `verify` already gates merges.

## R22. Responsive layout

- **Decision**: mobile-first Tailwind layouts with breakpoints at `sm` (640), `md` (768), and `lg`
  (1024). The product grid runs 1 → 2 → 3–4 columns. The header collapses to a menu on phones.
  Tap targets are at least 44px, and the zoom viewer handles touch. Playwright runs every journey at
  a phone viewport too (R14).

## R23. Error pages

- **Decision**:
  - `src/app/not-found.tsx` is the branded 404.
  - `src/app/error.tsx` is the branded 500 for a page-level failure, with a "try again" reset.
  - `src/app/global-error.tsx` is a last-resort branded page if the layout itself fails.
  - `src/app/teapot/route.ts` returns a branded HTML page with HTTP **418 I'm a teapot**. App Router
    pages can't set arbitrary status codes, so this one is a route handler.
- **Rationale**: this is FR-035. A framework-default error page would break the bit.

## R24. Implementation findings (2026-10-13, `/speckit-implement` T001–T040)

Decisions that the plan could not have known until code ran:

- **better-sqlite3 pinned to `^12.11.1`.** The v13.0.3 prebuilt Windows x64 binary segfaults
  (access violation) on this machine's Node 22.12 / N-API 9. v12 ships a Node-ABI-specific binary
  that works. Revisit when Node is upgraded.
- **`@types/node` is `^22`** (the scaffold pinned `^20`), because Vitest 5 requires it and the
  project targets Node 22 anyway.
- **Next.js 16.4 ships with Cache Components on.** Synchronous better-sqlite3 reads count as
  "predictable" and would be **prerendered at build time**, freezing the catalog. So every page
  reads the database through `src/app/_data/storefront.ts`, which calls `connection()` and must
  sit inside `<Suspense>`. Result: `/` and `/shirts` build as Partial Prerender (static shell plus
  streamed catalog), `/teapot` is dynamic, and the build has no warnings.
- **The error boundary prop is `retry()`** in 16.4 (formerly `reset()`).
- **`/teapot` reads the request's Accept header.** It serves HTML or plain text, and that read
  also keeps the route handler request-time instead of prerendered.
- **Plain `<img>` instead of `next/image`** for shirt art. The art is SVG and is served from a
  configurable media base URL (R18), which `next/image` doesn't support without extra
  configuration. Images are sized 800×800 to prevent layout shift and lazy-loaded below the fold.
- **The listing filters are a plain GET form**, so they work without JavaScript and the URLs are
  shareable. They sit in a `FilterDrawer` that is CSS-only from `md` up (always open), and only the
  phone toggle uses JavaScript. An earlier `<details>` + `useEffect` version caused a hydration
  race and a desktop layout shift.
- **Placeholder art is capped** at about 600 shapes per SVG (≤ 70 KB), so top-tier shirts stay
  fast while still looking the most complicated.
- **`.gitattributes` forces LF** so Prettier's check passes on Windows, where Git converts to
  CRLF on checkout.
- **`BACKUP_DIR` environment variable** (default `backups/`), added so the "migrate backs up
  first" behavior can be tested end to end.
- **The SQLite CHECK constraint for money** is built from GLOB patterns plus structural checks,
  since SQLite has no regex. It was verified against 13 good and bad inputs.

## R25. Implementation findings (2026-10-13, `/speckit-implement` T041–T072)

- **Next 16 keeps visited routes mounted but hidden** (React `<Activity>`, part of Cache
  Components) so Back and Forward are instant. After a client-side navigation, the previous page's
  DOM is still present with `display: none`. End-to-end locators therefore target visible elements
  only (`tests/e2e/helpers.ts → visible()`).
- **E2E runs use their own build directory** (`NEXT_DIST_DIR=.next-e2e`, read in
  `next.config.ts`). Next 16 refuses a second `next dev` in the same `.next`, so `npm run verify`
  previously failed whenever the developer's own `npm run dev` was running.
- **Action logic is framework-free.** `src/lib/actions/*` take a `CookieJar` interface and are
  unit-tested with a fake jar. `src/actions/*` are thin `"use server"` adapters that add Next's
  `cookies()`, `redirect()`, and `refresh()`.
- **Pages read sessions and carts at request time** via `src/app/_data/request.ts`, inside
  `<Suspense>`. Session caching (`"use cache: private"`) is deliberately not used yet (YAGNI).
- **Card fields use `autoComplete="off"`** so a browser never autofills a real saved card into the
  faux checkout or top-up forms. Only the brand and last 4 are kept.
- **Sign-in timing is uniform.** An unknown email is still compared against a real cost-12 bcrypt
  hash, so response time doesn't reveal which emails have accounts.
- **Process note:** the Flash Credit *spend* branch of `placeOrder` and the read-only ledger were
  written alongside the card path, before their US4 tests. Those tests were then written and run,
  and they failed first (no `topUp` yet), but the spend branch itself was not strictly red-first.
- **Order lines keep cart order** (newest first). An order with an unknown id and someone else's
  order both return the same 404, so order ids can't be probed.
- **An unknown shirt slug** renders the branded not-found UI. Because the page shell has already
  streamed (Partial Prerender), the HTTP status is 200 with `noindex` rather than 404, which is
  documented Next.js behavior. Unmatched routes still return a true 404.

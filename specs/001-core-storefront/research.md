# Research: Core Storefront (001)

**Date**: 2026-10-12 | **Plan**: [plan.md](./plan.md)

This file records each technical decision, why it was made, and what else was considered. It is the
"how the agent came to that decision" record.

## R1. Application framework

- **Decision**: Next.js 16 (App Router) with TypeScript on Node 22. The project is scaffolded with
  `create-next-app`, which picks a TypeScript version compatible with Next 16. TypeScript 7 is not
  pinned manually.
- **Rationale**: one project covers pages, server logic (Server Actions), and static assets. That
  fits Principle VIII (no separate API service). Server Components keep pricing and the money paths
  on the server (server-authoritative pricing). It also matches the owner's existing Next.js
  experience.
- **Alternatives considered**: Vite + a separate Express API, rejected as two projects where one
  will do. Remix/React Router 7 is equivalent, but there's no reason to switch from familiar tooling.

## R2. Catalog storage: JSON files

- **Decision**: one JSON file per shirt in `catalog/shirts/*.json`, plus `config/store.json` for MSRP
  settings and tactic switches. All files are validated with Zod when they load. An invalid catalog
  fails loudly at startup and in `npm run catalog:check`.
- **Rationale**: this is the owner's stated preference (spec Assumptions). Files are diffable in git,
  editable without an admin UI, and they make "owner sets scores and final prices" literal.
- **Alternatives considered**: shirts in SQLite, rejected because it needs an admin UI to edit and
  hides the catalog from git history. A single `catalog.json`, rejected because one file per shirt
  makes merges and reviews cleaner.

## R3. Transactional storage: SQLite + Drizzle

- **Decision**: SQLite file at `data/danflashes.db` (gitignored), accessed through `better-sqlite3`
  with Drizzle ORM. Migrations are generated with `drizzle-kit` into `drizzle/`.
- **Rationale**: there's no server to run and it works locally. SQLite transactions serialize
  writers, which gives Flash Credit atomic check-and-spend for free. Drizzle keeps the schema typed
  and close to SQL.
- **Alternatives considered**: Postgres, rejected as needing a running service for a local tutorial
  (YAGNI). Prisma, rejected as heavier, with a codegen step and its own engine binary. Node's
  built-in `node:sqlite`, rejected because it's still experimental on Node 22.12 and Drizzle support
  is less mature.

## R4. Money representation and the "no ceiling" rule

- **Decision**: all money is integer **cents** stored as SQLite INTEGER, with JS `number` limited to
  `Number.MAX_SAFE_INTEGER` (about $90 trillion). Prices are whole dollars, so cents = dollars × 100.
  The catalog loader rejects any shirt whose final price exceeds the safe limit, and checkout refuses
  any cart total above it with the brand-voice "too complicated to buy online" message.
- **Rationale**: the constitution requires integer money and no floats. A true "no ceiling" is not
  representable in any fixed-width number, so the practical ceiling is about $90 trillion, which is
  past every realistic score (score 300 at the defaults is about $161 billion).
- **Alternatives considered**: BigInt or decimal strings everywhere, rejected because SQLite INTEGER is
  64-bit anyway. That would add serialization complexity to every layer for prices nobody will
  reach. Logged in Complexity Tracking.

## R5. MSRP algorithm

- **Decision**: `msrpDollars(score) = round(startPrice × 2^((score − anchorScore) / doublingInterval))`,
  with defaults startPrice = 300, anchorScore = 10, doublingInterval = 10. Settings live in
  `config/store.json`. Final price = the owner's `finalPrice` if set, else the MSRP.
- **Rationale**: this is the most direct expression of "exponential, owner-tunable." Rounding to whole
  dollars keeps the function non-decreasing, because both `pow` and `round` are monotonic. Scores
  below the anchor produce sub-$300 prices for bland shirts automatically (score 0 → $150).
- **Alternatives considered**: `base × growth^score`, rejected because "doubling interval" and
  "anchor" are easier for the owner to reason about than a raw growth factor.

## R6. Complexity-order warning

- **Decision**: a pure function sorts shirts by score and flags any shirt whose final price is lower
  than the maximum final price among shirts with a strictly lower score. Warnings print at catalog
  load (server log) and from `npm run catalog:check`. They never block.
- **Rationale**: this is what constitution Principle II and FR-006 call for. A pure function is
  trivial to test.

## R7. Authentication and sessions

- **Decision**: self-hosted email + password. Passwords are hashed with `bcryptjs` (cost 12).
  Sessions use a random 32-byte token in an httpOnly, SameSite=Lax cookie, and only its SHA-256 hash
  is stored in a `sessions` table with a 30-day expiry.
- **Rationale**: this is the simplest thing that meets FR-015, with no external provider. `bcryptjs`
  is pure JS, so there are no native-build issues on Windows.
- **Alternatives considered**: Auth.js Credentials provider, rejected as more configuration than the
  logic it replaces. Argon2, rejected because it needs a native module and adds no meaningful
  benefit for a local joke store.

## R8. Guest cart and merge

- **Decision**: carts live in SQLite. A guest's cart id lives in an httpOnly `df_cart` cookie. On
  sign-in or sign-up, the guest cart's items merge into the account's cart (identical shirt and size
  pairs add their quantities) and the guest cart is deleted.
- **Rationale**: keeping the cart on the server means checkout never trusts client cart contents or
  prices. It survives refreshes and makes the merge a single transaction.
- **Alternatives considered**: a localStorage cart, rejected because prices could be tampered with
  client-side and it complicates the merge.

## R9. Faux card validation

- **Decision**: in-house validation: Luhn checksum on 12–19 digits, a future MM/YY expiry, and a
  3–4 digit CVC. The brand is detected from the leading digits (Visa, Mastercard, Amex, Discover,
  else "Card"). Only the brand and last 4 digits are persisted. The full number and CVC are never
  logged or stored, and they never leave the Server Action.
- **Rationale**: this follows the constitution ("Card numbers are props"). Published test numbers
  such as 4242 4242 4242 4242 work.

## R10. Flash Credit ledger and checkout atomicity

- **Decision**: a `flash_credit_entries` table holds signed cent amounts (top-ups positive, spends
  negative), and the balance is `SUM(amount_cents)`. A Flash Credit checkout runs in one
  `BEGIN IMMEDIATE` transaction: re-resolve prices → compute the total → read the balance → refuse if
  the balance is short → insert the order and items → insert the spend entry. Each checkout form
  carries a one-time `checkoutToken` with a UNIQUE constraint on orders, which makes double submits
  idempotent.
- **Rationale**: this meets the constitution's ledger rules and the spec edge cases (double submit,
  two sessions spending the same credit). The SQLite write lock serializes competing spends.

## R11. Tactic switches

- **Decision**: `config/store.json` has a `tactics` object. 001 adds only `checkoutGate` (default
  `true`). Later features add their own keys.
- **Rationale**: constitution Principle IV says every tactic is a named feature with an on/off switch.

## R12. Zoom / enhance

- **Decision**: a client component that uses CSS transforms (scale + translate) with wheel, pinch,
  drag, and +/− buttons on the full-resolution image, up to 8×. Seed shirt art is SVG, which stays
  sharp at any zoom.
- **Rationale**: no dependency (Principle VIII). SVG satisfies "motifs stay distinguishable at
  maximum zoom."
- **Alternatives considered**: a zoom library (e.g., react-zoom-pan-pinch), deferred unless the
  hand-rolled version proves inadequate.

## R13. Styling

- **Decision**: Tailwind CSS 4, with a brand token layer of loud colors and display fonts.
- **Rationale**: fast iteration on an intentionally maximal design. There is no component library;
  nothing about this store should look like a default.

## R14. Testing

- **Decision**:
  - **Vitest** for unit tests (MSRP, final-price resolution, order warning, faux card, money
    formatting) and integration tests (cart merge, checkout, ledger), run against a temp-file SQLite
    database per test file.
  - **Playwright** for end-to-end tests: guest cart → gate → sign-up → card checkout, and top-up →
    Flash Credit checkout.
- **Rationale**: this covers constitution Principle VI exactly. Money paths are written test-first.

# Implementation Plan: Core Storefront

**Branch**: `001-core-storefront` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-storefront/spec.md`

## Summary

001 builds the foundation of the Dan Flashes store. It has five parts:

- a home page
- a shirt listing with complexity and price filters
- a detail page with zoom, sizes, and add to cart
- a guest cart, with an account-gated checkout that takes a faux card or Flash Credit
- purchase history

The owner edits the catalog as JSON files in the repo. Each shirt's MSRP comes from an exponential,
owner-tunable function of its complexity score, and the owner can set a final price over it.
Everything shoppers create (accounts, sessions, carts, orders, the Flash Credit ledger) lives in
SQLite.

It's a single Next.js App Router project. Pricing and payments resolve only on the server, through
Server Components and Server Actions. Money paths are written test-first with Vitest, and Playwright
tests checkout end to end.

## Technical Context

**Language/Version**: TypeScript (the version chosen by `create-next-app` for Next 16) on Node.js 22

**Primary Dependencies**:
- Next.js 16 (App Router), React 19
- Drizzle ORM + `better-sqlite3`
- Zod 4
- `bcryptjs`
- Tailwind CSS 4

**Storage**: JSON files for the catalog and config (`catalog/`, `config/`). SQLite (`data/danflashes.db`)
for transactional data.

**Testing**: Vitest (unit and integration), Playwright (end-to-end)

**Target Platform**: local development (`localhost:3000`) on Windows, macOS, or Linux. No
deployment target yet.

**Project Type**: web application (a single full-stack Next.js project)

**Performance Goals**: Core Web Vitals p75 on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1
(constitution VII, SC-007)

**Constraints**:
- integer-cent money capped at `Number.MAX_SAFE_INTEGER` (research R4)
- no real payment processor
- full card numbers and CVCs are never persisted
- prices resolve on the server only

**Scale/Scope**: about 12–50 catalog shirts, about 9 pages, a handful of local users

All Technical Context items are resolved. See [research.md](./research.md) (R1–R14).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v2.0.0.

| # | Principle / Rule | How 001 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | All copy goes through the brand voice (FR-029). Every feature in 001 leads to buying a shirt. The joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | One MSRP function in `src/lib/pricing/msrp.ts`, exponential and monotonic, with settings in `config/store.json`. The owner's `finalPrice` overrides it in the JSON. The order warning comes from `catalog:check` and load (R5, R6). The score is always shown next to the price (FR-010). | ✅ | ✅ |
| III | Relentlessly Vibrant | The owner curates. `bland` flag with a < $300 rule enforced at catalog load. SVG art can be zoomed (R12). | ✅ | ✅ |
| IV | Shamelessly Manipulative | The checkout gate ships as `tactics.checkoutGate`, a switch (R11). Other tactics are deferred to their own specs (ROADMAP). | ✅ | ✅ |
| V | Maximum Visual Assault | Tailwind brand tokens, loud by default. Price, score, and Add to Cart sit on solid backings. Flash Mode is deferred to 006. | ✅ | ✅ |
| VI | Money Math Is Test-First | Unit tests first for MSRP, final-price resolution, order warnings, faux card, and the ledger. Integration tests for checkout. Playwright end-to-end tests for both payment methods (R14). | ✅ | ✅ |
| VII | Fast Even When Complicated | Server Components by default, SVG/`next/image`, below-the-fold images lazy-loaded, and a Lighthouse check in quickstart. | ✅ | ✅ |
| VIII | Simple Code, Complicated Shirts | One project. No admin UI (JSON files). No auth or zoom libraries. Every dependency is justified in research.md. | ✅ | ✅ |
| C1 | Joke store, fake money | No payment SDK at all (R9). | ✅ | ✅ |
| C2 | Card numbers are props | Only brand and last 4 are stored. The number and CVC stay inside the Server Action (R9, contracts/actions.md). | ✅ | ✅ |
| C3 | Flash Credit is a ledger | Signed entries, derived balance, `BEGIN IMMEDIATE` check-and-spend (R10). | ✅ | ✅ |
| C4 | Server-authoritative pricing | No action accepts a price. Carts store no prices. Prices are re-resolved at checkout (data-model). | ✅ | ✅ |
| C5 | Integer money | `*_cents` integers everywhere (data-model). | ✅ | ✅ |
| C6 | Secrets out of git | Nothing secret in 001. `.env.example` is created for future use. `data/` is gitignored. | ✅ | ✅ |
| W | Workflow gates | Feature branch, spec → plan → tasks. `/speckit-analyze` is required before implement (it touches money). | ✅ | ✅ |

**Result**: PASS (both pre-research and post-design). There is one documented deviation, listed in
Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-storefront/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1: catalog.schema.json, routes.md, actions.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
catalog/
└── shirts/*.json              # owner-edited, one file per shirt
config/
└── store.json                 # MSRP settings, tactic switches, Flash Credit presets
public/
└── shirts/*.svg               # shirt art (placeholder patterns for the tutorial)
data/                          # SQLite database (gitignored)
drizzle/                       # generated migrations
scripts/
└── catalog-check.ts           # npm run catalog:check
src/
├── app/
│   ├── layout.tsx, globals.css
│   ├── page.tsx                       # /
│   ├── shirts/page.tsx                # /shirts
│   ├── shirts/[slug]/page.tsx         # /shirts/[slug]
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── account/page.tsx
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── actions/                   # Server Actions: cart.ts, auth.ts, checkout.ts, flash-credit.ts
├── components/                # ShirtCard, PriceTag, ComplexityBadge, ZoomViewer, Filters, …
└── lib/
    ├── catalog/               # schema.ts (Zod), load.ts, warnings.ts
    ├── pricing/               # msrp.ts, resolve.ts
    ├── money.ts               # cents ↔ display, safe limit
    ├── payments/faux-card.ts  # Luhn, expiry, CVC, brand
    ├── db/                    # schema.ts (Drizzle), client.ts
    ├── auth/                  # password.ts, session.ts
    ├── cart/                  # cart.ts (get/create, merge)
    ├── checkout/              # place-order.ts (transactional core)
    ├── flash-credit/          # ledger.ts
    └── copy.ts                # brand-voice strings
tests/
├── unit/                      # msrp, resolve, warnings, faux-card, money, catalog schema
├── integration/               # cart merge, place-order, ledger (temp SQLite)
└── e2e/                       # Playwright: card checkout, Flash Credit checkout
```

**Structure Decision**: a single Next.js project at the repo root. The domain logic lives in
`src/lib/`, which is framework-free and unit-testable. Server Actions in `src/actions/` are thin
adapters that call it. Pages in `src/app/` render. Catalog and config live outside `src/`, so the
owner edits data, not code.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| "No price ceiling" (II) is capped at about $90 trillion (`Number.MAX_SAFE_INTEGER` cents) | SQLite INTEGER and JS `number` are fixed-width. Exceeding the cap is refused with the "too complicated to buy online" message. | BigInt or decimal strings end to end add serialization to every layer for prices no realistic score reaches (score 300 ≈ $161 billion at the defaults). |

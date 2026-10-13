# Implementation Plan: Core Storefront

**Branch**: `001-core-storefront` | **Date**: 2026-10-12, revised 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-core-storefront/spec.md`

## Summary

001 builds the foundation of the Dan Flashes store:

- a home page
- a responsive shirt listing with tier, price, and style filters
- a detail page with zoom, sizes, and add to cart
- a guest cart with an inactive-shirt audit
- an account-gated checkout that takes a faux card or Flash Credit
- purchase history
- branded 404, 500, and 418 pages

**All data lives in one SQLite database.** That covers shirts, media references, tiers, store
settings, accounts, carts, orders, and the Flash Credit ledger. Image files live in `public/media/`,
addressed by relative keys and a configurable base URL.

Each shirt's MSRP comes from an exponential, owner-tunable function of its hidden complexity score,
and the owner can set a final price over it. Shoppers see tier badges, never scores. Until the Admin
Console (ROADMAP 008) exists, the owner edits data in Drizzle Studio.

It's a single Next.js App Router project. Pages read the database on the server through one
data-access layer. Mutations are Server Actions. Money paths are written test-first.
`npm run verify` (format, lint, types, unit and integration tests with coverage, and e2e tests on
desktop and phone) is the one-glance health check.

## Technical Context

**Language/Version**: TypeScript (the version chosen by `create-next-app` for Next 16) on Node.js 22

**Primary Dependencies**:
- Next.js 16 (App Router), React 19
- Drizzle ORM + `better-sqlite3`
- Zod 4
- `bcryptjs`
- `big.js` (exact decimal money)
- Tailwind CSS 4

**Dev Tooling**:
- Prettier (+ `prettier-plugin-tailwindcss`), ESLint (+ `eslint-config-prettier`), EditorConfig
- Vitest (+ `@vitest/coverage-v8`), Playwright
- `tsx` for scripts, Drizzle Kit (migrations, Studio)

**Storage**: SQLite (`data/danflashes.db`) for everything. Image files go in `public/media/`.
Backups go to `backups/` (R17).

**Testing**:
- Vitest unit and integration tests, with ≥ 90% line coverage on `src/lib`
- Playwright e2e tests at desktop and phone viewports
- `npm run verify` runs everything

**Target Platform**: local development (`localhost:3000`) on Windows, macOS, or Linux. Deployable
later to any always-on Node 22 host with a persistent disk. Not serverless (R20).

**Project Type**: web application (a single full-stack Next.js project)

**Performance Goals**: Core Web Vitals p75 on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1
(constitution VII, SC-007)

**Constraints**:
- exact two-decimal USD money with no floats and no ceiling (R4)
- no real payment processor
- full card numbers and CVCs are never persisted
- prices resolve on the server only
- no product data in code files
- responsive from 360px

**Scale/Scope**: about 14–100 shirts, 9 shopper pages plus 3 error pages, low traffic, one store

All Technical Context items are resolved. See [research.md](./research.md) (R1–R23).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v3.0.0 (draft pending ratification).

| # | Principle / Rule | How 001 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | All copy goes through `src/lib/copy.ts` in brand voice (FR-037), including the error pages and the 418. | ✅ | ✅ |
| II | Complexity Is the Price | One MSRP function (`src/lib/pricing/msrp.ts`), with settings in `store_settings`. The owner's `final_price_usd` overrides it. The score is never rendered: tier/BLAND badges instead (R15). An ordered shirt can't be deleted (FK RESTRICT, R19). | ✅ | ✅ |
| III | Relentlessly Vibrant | The owner curates. BLAND is the lowest tier, and its < start-price rule is enforced on save. SVG art can be zoomed. | ✅ | ✅ |
| IV | Shamelessly Manipulative | The checkout gate is the `store_settings.checkout_gate` switch. Other tactics are deferred to their own specs. | ✅ | ✅ |
| V | Maximum Visual Assault | Loud Tailwind tokens. Price, badge, and Add to Cart sit on solid backings. Mobile-first, responsive from 360px (R22). Flash Mode is deferred to 006. | ✅ | ✅ |
| VI | Fully Tested, Money Math First | `npm run verify` gates merge. Money paths are test-first. Every lib module and Server Action is tested. One e2e test per user story at two viewports (R14). | ✅ | ✅ |
| VII | Fast Even When Complicated | Server Components by default, static media with caching, lazy-loaded below-the-fold images, and a Lighthouse pass. | ✅ | ✅ |
| VIII | Simple Code, Complicated Shirts | One project. No API layer until a client needs it. No admin UI yet (Drizzle Studio). No auth or zoom libraries. Every dependency is justified in research.md. | ✅ | ✅ |
| C1 | Joke store, fake money | No payment SDK at all (R9). | ✅ | ✅ |
| C2 | Card numbers are props | Only brand and last 4 are stored (R9). | ✅ | ✅ |
| C3 | Flash Credit is a ledger | Signed entries, derived balance, `BEGIN IMMEDIATE` (R10). | ✅ | ✅ |
| C4 | Server-authoritative pricing | No action accepts a price. Carts hold no prices. Prices are re-resolved at checkout. | ✅ | ✅ |
| C5 | Exact money | Exact two-decimal `*_usd` text columns. All math goes through `src/lib/money.ts` (big.js), with no floats (R4). | ✅ | ✅ |
| C6 | Secrets out of git | Nothing secret in 001. `.env.example` lists `DATABASE_PATH`. `data/` and `backups/` are gitignored. | ✅ | ✅ |
| W | Workflow gates | Prettier + ESLint inside verify (R21). Feature branch. `/speckit-analyze` before implement. | ✅ | ✅ |

**Result**: PASS (both pre-research and post-design), with one documented deviation in Complexity
Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-storefront/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/            # routes.md, actions.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
public/
└── media/
    ├── shirts/*.svg               # shirt art (placeholder patterns for the tutorial)
    └── placeholder.svg            # referenced by a `media` row, not hard-coded
data/                              # SQLite database (gitignored)
backups/                           # timestamped DB backups (gitignored)
drizzle/                           # generated SQL migrations (committed)
scripts/
├── migrate.ts                     # db:migrate (backs up first)
├── db-reset.ts                    # db:reset (backs up first, then migrates + seeds)
├── db-backup.ts / db-restore.ts   # db:backup, db:restore <file>
├── seed.ts                        # db:seed: demo catalog, tiers, settings, media (fixture only)
├── seed-demo.ts                   # db:seed-demo: demo shoppers
├── catalog-audit.ts               # catalog:audit: validation errors + seed-check warnings
└── generate-shirt-art.ts          # art:generate
src/
├── app/
│   ├── layout.tsx, globals.css
│   ├── page.tsx                   # /
│   ├── shirts/page.tsx            # /shirts
│   ├── shirts/[slug]/page.tsx     # /shirts/[slug] (active or retired)
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── account/page.tsx
│   ├── sign-in/page.tsx, sign-up/page.tsx
│   ├── not-found.tsx, error.tsx, global-error.tsx
│   └── teapot/route.ts            # HTTP 418
├── actions/                       # Server Actions: cart.ts, auth.ts, checkout.ts, flash-credit.ts
├── components/                    # ShirtImage, ShirtCard, ShirtBadge, PriceTag, ZoomViewer,
│                                  # ListingFilters, AddToCart, OrderSummary, SiteHeader, …
└── lib/
    ├── db/                        # schema.ts (Drizzle), client.ts, backup.ts
    ├── data/                      # data-access layer: shirts.ts, settings.ts, tiers.ts, media.ts
    ├── catalog/                   # validate.ts, audit.ts, tiers.ts, listing.ts
    ├── pricing/                   # msrp.ts, resolve.ts
    ├── media.ts                   # resolveMediaUrl(key, baseUrl)
    ├── money.ts
    ├── payments/faux-card.ts
    ├── auth/                      # password.ts, session.ts, safe-next.ts
    ├── cart/                      # cart.ts (get/create, merge, audit)
    ├── checkout/place-order.ts
    ├── flash-credit/ledger.ts
    └── copy.ts                    # brand-voice strings
tests/
├── unit/  integration/  e2e/  fixtures/  helpers/
```

**Structure Decision**: a single Next.js project at the repo root.
- `src/lib/` holds framework-free domain logic, which is unit-testable.
- `src/lib/data/` is the only code that queries catalog tables, so a future JSON API or admin UI
  reuses it.
- Server Actions in `src/actions/` are thin adapters, and pages in `src/app/` render.
- Product data exists only in the database. The repo holds only a seed fixture and the image files.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Simulated (Lantern) mobile LCP is 2.8 s against the 2.5 s budget (VII). Under applied throttling it's 2.2 s, within budget. | The catalog is read per request (R24) so owner edits in Drizzle Studio appear instantly. The first shirt image therefore streams in after the static shell instead of being part of it. | Caching the catalog (`"use cache"` with a short `cacheLife`, plus on-demand invalidation once the Admin Console exists) would put the image in the shell, at the cost of edits taking up to the cache lifetime to appear. That's the owner's call. Measured unthrottled LCP is 0.4–0.9 s. |

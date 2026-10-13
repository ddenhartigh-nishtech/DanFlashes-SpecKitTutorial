# Dan Flashes

> Complicated shirts. Complicated prices.

An e-commerce storefront for Dan Flashes, where every shirt is vibrant and the price goes up with the
complexity of its pattern. It's a parody built to learn spec-driven development with
[GitHub Spec Kit](https://github.com/github/spec-kit). There are no real payments: every card is
fake and every dollar is pretend.

**Stack**:
- Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4
- SQLite via Drizzle ORM, with exact-decimal money via big.js
- Vitest + Playwright

## Quick start

Requires Node 22+.

```bash
npm install
npm run db:reset        # creates data/danflashes.db and seeds the demo catalog
npm run db:seed-demo    # optional: demo@danflashes.local / password123 with $10,000 of Flash Credit
npm run dev             # http://localhost:3000
```

Test card: **4242 4242 4242 4242**, any future expiry (e.g. 12/29), any 3-digit CVC.

## Managing the store

All product data lives in SQLite, not in code. Until the Admin Console (ROADMAP 008) exists, edit it
with Drizzle Studio:

```bash
npm run db:studio       # browser-based editor for shirts, tiers, settings, media
npm run catalog:audit   # checks the catalog: errors exit 1, warnings exit 0
```

- **Complexity score** (`shirts.complexity`) is owner-only and never shown to shoppers. It sets
  the shirt's tier badge and its MSRP.
- **MSRP** = start price × 2^((score − anchor) / interval), rounded to the cent. The values live in
  `store_settings`.
- **Final price** is `shirts.final_price_usd` if you set one, otherwise the MSRP.
- **Tiers** (`complexity_tiers`) can be renamed, restyled, and re-ranged. The tier starting at 0 is
  BLAND.
- **Never delete a shirt.** Set `status` to `inactive`. Shirts that have been ordered can't be
  deleted.
- **Images** live in `public/media/` and are referenced by relative key. To move them to a CDN,
  change `store_settings.media_base_url`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run verify` | **The one-glance health check**: format, lint, type check, unit and integration tests (≥ 90% coverage), then e2e tests on a production build (desktop + phone) |
| `npm test` | Unit and integration tests only |
| `npm run test:e2e` | Playwright end-to-end tests (first time: `npx playwright install chromium`) |
| `npm run format` | Prettier |
| `npm run db:migrate` | Back up, then apply migrations |
| `npm run db:backup` / `db:restore -- <file>` | Timestamped backups in `backups/`; restoring makes a safety backup first |
| `npm run db:reset` | Back up, then rebuild and reseed the database |
| `npm run db:seed` / `db:seed-demo` | Demo catalog / demo shopper (both idempotent) |
| `npm run art:generate` | Regenerate the placeholder shirt art |

The e2e suite builds into `.next-e2e/` and uses `data/e2e.db`, so it can run while your own
`npm run dev` is running.

## How this repo is organized

| Path | What it is |
|---|---|
| `.specify/memory/constitution.md` | The project's governing principles. Every spec and plan is checked against it. |
| `specs/NNN-feature-name/` | One folder per feature: `spec.md` (what & why), `plan.md` (how), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md` |
| `ROADMAP.md` | Features after 001: brand pages, per diem, the urgency engine, Flash Mode, the admin console, and more |
| `src/lib/` | Framework-free domain logic (money, pricing, cart, checkout, ledger, auth). Fully tested. |
| `src/actions/` | Thin `"use server"` adapters over `src/lib/actions/` |
| `src/app/` | Pages. Database reads happen at request time inside `<Suspense>`. |
| `scripts/` | Database, seed, audit, and art utilities |
| `tests/` | `unit/`, `integration/` (temp SQLite per file), `e2e/` (Playwright) |

See [`specs/001-core-storefront/quickstart.md`](specs/001-core-storefront/quickstart.md) for the
full validation walkthrough and performance results.

## Spec-driven workflow

```text
/speckit-constitution  → once per project
/speckit-specify       → per feature: what & why, no tech
/speckit-clarify       → optional: de-risk ambiguity before planning
/speckit-plan          → tech stack, architecture, data model
/speckit-checklist     → optional: "unit tests for English"
/speckit-tasks         → ordered, dependency-aware task list
/speckit-analyze       → cross-artifact consistency check (required before implementing money features)
/speckit-implement     → build it
/speckit-converge      → repeat implement → converge until Converged
```

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
npm run db:reset        # creates data/danflashes.db: demo catalog + demo@danflashes.local / password123
                        # ($10,000 of Flash Credit and a $75.00 daily per diem).
                        # After pulling, use db:migrate instead: it keeps your data.
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
- **Revenue streams** are connected by shoppers on their account page and feed Flash Credit. A
  "Recurring top-off" pays on its own interval (for a demo, connect one that tops off every 1
  minute). "Just once" is applied immediately and is final. "Whenever I want" pays each time he hits
  Cash in. Payments that came due are credited whenever his money is shown, exactly once each.
- **Checkout splits the bill.** "Apply my Flash Credit" covers what it can. He confirms putting the
  rest on a card, and Remove puts the whole total back on the card.
- **Manipulation switches** (constitution IV). Each tactic is its own `store_settings` column: set it
  to `1` for on and `0` for off, then reload the page.

  | Column | Default | When on |
  |---|---|---|
  | `checkout_gate` | on | Guests can build a cart but must sign in to check out |
  | `bland_shaming` | on | BLAND shirts can't be in a cart at all. Add to Cart opens the endless "You sure about that?" loop, the store refuses bland adds and raises, sign-in merges leave bland lines behind, and lines already in a cart are pulled with a notice. |
  | `confirmshaming` | on | Decline buttons make him feel it: "Yes, I'd rather blend in", "Remove (and lose your edge)", "Sign out (go back to being normal)", "Disconnect (and settle for less)" |
  | `per_diem_drain` | on | A gauge in the corner counts his per diem down with every order, by any payment method, and throws a party at $0. Every order spends the per diem first, then the oldest stream money. Each stream shows what's left, and every stream an order empties is its own achievement on that order's confirmation ("You spent your kid's college fund on shirts."). While it's off, the gauge, the amounts left and the achievements are hidden, and orders placed then never earn one. |

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
| `npm run db:reset` | Back up, then rebuild and reseed the database (catalog and demo shopper) |
| `npm run db:seed` / `db:seed-demo` | Demo catalog / demo shopper (both idempotent) |
| `npm run art:generate` | Regenerate the placeholder shirt art |

The e2e suite builds into `.next-e2e/` and uses `data/e2e.db`, so it can run while your own
`npm run dev` is running.

### When a page 500s

Shoppers only ever see the 500 page. The **terminal running the server** explains what broke, with
the command that fixes it, in lines starting `[Dan Flashes]`. The browser's dev console also points
there. Usually it's one of these:
- **"…migrations behind the code…"**: you pulled a change that alters the database. Run
  `npm run db:migrate`, which keeps your data. A running dev server picks the change up on its own.
- **"No database…" or "Store settings are missing"**: run `npm run db:reset`.

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

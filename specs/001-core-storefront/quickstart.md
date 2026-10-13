# Quickstart: Core Storefront (001)

How to run the store and check that 001 works. For details, see [data-model.md](./data-model.md)
and [contracts/](./contracts/).

## Prerequisites

- Node 22+ and npm 10+
- Windows, macOS, or Linux. There are no external services and nothing is hosted.

## Setup

```bash
npm install
npm run db:reset          # backs up any existing DB, creates data/danflashes.db, migrates, seeds the demo catalog
npm run dev               # http://localhost:3000
```

## Managing data (until the Admin Console, ROADMAP 008)

```bash
npm run db:studio         # opens Drizzle Studio in the browser to edit shirts, tiers, settings, and media
npm run catalog:audit     # audits the catalog: errors exit 1, seed-check warnings exit 0
```

## Utility scripts

| Command | What it does |
|---|---|
| `npm run db:migrate` | **Backs up first**, then applies new migrations (structure changes) |
| `npm run db:backup` | Saves a timestamped copy to `backups/danflashes-YYYYMMDD-HHMMSS.db` |
| `npm run db:restore -- backups/<file>.db` | Backs up the current database, then restores the chosen copy |
| `npm run db:reset` | **Backs up first**, then a clean database: migrate + seed |
| `npm run db:seed` | Seeds the demo catalog, tiers, settings, and media (skips existing rows) |
| `npm run db:seed-demo` | Adds demo shoppers. `demo@danflashes.local` / `password123` has $10,000 in Flash Credit and one past order. |
| `npm run art:generate` | Regenerates the placeholder shirt art in `public/media/shirts/` |
| `npm run format` | Formats every file with Prettier |

## Automated checks: the one-glance health check

```bash
npx playwright install chromium   # first time only
npm run verify            # format:check → lint → typecheck → unit + integration (coverage) → e2e (desktop + phone)
```

`verify` MUST pass before merge (constitution VI).

## Manual validation scenarios

Test card: **4242 4242 4242 4242**, any future expiry, any 3-digit CVC. "Studio" means Drizzle
Studio (`npm run db:studio`).

| # | Scenario | Expected |
|---|---|---|
| 1 | Open `/` | Hype headline, the most complicated shirts featured, a link to the shirts listing. (US1-1) |
| 2 | Open `/shirts` | Every card shows a price and one badge (a tier or BLAND). **No complexity numbers anywhere.** Bland shirts are under $300. (US1-2/6) |
| 3 | Filter to the top two tiers, then sort by Most Complicated and then by price descending | Only those tiers are shown. With no owner prices, both sorts give the same order. (US1-3/4) |
| 4 | Repeat 1–3 in a phone-width window (≈390px) | Single-column grid, collapsed menu, no sideways scrolling. (FR-034) |
| 5 | Open any shirt, zoom to max (wheel or pinch), and pan | The badge is on the viewer and motifs stay crisp. Changing size never changes the price. (US2-1…3) |
| 6 | Click Add to Cart with no size picked | "Pick a size" message, and the cart is unchanged. (US2-4) |
| 7 | Open `/cart` with an empty cart | "You sure about that?", the most expensive shirt spotlighted, and a link to the top-tier listing. (US2-7) |
| 8 | As a guest, add 2 shirts, then go to `/checkout` | Redirected to sign-in with gate copy. (US3-1) |
| 9 | Sign up | Returned to checkout with both shirts. Shipping $0.00 and Tax $0.00 lines are shown. (US3-2/3) |
| 10 | Pay with the test card | Confirmation says "card ending 4242". The order appears in `/account`, and the Flash Credit balance is unchanged. (US3-4/6) |
| 11 | Pay with card number 4242 4242 4242 4241 | Refused (checksum), and no order is created. (US3-5) |
| 12 | In Studio, set a purchased shirt's `status` to `inactive`, then follow its link from `/account` | "Retired from the floor", with no price and no Add to Cart. The shirt is gone from `/shirts`. (US3-7) |
| 13 | In Studio, try to delete that purchased shirt | The database refuses (foreign key). (FR-008) |
| 14 | Put a shirt in the cart, set it to `inactive` in Studio, and reload `/cart` | The line is removed, with a notice naming it. (FR-016) |
| 15 | In `/account`, top up $1,000 | Balance $1,000.00, with one top-up entry. (US4-1/2) |
| 16 | Check out a cart over $1,000 with Flash Credit | Refused, offered a top-up or the card instead, and the balance is unchanged. (US4-4) |
| 17 | Check out a cart ≤ balance with Flash Credit | The balance drops by exactly the total, and a spend entry links to the order. (US4-3) |
| 18 | In Studio, set `store_settings.checkout_gate` to 0 and check out as a guest | Card checkout works for guests. Flash Credit is hidden. (FR-021) |
| 19 | In Studio, point a shirt image's media `key` at a missing file | The placeholder is shown. (FR-018) |
| 20 | Change `store_settings.media_base_url` to another host serving the same files | Every image loads from the new host, with no other edits. (FR-033) |
| 21 | Visit `/no-such-page` | Branded 404. (FR-035) |
| 22 | Visit `/teapot` | Branded page. DevTools shows status **418**. (FR-035) |
| 23 | Run `npm run db:backup`, change something, then `npm run db:restore -- backups/<that file>` | The change is gone, and a safety backup of the pre-restore state exists. (FR-036) |

## Performance results (T077, 2026-10-13)

Lighthouse 13.5, mobile form factor, against the production build (`next start`) on localhost.
"Applied" throttles the real browser (DevTools), while "simulated" is Lighthouse's default estimate
(Lantern).

| Page | Applied LCP | Simulated LCP | CLS (applied) | Perf score (simulated) | Accessibility |
|---|---|---|---|---|---|
| `/` | 2.2 s | 2.8 s | 0.006 | 93 | 96 |
| `/shirts` | 2.2 s | 2.8 s | 0.037 | 95 | 96 |
| `/shirts/dans-masterpiece` | 2.2 s | 2.8 s | 0 | 89 | 96 |

Budgets (constitution VII): LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.

- **CLS**: fixed. It was 0.161 on `/shirts` because the Bungee display font swapped in late and
  rewrapped the heading. The font now uses `display: "optional"`.
- **LCP**: within budget under applied throttling (2.2 s). The simulated estimate (2.8 s) exceeds it
  because the first shirt image streams in after the static shell: the catalog is read per request
  so owner edits appear immediately. This is logged in plan.md → Complexity Tracking, with the
  option of caching the catalog.
- **Measured (unthrottled) LCP on the dev machine**: 0.4–0.9 s.
- **Accessibility 96**: the remaining finding is contrast of paper text on hot pink (≈ 3.4:1) for
  some buttons and the "Complicated" badge. That is a brand-palette decision for the owner.
- **Total blocking time**: mostly React DOM's own startup on a 4× slowed CPU. No server-only
  library (big.js, zod, bcrypt, Drizzle) is in the client bundle.

## Walkthrough results (T080, 2026-10-13)

All 23 scenarios pass. Here is how each was verified:

| Scenarios | Verified by |
|---|---|
| 1–4, 21–22 | `tests/e2e/browse.spec.ts` (desktop + phone) |
| 5–7 | `tests/e2e/zoom-and-cart.spec.ts`. Zoom is tested through the ENHANCE/Reset buttons; wheel and pinch were checked by hand. |
| 8–11 | `tests/e2e/card-checkout.spec.ts` |
| 15–17 | `tests/e2e/flash-credit-checkout.spec.ts` |
| 13, 20, 23 | `tests/integration/data-catalog.test.ts` (FK refusal, media base URL), `tests/integration/backup.test.ts` |
| 12, 14, 18, 19 | A scripted walkthrough against a throwaway database, editing rows live as Drizzle Studio would. These aren't in the shared e2e suite because they mutate catalog state that parallel tests rely on. |

**Bug found and fixed in the walkthrough (scenario 19)**: a shirt image that 404'd didn't fall back
to the placeholder in production builds. The server-rendered `<img>` failed before hydration, so
React's `onError` never fired. `ShirtImage` now also checks `complete && naturalWidth === 0` on
mount.

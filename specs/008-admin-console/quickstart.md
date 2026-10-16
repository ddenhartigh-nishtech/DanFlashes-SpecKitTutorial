# Quickstart: Admin Console

How to prove 008 works end to end. The automated proof is `npm run verify`. These scenarios are
the hand-run walkthrough, and the source for the e2e specs in `tests/e2e/admin/`.

## Setup

```bash
npm run db:reset        # migrates (0011), seeds the catalog, the demo shopper and the demo owner
npm run dev             # http://localhost:3000
```

- The demo owner's sign-in is `DEMO_OWNER` in `scripts/seed-data.ts`.
- On an existing database, run `npm run db:migrate`, then `npm run admin:grant -- <your email>`.

## Scenarios

| # | Do | Expect (FR / SC) |
|---|---|---|
| 1 | As a guest, open `/admin`, `/admin/shirts` and `/admin/orders/1` | The store's ordinary 404 each time, with the loud header, and no hint of a console (FR-002, SC-003) |
| 2 | Sign in as the demo shopper and repeat 1 | The same 404. No "Back office" link in the header (FR-002, FR-004) |
| 3 | Sign in as the demo owner | "Back office" appears in the header. It opens `/admin` with a full page load (FR-004, R1) |
| 4 | Turn on Extreme Awesomeness in the store, then open the console | Nothing flashes or moves. No pipes, pop-ups, countdowns or scarcity. One poster. `document.getAnimations().length === 0` (FR-005, SC-011) |
| 5 | Reload any console page several times | A different poster each load, never the same twice in a row (FR-005a) |
| 6 | `/admin/shirts` | Every shirt, active and inactive, with score, tier, MSRP and final price. Sort and filter work (FR-006) |
| 7 | New shirt: score 30, no final price, no image | The live preview shows Very Complicated and the MSRP. It saves inactive. "Saved. That was a good decision, Dan." (FR-007, FR-008, FR-005b) |
| 8 | Attach a library image, make it active, open `/shirts/<slug>` | Live in the store at the MSRP, with the right badge (FR-011) |
| 9 | Set its score to 5 and the final price to 400 | Refused: BLAND must cost less than $300.00, and it would resolve to $400.00. Nothing changes (FR-009) |
| 10 | Deactivate it | One calm confirmation. It's gone from `/shirts`. Its own page says "Retired from the floor", with no Add to Cart (FR-010) |
| 11 | Score 999999 | Refused: too complicated to price (R7) |
| 12 | `/admin/settings`: flip Roach motel off, then remove a cart line in the store | No "Are you sure?" Flip it back on (FR-012, FR-013, SC-005) |
| 13 | Preview a start price of 500.00 | Each shirt's MSRP now and after. Saving is refused, naming every BLAND shirt at or above $500.00, if any (FR-014, FR-015) |
| 14 | Presets: add 2500 | The account page's top-up offers $2,500.00 (FR-016) |
| 15 | `/admin/pricing` after pricing a 40-score shirt below a 20-score one | The pair is listed with the gap and edit links. Overrides show dollars and percent. Audit problems are listed (FR-018–FR-021, SC-006) |
| 16 | `/admin/media`: upload a 2,400×2,400 PNG with alt text, attach it as the main image, zoom on the shirt page | It appears, and the zoom works (FR-023, FR-024, FR-026) |
| 17 | Upload a 600×600 PNG, a `.txt` renamed `.png`, and an SVG with `<script>` | Each is refused with its reason. Nothing is saved (FR-023) |
| 18 | Remove an image a shirt uses, then the placeholder | Both refused. An unused upload removes cleanly (FR-025) |
| 19 | `/admin/tiers`: move Seriously Complicated from 45 to 50 | The preview lists the shirts that change tier. It saves, and the badges follow (FR-027, FR-028) |
| 20 | Try to rename BLAND, move it from 0, or remove it | Refused. Its tagline and colors still save (FR-029) |
| 21 | `/admin/add-ons`: edit a pitch, retire one, move one up | Checkout follows. A past order still shows what was paid (FR-031) |
| 22 | `/admin/customers`: search "demo", open Demo Dan | Orders, ledger, streams with what's left, drain achievements (FR-032, FR-033) |
| 23 | Grant $500.00, then double-click Grant on a fresh form | The balance rises by exactly $500.00 per form, and a double submit records once. The shopper's history shows "A gift from Dan. He believes in you." (FR-036, SC-010) |
| 24 | As that shopper, check out using Flash Credit | The grant spends like any credit (FR-036) |
| 25 | `/admin/orders/<id>` | Lines with the score and MSRP at purchase, add-ons, Flash Credit, the card's brand and last four only, drains (FR-034, FR-035) |
| 26 | Run `npm run catalog:audit` after all of the above | 0 errors (SC-004) |
| 27 | Every console page at 360px wide | No horizontal scroll (FR-037, SC-008) |
| 28 | `npm run admin:revoke -- <owner email>`, then reload the console | The 404, even mid-session (edge case) |

## Automated

```bash
npm run verify   # format, lint, types, unit + integration (≥ 90% src/lib), e2e (shopper, then console)
```

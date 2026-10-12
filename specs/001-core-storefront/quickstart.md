# Quickstart: Core Storefront (001)

How to run the store and check that 001 works. For details, see [data-model.md](./data-model.md)
and [contracts/](./contracts/).

## Prerequisites

- Node 22+ and npm 10+
- Windows, macOS, or Linux. There are no external services.

## Setup

```bash
npm install
npm run db:migrate        # creates data/danflashes.db
npm run catalog:check     # validates catalog/ + config/, prints complexity-order warnings
npm run dev               # http://localhost:3000
```

## Automated checks

```bash
npm test                  # Vitest: unit + integration (money paths, ledger, cart merge)
npx playwright install chromium   # first time only
npm run test:e2e          # Playwright: card checkout + Flash Credit checkout
```

All of them must pass before merge (constitution, Development Workflow).

## Manual validation scenarios

Test card: **4242 4242 4242 4242**, any future expiry, any 3-digit CVC.

| # | Scenario | Expected |
|---|---|---|
| 1 | Open `/` | Hype headline, the most complicated shirts featured, a link to the shirts listing. (US1-1) |
| 2 | Open `/shirts`, sort by complexity descending, then by price descending | Every card shows score + price. With no owner prices in the seed, both sorts give the same order. Bland shirts are badged and under $300. (US1-2…6) |
| 3 | Set the complexity filter to 30–50 | Only shirts scored 30–50 are shown. (US1-3) |
| 4 | Open any shirt, zoom to max, and pan | Motifs stay crisp. Changing size never changes the price. (US2-1…3) |
| 5 | Click Add to Cart with no size picked | "Pick a size" message, and the cart is unchanged. (US2-4) |
| 6 | As a guest, add 2 shirts, then go to `/checkout` | Redirected to sign-in with gate copy. (US3-1) |
| 7 | Sign up | Returned to checkout with both shirts intact. (US3-2) |
| 8 | Pay with the test card | Confirmation says "card ending 4242". The order appears in `/account`. The Flash Credit balance is unchanged. (US3-3, US3-5) |
| 9 | Pay with card number 4242 4242 4242 4241 | Refused (checksum), and no order is created. (US3-4) |
| 10 | In `/account`, top up $1,000 | Balance $1,000.00, with one top-up entry. (US4-1/2) |
| 11 | Check out a cart over $1,000 with Flash Credit | Refused, offered a top-up or the card instead, and the balance is unchanged. (US4-4) |
| 12 | Check out a cart ≤ balance with Flash Credit | The balance drops by exactly the total, and a spend entry links to the order. (US4-3) |
| 13 | Set `finalPrice` below a lower-scored shirt's price, then run `npm run catalog:check` | A warning names the shirt, and the price still applies. (FR-006) |
| 14 | Set `tactics.checkoutGate` to `false`, restart, and check out as a guest | Card checkout works for guests. Flash Credit is hidden. (FR-017) |

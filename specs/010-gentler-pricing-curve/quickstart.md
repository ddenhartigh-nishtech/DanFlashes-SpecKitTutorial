# Quickstart: Gentler Pricing Curve

How to prove 010 works end to end. The automated proof is `npm run verify`. These scenarios are the
hand-run walkthrough. The prices are at the default tuning ($50.00 + $25.00 a point).

## Setup

```bash
npm run db:migrate      # 0014 on an existing database (it backs up first), or: npm run db:reset
npm run dev             # http://localhost:3000
```

## Scenarios

| # | Do | Expect (FR / SC) |
|---|---|---|
| 1 | Before migrating, note an order's total in order history. Then migrate | The order shows exactly the same lines and total (FR-008, SC-002) |
| 2 | Open `/shirts` | Beige Regret $100.00, Geo Riot $350.00, Fractal Fury $1,350.00, Dan's Masterpiece $3,300.00 (FR-001, SC-001) |
| 3 | Open Hawaiian Tax Return and the three shirts Dan generated | Each at its MSRP: $600.00 for Hawaiian (score 22), and $25 a point plus $50 for the others (FR-007) |
| 4 | Owner: `/admin/shirts` | No shirt shows "Dan's" as its price (FR-007, SC-001) |
| 5 | Put a shirt in the cart before migrating, then migrate and open the cart | The new price (FR-009) |
| 6 | Start a checkout, retune in Settings in another tab, then place the order | Refused, with the new total shown (FR-009) |
| 7 | Step the dial from 0 to 101 | Prices never go down. Step 100 is $256,275.00. Step 101 says "That's too complicated to price, even for Dan." and can't be bought (FR-011, SC-003) |
| 8 | Open a dial link made before the upgrade, and the shopper-made shirt | The same shirts and art, at their new prices (FR-012) |
| 9 | Owner: generator at 10,249, then 10,250 | 10,249 previews at $256,275.00. 10,250 is refused with the dial's line (FR-011) |
| 10 | Owner: Settings → MSRP. Type $40.00 a point | Every active shirt's MSRP now and after. "A real shirt starts at $450.00 (Complicated, score 10)" (FR-013, SC-005) |
| 11 | Save it, then open `/shirts` | Dan's Masterpiece is $5,250.00. Then put it back to $25.00 (FR-003) |
| 12 | Save $0.00, then -5, then "lots" | Each refused with a message that stays. Nothing changes (FR-013) |
| 13 | Owner: `/admin/pricing` | The price axis is linear, the MSRP line is straight, and every shirt sits on it. No inversions (FR-014, SC-006) |
| 14 | Owner: the shirt editor, score 1000000 | The preview shows $25,000,050.00 (FR-002, FR-015) |
| 15 | Owner: price a BLAND shirt at $300.00 | Refused: "BLAND shirts must cost less than $300.00 …" (FR-006) |
| 16 | At 360px, the dial at step 100 and a $25,000,050.00 shirt | The price fits, with no sideways scroll (SC-003) |
| 17 | `npm run catalog:audit`, after migrating and after `db:reset` | 0 errors (FR-016, SC-007) |

## Automated

```bash
npm run verify
```

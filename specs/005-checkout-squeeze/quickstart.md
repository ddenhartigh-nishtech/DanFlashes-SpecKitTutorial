# Quickstart: Checkout Squeeze (005)

## Setup

Same as 001–004. After pulling this branch:

```bash
npm run db:migrate      # backs up, then applies 0008 (add_ons, order_add_ons, two switches)
npm run db:seed         # adds the four starting add-ons (skips anything already there)
npm run dev
```

Or start fresh with `npm run db:reset`. "Studio" means Drizzle Studio (`npm run db:studio`).

## Manual validation scenarios

| # | Scenario | Expected |
|---|---|---|
| 1 | Add Geo Riot ($344.61) and open checkout | An Add-ons section with all four ticked, each with its pitch and price. The total is $344.61 + $49.99 + $89.99 + $29.99 + $19.99 = $534.57. (US1-1, SC-003) |
| 2 | Untick Complexity Insurance, then tick it again | The total drops by exactly $89.99, then goes back up. While it's unticked, "No thanks, I'll take my chances with complexity." shows under it. (US1-2, US1-3) |
| 3 | Untick two add-ons, then reload checkout | Every add-on is ticked again. (US1-6) |
| 4 | Untick Pattern Protection Plan™ and pay by card | Charged $484.58. The confirmation lists Complexity Insurance, Extended Vibrancy Warranty and Priority Compliments Package with their prices, and the account's purchase history shows the same rows. (US1-4, FR-007, SC-001) |
| 5 | With $100.00 of Flash Credit, check out with everything ticked and apply credit | The split is $100.00 of Flash Credit and $434.57 on the card: the add-ons are in the total. Confirm and pay. (US1-4, FR-008) |
| 6 | Open checkout; in Studio set one add-on's `price_usd` to 59.99 (or `active = 0`); place the order | Refused with the new total. Nothing is charged. (US1-5, FR-006) |
| 7 | In Studio, rename an add-on that's on a past order | The old order still shows the old name and price. (FR-007) |
| 8 | On the cart, press Remove on a line, then Keep | "Are you sure?" appears; Keep closes it, and the line is still there. (US2-1, US2-4) |
| 9 | Remove → yes → Keep | "Are you sure sure?" appears; Keep, and the line is still there. (US2-2, US2-4) |
| 10 | Remove → yes → yes | The line is gone. With confirmshaming on, the yes buttons read "Yes, remove it (and lose your edge)". (US2-3, US2-5) |
| 11 | Set a line to 3; then change it to 2 and press Update | Raising to 3 asks nothing (and finds another one, 004). Lowering to 2 asks both questions, and only the second yes lowers it. (US2-7, FR-011) |
| 12 | Add a shirt from its page | One click, with no question. (US2-6, SC-005) |
| 13 | On a 360px phone, open the questions | They fit, and Keep is always reachable. (Edge Cases) |
| 14 | In Studio set `pre_checked_add_ons = 0`, then `roach_motel = 0`, and repeat 1 and 8 | No add-ons, and the total is $344.61. Remove removes at once. Set both back to 1. (US1-7, US2-8, SC-006) |

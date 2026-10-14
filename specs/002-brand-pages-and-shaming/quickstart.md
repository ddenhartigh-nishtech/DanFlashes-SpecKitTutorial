# Quickstart: Brand Pages & Bland-Shirt Shaming (002)

## Setup

Same as 001. After pulling this branch, apply the new migration:

```bash
npm run db:migrate      # backs up, then adds store_settings.bland_shaming / confirmshaming (both on)
npm run dev
```

## Manual validation scenarios

"Studio" means Drizzle Studio (`npm run db:studio`).

| # | Scenario | Expected |
|---|---|---|
| 1 | Open any page and use the header (desktop and phone menu) | An "About" link opens `/about`. (FR-001) |
| 2 | Read `/about` | Dan's self-important bio, then Exhibit A: Dan's Masterpiece with its badge and price, linked. (US3) |
| 3 | Open `/shirts/beige-regret`, pick a size, then Add to cart | "You sure about that?" dialog with a disparaging line and a recommended shirt. The cart is unchanged. (US1-1) |
| 4 | Click "Yes, I'd rather blend in" 20 times | 20 more rounds: lines rotate without repeats, the recommendation climbs to the top and stays, and nothing is added. (US1-2, SC-002/003) |
| 5 | Press Escape; then reopen the dialog and click "Fine. I'll look at real shirts" | Escape closes it and you stay on the page. Relenting lands you on `/shirts`. The cart is unchanged either way. (US1-4) |
| 6 | Take the recommendation | You land on that shirt's page and the cart is unchanged. (US1-3) |
| 7 | Open a non-bland shirt and Add to cart | Added immediately, as in 001. (US1-6) |
| 8 | Cart: check the Remove label. Account: check the Sign out label. | "Remove (and lose your edge)" and "Sign out (go back to being normal)". (US2-1) |
| 9 | In Studio, set `store_settings.confirmshaming = 0`, then reload | Neutral labels ("Remove", "Sign out", "Yes, I'm sure"). (US2-2) |
| 10 | In Studio, set `store_settings.bland_shaming = 0`, then add Beige Regret | Added normally. (US1-7) |
| 11 | With shaming back on, reload the cart that holds that Beige Regret line | The line is pulled out, with a brand-voice notice listing it. Checkout can't include it. (US1-8, FR-010) |

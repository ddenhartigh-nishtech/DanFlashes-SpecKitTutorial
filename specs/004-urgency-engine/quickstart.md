# Quickstart: Urgency Engine (004)

## Setup

Same as 001–003. After pulling this branch:

```bash
npm run db:migrate      # backs up, then applies 0007 (the three urgency switches, all on)
npm run dev
```

"Studio" means Drizzle Studio (`npm run db:studio`). Flip a switch in `store_settings` and reload.

## Manual validation scenarios

| # | Scenario | Expected |
|---|---|---|
| 1 | Open `/shirts` | Every non-bland card says "Only 1 left!". Beige Regret and the other bland shirts say "Plenty left. Nobody wants these." (US1-2, US1-6) |
| 2 | Open Geo Riot | Beside the price: "Only 1 left!" and "This price won't last." with a `MM:SS.mmm` countdown ticking down in milliseconds. The price is the same as on the listing. (US1-1, US2-1, FR-004) |
| 3 | Pick a size and Add to cart | "It's in the cart. Excellent decision. Oh wait, we found another one!" The page still says "Only 1 left!". (US1-4) |
| 4 | Open the cart; raise Geo Riot to 3, then lower it to 2 | The line says "Only 1 left!". Raising says "Oh wait, we found another one!"; lowering says nothing. The quantity is whatever he set. (US1-3, US1-4) |
| 5 | Look at the cart's hold countdown, then open Geo Riot again | "Your shirts are reserved for" shows the same time as the deal clock, and moving between pages doesn't restart it. (US2-2, US2-3) |
| 6 | Wait for the clock to reach 00:00.000, or set `localStorage['df-countdown-anchor']` to now minus 595000 and reload | It quietly jumps back to 10:00.000. There's no message, and the cart and prices are untouched. (US2-4, SC-003) |
| 7 | Open Geo Riot and read below Add to Cart | "N people are looking at this shirt right now" (3–40) and "[Name] from [Department] just bought this pattern." Reloading a minute later moves the number a little. (US3-1, US3-2) |
| 8 | Open Beige Regret | "0 people are looking at this shirt right now", and no buyer. (US3-5) |
| 9 | Stay on any page for up to 40 seconds (desktop) | A pop-up slides in at the bottom-right: "[Name] from [Department] just bought [shirt]." It slides away after about 6 s, and another follows 20–40 s later. Click one's (x): it closes at once. (US3-3, US3-4) |
| 10 | Same on a 360px phone | The pop-up drops in just under the header, full width. The header and the bottom-left drain corner stay clear, and there's no sideways scroll. (FR-006, FR-015) |
| 11 | Check out and place the order, then open Geo Riot and `/shirts` | Totals and the payment are exactly what they'd be with every switch off, and nothing blocked or delayed it. Geo Riot now says "Just kidding, we actually found another one! One more left!" on its page and its card. (FR-003, FR-008, SC-002, US1-5) |
| 12 | In Studio set `fake_scarcity = 0`, reload `/shirts`, Geo Riot and the cart, and add another | No stock lines anywhere, and the add says only "It's in the cart. Excellent decision." (US1-7, FR-002) |
| 13 | Set `countdown_timers = 0` | No deal clock and no hold. (US2-5) |
| 14 | Set `social_proof = 0` | No "looking", no buyer, and no pop-ups on any page. Set all three back to 1. (US3-7, SC-007) |

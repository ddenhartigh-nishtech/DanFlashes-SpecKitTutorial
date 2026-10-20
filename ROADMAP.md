# Dan Flashes Roadmap

Each row becomes its own `/speckit-specify` run, with its own `specs/NNN-*/` folder and branch. The
order follows dependencies: later features build on the data model that 001 lays down (catalog,
pricing, accounts, orders, Flash Credit).

| # | Feature | What's in it | Depends on |
|---|---------|--------------|------------|
| **001** | **Core Storefront** *(foundation)* | Home page, listing with complexity/price filter, detail page (zoom/enhance, sizes S–XXL, add to cart), guest cart, accounts and the checkout gate, faux card checkout, Flash Credit (top-up and spend), purchase history, catalog in SQLite (exponential MSRP plus owner final price, tier badges), seed catalog with bland shirts and a T.C. Tugger shirt | — |
| 002 | Brand Pages & Bland-Shirt Shaming *(done, PR #2)* | Egocentric About Us page for Dan Flashes. "You sure about that?" confirm loop on bland shirts. Disparaging copy aimed at basic dressers. Confirmshaming on declines. | 001 |
| 003 | Revenue Streams & Per Diem Drain *(done, PR #3)* | Connect revenue streams (per diem, etc.) that auto-fund Flash Credit. Per diem meter that celebrates hitting $0. Split checkout (Flash Credit plus a card). Every stream an order empties is its own achievement. | 001 (accounts, Flash Credit) |
| 004 | Urgency Engine *(done, PR #4)* | Fake scarcity ("Only 1 left!", and "we found another one!"), a shared millisecond countdown that quietly resets, fabricated social proof ("Gary from Accounts Payable just bought this") with dismissible pop-ups | 001 |
| 005 | Checkout Squeeze *(done, PR #5)* | Pre-checked add-ons (Pattern Protection Plan™, Complexity Insurance, and friends), each its own order line; a roach-motel cart that asks "Are you sure?" and then "Are you sure sure?" before any decrease | 001 |
| 006 | Flash Mode & Pipes Background *(done, PR #6)* | One shopper toggle, "Extreme Awesomeness" (the most exciting button on the site, remembered per browser), turns on a strobe that spares the sale and the classic Windows "3D Pipes" screensaver behind every page. Each has its own owner switch. | 001 |
| 007 | Pattern Generator *(done, PR #9)* | Procedurally generated shirts with complexity derived from the generator. Answers "how complicated can it get?" literally: a store dial that climbs until the MSRP can't price it, one-of-a-kind shirts made to order for their maker (with the Uniquity Surcharge™), and a generator plus mass production in Dan's Office. | 001 (catalog, pricing) |
| 008 | Admin Console *(done, PR #8)* | Dan's Office: a perfectly tranquil back office at `/admin` for admins only (an account flag set from the command line). Shirts, media uploads, tiers, add-ons, every switch and the MSRP dials, customers and orders, plus a pricing-vs-complexity analysis. One money action: Flash Credit grants. Motivational posters on every page. Replaces Drizzle Studio. | 001 (data layer) |
| 009 | Nosy Sign-Up *(done, PR #7)* | Sign-up demands an SSN, blood type, medications, mother's maiden name and more, all marked "Required" (one long scroll; blanks get one line from Dan, then he's in; `**` marks what's actually required). The fields are props: unnamed, outside the form, never submitted, stored, or logged (constitution). Own on/off switch. | 001 (sign-up page) |
| 010 | Gentler Pricing Curve | Swap the exponential MSRP for a near-linear one, so a score of 9,000 is expensive rather than a 274-digit number: a start price plus so much per point, still owner-tunable in Settings, monotonic, and in one place. Retro the existing prices: every MSRP recomputes from its score on the spot. Review the owner's own final prices against the new curve (the console's pricing analysis already lists how far each sits from the MSRP). Past orders keep what was paid. Needs a constitution II amendment (it says "exponential"; MAJOR). It also redefines where the dial's "too complicated to price" step sits, since a linear MSRP never runs out of numbers. | 001 (pricing), 007 (the dial's top), 008 (Settings) |

## Why 001 is so big

Most of the data model lands in 001: Shirt, Media, Complexity Tier, Store Settings, Account, Cart, Order, and Flash
Credit Entry. Features 002–007 mostly add behavior on top of it. 001 is still built incrementally,
because its user stories are ordered P1 → P4 and each one can be demoed on its own:

1. **P1 Browse & filter.** The joke works at this point (MVP).
2. **P2 Zoom & add to cart.**
3. **P3 Checkout gate + account + faux card + order history.**
4. **P4 Flash Credit.**

Features 002–007 can be specced in any order once 001 lands. Per the constitution, every
manipulation tactic and gimmick ships with an on/off switch.

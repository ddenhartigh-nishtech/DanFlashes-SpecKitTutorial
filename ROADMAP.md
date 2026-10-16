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
| 007 | Pattern Generator | Procedurally generated shirts with complexity derived from the generator. Answers "how complicated can it get?" literally. | 001 (catalog, pricing) |
| **008** | **Admin Console** *(in progress, branch `008-admin-console`)* | Non-technical admin pages for shirts, media uploads, tiers, store settings, customers, and orders. Pricing vs. complexity analysis (e.g., spotting shirts priced against the complexity order). Replaces Drizzle Studio as the owner's tool. | 001 (data layer) |
| 009 | Nosy Sign-Up *(done, PR #7)* | Sign-up demands an SSN, blood type, medications, mother's maiden name and more, all marked "Required" (one long scroll; blanks get one line from Dan, then he's in; `**` marks what's actually required). The fields are props: unnamed, outside the form, never submitted, stored, or logged (constitution). Own on/off switch. | 001 (sign-up page) |

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

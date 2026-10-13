# Dan Flashes Roadmap

Each row becomes its own `/speckit-specify` run, with its own `specs/NNN-*/` folder and branch. The
order follows dependencies: later features build on the data model that 001 lays down (catalog,
pricing, accounts, orders, Flash Credit).

| # | Feature | What's in it | Depends on |
|---|---------|--------------|------------|
| **001** | **Core Storefront** *(foundation)* | Home page, listing with complexity/price filter, detail page (zoom/enhance, sizes S–XXL, add to cart), guest cart, accounts and the checkout gate, faux card checkout, Flash Credit (top-up and spend), purchase history, catalog in SQLite (exponential MSRP plus owner final price, tier badges), seed catalog with bland shirts and a T.C. Tugger shirt | — |
| 002 | Brand Pages & Bland-Shirt Shaming | Egocentric About Us page for Dan Flashes. "You sure about that?" confirm loop on bland shirts. Disparaging copy aimed at basic dressers. Confirmshaming on declines. | 001 |
| 003 | Revenue Streams & Per Diem Drain | Connect revenue streams (per diem, etc.) that auto-fund Flash Credit. Per diem meter that celebrates hitting $0. | 001 (accounts, Flash Credit) |
| 004 | Urgency Engine | Fake scarcity ("Only 1 left!"), countdown timers that reset, fabricated social proof ("Gary from Accounts Payable just bought this") | 001 |
| 005 | Checkout Squeeze | Pre-checked add-ons (Pattern Protection Plan™, Complexity Insurance), roach-motel cart | 001 |
| 006 | Flash Mode | Strobe/flash toggle: the most exciting button on the site | 001 |
| 007 | Pattern Generator | Procedurally generated shirts with complexity derived from the generator. Answers "how complicated can it get?" literally. | 001 (catalog, pricing) |
| 008 | Admin Console | Non-technical admin pages for shirts, media uploads, tiers, store settings, customers, and orders. Shows the pricing outlier alarm. Replaces Drizzle Studio as the owner's tool. | 001 (data layer) |
| 009 | Nosy Sign-Up | Sign-up demands an SSN, blood type, medications, mother's maiden name, and more, all marked "required." The fields are props: never submitted, stored, or logged (constitution). They have an on/off switch. Small, and a good first feature after 001. | 001 (sign-up page) |

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

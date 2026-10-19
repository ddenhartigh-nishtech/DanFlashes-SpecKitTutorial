# Quickstart: Pattern Generator

How to prove 007 works end to end. The automated proof is `npm run verify`. These scenarios are the
hand-run walkthrough, and the source for `tests/e2e/dial.spec.ts` and
`tests/e2e/admin/generator.spec.ts`.

## Setup

```bash
npm run db:migrate      # 0012 (an existing database), or: npm run db:reset
npm run dev             # http://localhost:3000
```

## Scenarios

| # | Do | Expect (FR / SC) |
|---|---|---|
| 1 | Open `/shirts`, then `/` | Each has a "How complicated can it get?" link to `/how-complicated` (FR-009) |
| 2 | Step the dial from 0 to 100 | The pattern gets busier, the badge climbs through every tier, and the price never goes down (FR-004, SC-002) |
| 3 | Look at the page source, the slider and the URL at a few steps | No complexity score anywhere. The URL is `?r=<letters>` (FR-008, SC-003) |
| 4 | Step 0 | A muted, BLAND shirt, disparaged in Dan's voice (FR-005, FR-012) |
| 5 | Shuffle, then switch to button-down | A new pattern at the same level, then the other style (FR-010) |
| 6 | Copy the URL into a new browser | The exact same shirt: art, badge, price (FR-011, SC-001) |
| 7 | Step 101 | "That's too complicated to price, even for Dan." Make it mine is disabled (FR-007) |
| 8 | Step 100, and time the preview | It draws in under 2 s, and the art is under 2 MB (SC-005) |
| 9 | Make it mine at a Dangerously Complicated step | He lands on the shirt's own page: a name in Dan's voice, the art, the badge, the price (FR-014) |
| 10 | Back to the same setting, Make it mine again | The same shirt page (FR-015) |
| 11 | Pick XL, add it, check out by card. Repeat with Flash Credit. | Orders placed. Order history shows the art (FR-016) |
| 12 | Open `/shirts` and the home page, and wait for a pop-up | The made shirt appears in none of them (FR-018, SC-008) |
| 13 | Make the BLAND step his and add it, with bland shaming on | The "You sure about that?" loop. It never reaches the cart (FR-017) |
| 14 | With Extreme Awesomeness on, at 360px | The price, badge and button stay steady. No sideways scroll (FR-013, SC-007) |
| 15 | Owner: `/admin/shirts/generate`, score 48, polo; Shuffle; Save | It's a resting shirt with the counted score, tier and MSRP, and art in the library (FR-019, FR-020) |
| 16 | Owner: `/admin/shirts?origin=dial` | The shopper-made shirts, marked (FR-021) |
| 17 | Owner: list a shopper-made shirt, then check `/shirts` | It's listed. Unlist it, and it's gone again (FR-018) |
| 18 | Owner: change a generated shirt's score | It reprices, and the art is unchanged (FR-003) |
| 19 | Owner: turn the pattern generator off | `/how-complicated` is the store's 404 and the links are gone. Made shirts still open. `/admin/shirts/generate` still works (FR-023) |
| 20 | `npm run catalog:audit` | 0 errors (SC-006) |

## Automated

```bash
npm run verify
```

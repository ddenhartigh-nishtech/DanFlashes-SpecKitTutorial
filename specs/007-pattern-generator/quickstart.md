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

## Results (2026-10-19)

Scripted on a scratch database (`DATABASE_PATH=data/qs007.db`), beside the e2e suite.

- **Strict Mode (T027)**: `next dev`, driving every new client component. The dial: steps 0, 30,
  60, 100, 101, 60, then Shuffle, Button-down and Make it mine. The generator: score 48, Shuffle and
  Save. The listed control: List, then Unlist. There were no browser console errors or warnings.
- **Scenario 18**: a generated shirt re-scored from 48 to 60 went from $4,178.64 to $9,600.00 in
  the store, and its picture was the same file.
- **Scenarios 16–17**: the made shirt was under `?origin=dial`, marked "Made by a shopper". List put
  it in `/shirts`, and Unlist took it out.
- **Scenario 19**: with the switch off, `/how-complicated` was the store's 404, with the store's own
  tab title. Its art was a 404, and the links on `/` and `/shirts` were gone. The made shirt's page
  was a 200. `/admin/shirts/generate?score=48` still drew its preview, and its art was a 404 for a
  guest.
- **Scenario 20 (SC-006)**: `npm run catalog:audit` reported 0 errors and 0 warnings.
- **Lighthouse (T028)**: Lighthouse 13.5.0 on `/how-complicated` (the default step 20), mobile,
  applied throttling, on a production build. Budgets: LCP ≤ 2.5 s, CLS ≤ 0.1.

  | Runs | LCP | CLS | TBT |
  |---|---|---|---|
  | 3 | 2.2 s, 2.2 s, 2.2 s | 0.032 each | 240–300 ms |

- **Approximations (analysis A1)**: SC-004 (under 2 minutes) and SC-005 (a mid-range phone) aren't
  measured with people or real devices.
  - **SC-004**: e2e signs up, makes the shirt and buys it by card in 20–38 s (the US2 journey,
    over two `npm run verify` runs on desktop and phone).
  - **SC-005**: e2e times the step-100 preview at under 2 s, on phone emulation (Pixel 7) and
    desktop.
- **Found while scripting**: the dial page's title came from static metadata, so the 404 showed
  "How complicated can it get?" in the tab. The title now renders inside the dial, behind the
  switch.

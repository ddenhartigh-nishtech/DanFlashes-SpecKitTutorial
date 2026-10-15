# Implementation Plan: Urgency Engine

**Branch**: `004-urgency-engine` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-urgency-engine/spec.md`

## Summary

Three manipulation tactics, each behind its own new switch in `store_settings` (migration 0007, all on
by default). None of them touches a price, a total, or what can be bought.

1. **Fake scarcity.** "Only 1 left!" appears on every shirt card, beside the price on the detail
   page, and on each cart line. Bland shirts get "Plenty left. Nobody wants these." instead.
   - Every add, and every quantity raise in the cart, adds "Oh wait, we found another one!" to the
     action's confirmation.
   - It's pure copy. There's no inventory (R2, R3).
2. **Countdown timers.** One shared 10-minute clock per browser, in minutes, seconds and milliseconds.
   - It shows as a deal clock beside the price ("This price won't last.") and as a cart hold on the
     cart and checkout ("Your shirts are reserved for").
   - It's computed from one saved anchor time, so it never expires. It restarts by itself, and every
     tab and page agrees (R4).
3. **Fabricated social proof.**
   - **The detail page** shows a slowly drifting "N people are looking at this shirt right now" and a
     fake coworker who "just bought this pattern". Both are worked out on the server from the shirt
     and the time (R5).
   - **Pop-ups**: every page gets "Gary from Accounts Payable just bought Fractal Fury" every 20–40
     s. They're bottom-right on wider screens and drop in under the header on phones, and each has an
     (x) (R6).

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19)

**Primary Dependencies**: unchanged; no new packages. The countdown uses `requestAnimationFrame`, and
the client state is `localStorage`/`sessionStorage` timestamps.

**Storage**: SQLite. One migration (`0007`) adds three boolean columns to `store_settings`. There are
no new tables. In the browser there's a countdown anchor (`localStorage`) and the next pop-up's due
time (`sessionStorage`): timestamps only, never product data. See [data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration, with an injected `now`) and Playwright (e2e, desktop and
phone, production build). `npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Performance Goals**: constitution VII unchanged: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (mobile p75).
The millisecond clock writes text directly each frame, without React renders.

**Constraints**:
- No tactic changes a price, a total or the cart, or blocks a purchase (FR-003).
- No fake activity ever reads real orders or shoppers (FR-016).
- Nothing floating covers the header or the bottom-left drain corner (FR-006).
- e2e never toggles switches in the shared database (002 R7).

All Technical Context items are resolved. See [research.md](./research.md) (R1–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 004 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | Every line, the fake cast included, lives in `copy.urgency`, in voice. The joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | No pricing change. Urgency copy never shows another price or a score (FR-004). The lines render beside the real `PriceTag`, never instead of it. | ✅ | ✅ |
| III | Relentlessly Vibrant | Bland shirts get the inverted copy (Q3), which leans on the BLAND tier as defined. | ✅ | ✅ |
| IV | Shamelessly Manipulative | This is the constitution's own list: fake scarcity, resetting countdowns, fabricated social proof. Each has its own named switch, on by default. | ✅ | ✅ |
| V | Maximum Visual Assault | Loud tokens, responsive from 360px. "The sale still closes": the lines never replace or restyle the price, the badge or Add to Cart. On phones a pop-up may briefly overlay the page (see Complexity Tracking). | ✅ | ✅ |
| VI | Fully Tested | Cart actions change ("found another one"), so they're test-first. Every pure function in `src/lib/urgency/` has unit tests, and `src/lib` stays ≥ 90%. Each story has an e2e journey. | ✅ | ✅ |
| VII | Fast | The lines are server-rendered, the countdown keeps a fixed width, and the pop-ups are overlays, so there's no layout shift. The clock runs on rAF with no React renders, so INP is unaffected. Lighthouse is verified in polish. | ✅ | ✅ |
| VIII | Simple Code | No packages, no server timers, no polling. There are four small pure modules and three small client components. | ✅ | ✅ |
| C | Commerce constraints | **Server-authoritative pricing** is untouched: checkout still re-resolves every price, and the urgency inputs never reach `placeOrder`. **Fake money**, the **ledger**, and **exact money** are unaffected. **Nosy fields**: none. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → **analyze** (mandatory: this touches the cart actions) → implement → converge; merge by PR. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). See Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-urgency-engine/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001–003 routes and actions
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001–003 layout)

```text
drizzle/0007_urgency_switches.sql     # new: fake_scarcity, countdown_timers, social_proof
scripts/seed-data.ts                  # settings defaults gain the three switches
src/
├── app/
│   ├── shirts/[slug]/page.tsx        # stock line + deal Countdown beside the price; social proof lines
│   ├── cart/page.tsx                 # stock line per cart line; hold Countdown when the cart has lines
│   ├── checkout/page.tsx             # hold Countdown
│   └── _data/urgency.ts              # new: loadPopCandidates() (switch + active non-bland shirts)
├── components/
│   ├── ShirtCard.tsx                 # stock line (home, listing, About's Exhibit A)
│   ├── StockLine.tsx                 # new (server): "Only 1 left!" / "Plenty left. Nobody wants these."
│   ├── Countdown.tsx                 # new (client): rAF clock from the shared anchor (R4)
│   ├── SocialProof.tsx               # new (server): "looking right now" + "just bought this pattern"
│   ├── PurchasePops.tsx              # new (client): the 20–40 s pop-ups, (x), placement (R6)
│   ├── SiteHeader.tsx                # mounts <PurchasePops/> in Suspense (rides under the sticky header on phones)
│   └── CartQuantityForm.tsx          # shows a success message ("found another one")
└── lib/
    ├── urgency/scarcity.ts           # new (pure): stockLine
    ├── urgency/countdown.ts          # new (pure): COUNTDOWN_MS, remainingMs, formatCountdown, showCountdown
    ├── urgency/social-proof.ts       # new (pure): lookingNow, buyerFor, socialProofFor
    ├── urgency/pops.ts               # new (pure): nextDelay, popDue (the schedule)
    ├── actions/cart.ts               # "found another one" on add and on a raise
    ├── cart/cart.ts                  # updateItem reports the quantity it replaced
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # the three switches
    └── copy.ts                       # urgency: stock lines, found, deal/hold, looking, cast, purchases
tests/
├── unit/urgency-scarcity.test.ts, unit/urgency-countdown.test.ts                  # new
├── unit/urgency-social-proof.test.ts, unit/urgency-pops.test.ts                   # new
├── integration/cart-found-another.test.ts, integration/migration-0007.test.ts      # new
├── integration/settings-switches.test.ts                                          # the three switches
└── e2e/fake-scarcity.spec.ts, e2e/countdown.spec.ts, e2e/social-proof.spec.ts      # new
    # updated where they wait for the add-to-cart message: e2e helpers (addShirt)
```

**Structure Decision**: this extends the single project. The decisions sit in `src/lib/urgency/`, as
pure functions of the settings, the shirt and the time. The pages and components only render what
those functions return, so "off renders nothing" is a unit test. Client code holds timing only.

## Complexity Tracking

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| On phones a pop-up may **briefly overlay the page** (never the header or the drain corner) | The owner chose it (clarification 2026-10-15). A 360px screen can't fit pop-ups and the drain stack side by side. It's up for about 6 s and has an (x). Constitution V's "readable over any background" is about backgrounds; the price itself is never restyled or replaced. | No pop-ups on phones (option C) lost the effect. Stacking above the drain corner (option B) covered more of the page's lower half, where Add to Cart and Place order are. |
| **Client timing** (rAF countdown, the pop-up schedule) | Milliseconds and pop-ups can only happen in the browser. Both read a stored timestamp, so they agree across tabs and survive reloads without a server. | A server-side deadline or a push stream adds writes and connections for fake data (VIII). |

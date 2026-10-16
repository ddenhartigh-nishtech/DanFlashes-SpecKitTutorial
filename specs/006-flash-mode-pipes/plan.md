# Implementation Plan: Flash Mode & Pipes Background

**Branch**: `006-flash-mode-pipes` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-flash-mode-pipes/spec.md`

## Summary

One shopper toggle, **Extreme Awesomeness**, in the header of every page. It turns on two features,
each behind its own owner switch in `store_settings` (migration 0009, both on by default).

1. **Flash Mode (the strobe).** It's CSS only. A stepped animation on `:root` cycles the theme's
   background, border and heading colors through the brand palette, holding each color for at
   least 400 ms (at most 2.5 changes a second).
   - Prices, tier badges, Add to Cart, the dialogs, the corner, the pop-ups and the countdowns are
     marked `data-steady` and never change.
2. **The Pipes Background.** A fixed canvas behind everything, on a black field. Classic-colored
   pipes grow from a pure, seeded engine, drawn incrementally, paused when hidden, and restarted on
   resize.
   - Text that sits on the page field gets a backing, so no pipe runs behind letters.

**His choice** lives in a cookie (`df_awesome`), read by an inline `<head>` script so a page arrives
already on. While he's signed in, it's also saved on his account (`users.extreme_awesomeness`).
Sign-in applies the account's choice, and sign-up keeps the guest's.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19, Tailwind 4)

**Primary Dependencies**: unchanged; no new packages. The strobe is CSS, and the pipes use the
browser's 2D canvas.

**Storage**: SQLite. One migration, `0009`:
- two `store_settings` switches
- one `users` column

The browser keeps a cookie. See [data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration) and Playwright (e2e, desktop and phone, production build).
`npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Performance Goals**:
- With Extreme Awesomeness on, pages keep LCP ≤ 2.5 s and CLS ≤ 0.1 (constitution VII).
- The pipes cost one small draw per step, with no full repaints, and they yield to scrolling.

**Constraints**:
- Nothing flashes more than 3 times a second.
- The sale (price, tier badge, Add to Cart) never changes color.
- Nothing covers or blocks a control.
- No change to money paths.
- The layout stays prerenderable: no `cookies()` in the root layout.
- e2e never toggles owner switches in the shared database (002 R7).

All Technical Context items are resolved. See [research.md](./research.md) (R1–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 006 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | The toggle's labels live in `copy`, in voice ("Extreme Awesomeness"). "Strobe" never shows to shoppers, and the joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | Untouched. No price, score or tier logic changes. | ✅ | ✅ |
| III | Relentlessly Vibrant | Untouched. | ✅ | ✅ |
| IV | Shamelessly Manipulative | Not a tactic. It follows the same pattern: each feature has its own switch, on by default. | ✅ | ✅ |
| V | Maximum Visual Assault | This is the principle's own MUST. **Flash Mode** sits behind a toggle that starts off, and the toggle is the most exciting button on the site (R5). **The sale still closes**: prices, badges and Add to Cart are `data-steady` (R7). **Loud on every screen**: from 360px, with e2e checking for no sideways scroll. "It starts off" is read as off until he first turns it on (spec Assumptions, owner). | ✅ | ✅ |
| VI | Fully Tested | Not a money path, but pure logic is test-first: the pipes engine, the strobe-rate constants, and the cookie helpers. Every new or changed Server Action has integration tests (`saveExtremeAwesomeness`, sign-up, sign-in). Each story has an e2e journey. `src/lib` stays ≥ 90%. | ✅ | ✅ |
| VII | Fast | The strobe is one `:root` animation. The pipes are incremental canvas draws, capped per frame and paused when hidden. Lighthouse is re-checked with it on in polish (R10). | ✅ | ✅ |
| VIII | Simple Code | No packages. One pure engine, one canvas component, one toggle, one state island, and CSS. One deliberate inline script (Complexity Tracking). | ✅ | ✅ |
| C | Commerce constraints | Untouched: no price, total, ledger or card path changes. His choice is a display preference, not personal data. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → analyze → implement → converge; merge by PR. `/speckit-analyze` isn't mandatory here (no money), but it will run as usual. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). There are no deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/006-flash-mode-pipes/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001–005 routes and actions
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001–005 layout)

```text
drizzle/0009_*.sql                    # new: flash_mode, pipes_background, users.extreme_awesomeness
scripts/seed-data.ts                  # settings defaults gain both switches
src/
├── app/
│   ├── layout.tsx                    # <head> inline script, suppressHydrationWarning, the island
│   ├── _data/awesome.ts              # new: the island's request-time read (switches + account)
│   ├── globals.css                   # the strobe, the black field, steady, field-backing, labels
│   └── (pages)                       # field-backing on loose text; data-steady on the sale
├── actions/awesome.ts                # new: "use server" adapter for saveExtremeAwesomeness
├── components/
│   ├── ExtremeAwesomeness.tsx        # new (client): the header toggle
│   ├── AwesomeState.tsx              # new (client): applies switches and the account's choice
│   ├── PipesBackground.tsx           # new (client): the canvas
│   ├── SiteHeader.tsx                # mounts the toggle beside the cart
│   └── PriceTag, ShirtBadge, AddToCart, dialogs, DrainCorner, PurchasePops, Countdown  # data-steady
└── lib/
    ├── awesome/choice.ts             # new (pure): cookie name and options, parse/serialize, the inline script source
    ├── awesome/strobe.ts             # new (pure): the strobe timing constants (≤ 3 changes a second)
    ├── awesome/account.ts            # new: read and save users.extreme_awesomeness
    ├── actions/awesome.ts            # new: saveExtremeAwesomenessCore
    ├── actions/auth.ts               # sign-up keeps the guest's choice; sign-in applies the account's
    ├── pipes/engine.ts               # new (pure): the seeded growth engine
    ├── http/cookies.ts               # options for a cookie the page can read
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # switches + column
    └── copy.ts                       # copy.awesome
tests/
├── unit/pipes-engine.test.ts, unit/awesome-choice.test.ts, unit/awesome-strobe.test.ts   # new
├── integration/awesome.test.ts, integration/migration-0009.test.ts                       # new
├── integration/settings-switches.test.ts, integration/actions-auth-checkout.test.ts      # updated
└── e2e/extreme-awesomeness.spec.ts, e2e/pipes.spec.ts                                     # new
```

**Structure Decision**: this extends the single project.
- **Pure code** (the engine, the timing, the cookie helpers) is in `src/lib`, with unit tests.
- **Request-time facts** come from one island.
- **What the shopper sees** is CSS keyed off `<html>` attributes. That's why the first paint is
  correct without reading cookies on the server.

## Complexity Tracking

No constitution deviations. Two choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| An **inline `<head>` script** reads `df_awesome` and sets `data-awesome` before first paint | It's the only way a page opened with it on arrives already on, with no flash and no hydration error, while the layout stays prerenderable (Next's documented pattern). | Applying it in `useEffect` paints the plain store first. Reading `cookies()` in the layout makes every page block under Cache Components. |
| Owner switches arrive through a **streamed island** | One request-time read covers the switches and the account's choice, and the rest of the layout stays static. | Caching the switches into the shell would need revalidation on every Studio edit. The cost: while a switch is off and he has it on, its effect can show for the moment before hydration (research R4). |

# Implementation Plan: Flash Mode & Pipes Background

**Branch**: `006-flash-mode-pipes` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-flash-mode-pipes/spec.md`

## Summary

One shopper toggle, **Extreme Awesomeness**, in the header of every page. It turns on two features,
each behind its own owner switch in `store_settings` (migration 0009, both on by default).

1. **Flash Mode (the strobe).** It's CSS only. A stepped animation on `:root` cycles strobe-only
   variables that page backgrounds and borders read, holding each color for at least 400 ms (at most
   2.5 changes a second).
   - Text colors never change.
   - Prices, tier badges, Add to Cart, the dialogs, the corner, the pop-ups and the countdowns are
     marked `data-steady` and stay as they are.
2. **The Pipes Background.** A fixed canvas behind everything, on a black field. Classic-colored
   pipes grow from a pure, seeded engine, drawn incrementally, paused when hidden, and restarted on
   resize.
   - Text that sits on the page field gets a backing, so no pipe runs behind letters.

**His choice** is his browser's: `localStorage["df-awesome"]`, shared by every tab and remembered on
later visits. An inline `<head>` script reads it, so a page arrives already on. Pressing the button
applies it at once, with no server call. The owner's switches arrive with the page as a streamed
`<style>`.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19, Tailwind 4)

**Primary Dependencies**: unchanged; no new packages. The strobe is CSS, and the pipes use the
browser's 2D canvas.

**Storage**: SQLite. One migration, `0009`, adds two `store_settings` switches. His choice stays in
his browser's local storage. See [data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration) and Playwright (e2e, desktop and phone, production build).
`npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Performance Goals**:
- With Extreme Awesomeness on, pages keep LCP ≤ 2.5 s and CLS ≤ 0.1 (constitution VII).
- The pipes cost one small draw per step, with no full repaints, and they yield to scrolling.

**Constraints**:
- Nothing flashes more than 3 times a second.
- The sale (price, tier badge, Add to Cart) never changes color, and no text gets harder to read.
- Nothing covers or blocks a control.
- No change to money paths, accounts or Server Actions.
- The layout stays prerenderable.
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
| V | Maximum Visual Assault | This is the principle's own MUST. **Flash Mode** sits behind a toggle that starts off, and the toggle is the most exciting button on the site (R5). **The sale still closes**: prices, badges and Add to Cart are `data-steady` (R7). **Loud on every screen**: from 360px, with e2e checking for no sideways scroll. "It starts off" is read as off until he first turns it on (spec Assumptions, owner). That wording is a candidate for the next batch of constitution amendments (analysis K1); there's no change now. | ✅ | ✅ |
| VI | Fully Tested | Not a money path, but pure logic is test-first: the pipes engine, the strobe constants and palettes, the stored-value helpers, and `switchOffCss`. There are no new Server Actions. Each story has an e2e journey, plus one everything-on smoke journey. `src/lib` stays ≥ 90%. | ✅ | ✅ |
| VII | Fast | The strobe is one `:root` animation. The pipes are incremental canvas draws, capped per frame and paused when hidden. Lighthouse is re-checked with it on in polish (R10). | ✅ | ✅ |
| VIII | Simple Code | No packages, no actions, no new tables. One pure engine, one canvas component, one toggle, one island, and CSS. One deliberate inline script (Complexity Tracking). | ✅ | ✅ |
| C | Commerce constraints | Untouched: no price, total, ledger or card path changes. His choice never leaves his browser. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → analyze → implement → converge; merge by PR. Analyze ran and was remediated. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). There are no deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/006-flash-mode-pipes/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001–005 routes (no action changes)
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001–005 layout)

```text
drizzle/0009_*.sql                    # new: flash_mode, pipes_background
scripts/seed-data.ts                  # settings defaults gain both switches
src/
├── app/
│   ├── layout.tsx                    # <head> inline script, suppressHydrationWarning, the island
│   ├── _data/awesome.ts              # new: the island (switch-off <style>, PipesBackground)
│   ├── globals.css                   # the strobe, the black field, steady, field-backing, labels
│   └── (pages)                       # field-backing on loose text
├── components/
│   ├── ExtremeAwesomeness.tsx        # new (client): the header toggle
│   ├── PipesBackground.tsx           # new (client): the canvas
│   ├── SiteHeader.tsx                # mounts the toggle beside the cart
│   └── PriceTag, ShirtBadge, AddToCart, dialogs, DrainCorner, PurchasePops, Countdown  # data-steady
└── lib/
    ├── awesome/choice.ts             # new (pure): the storage key, parse/serialize, the inline script source
    ├── awesome/strobe.ts             # new (pure): STROBE_HOLD_MS and the per-backing palettes
    ├── awesome/switches.ts           # new (pure): switchOffCss(settings)
    ├── pipes/engine.ts, pipes/loop.ts   # new (pure): the seeded growth engine, stepsDue
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # two switches
    └── copy.ts                       # copy.awesome
tests/
├── unit/pipes-engine.test.ts, unit/awesome-choice.test.ts                     # new
├── unit/awesome-strobe.test.ts, unit/awesome-switches.test.ts                 # new
├── unit/catalog-validate.test.ts, integration/settings-switches.test.ts       # updated
├── integration/migration-0009.test.ts                                         # new
└── e2e/extreme-awesomeness.spec.ts, e2e/pipes.spec.ts, e2e/everything-on.spec.ts   # new
```

**Structure Decision**: this extends the single project.
- **Pure code** (the engine, the timing, the palettes, the stored-value helpers, the switch-off CSS)
  is in `src/lib`, with unit tests.
- **The owner's switches** come from one island.
- **What the shopper sees** is CSS keyed off `data-awesome` on `<html>`. That's why the first paint is
  correct without the server knowing his choice.

## Complexity Tracking

No constitution deviations. Two choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| An **inline `<head>` script** reads `localStorage["df-awesome"]` and sets `data-awesome` before first paint | It's the only way a page opened with it on arrives already on, with no flash and no hydration error, while the layout stays prerenderable (Next's documented pattern). | Applying it in `useEffect` paints the plain store first. |
| Owner switches arrive as a **streamed `<style>`** from one island | One request-time read covers the switches. The style applies as soon as that part of the page arrives, before any script, and the rest of the layout stays static. | Caching the switches into the shell would need revalidation on every Studio edit. The cost: for the moment before that part arrives, a shopper with it on can see a feature the owner just turned off (spec Edge Cases, research R4). |

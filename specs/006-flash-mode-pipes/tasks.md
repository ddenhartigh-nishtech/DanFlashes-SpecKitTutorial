# Tasks: Flash Mode & Pipes Background

**Input**: Design documents from `/specs/006-flash-mode-pipes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-16, against constitution v4.0.0. Revised the same day after `/speckit-analyze`
(I1, I2, C1–C4, A1, A2, U1, U2, K1).

**Tests**: REQUIRED (constitution VI), and written first.
- No money path changes, but every test task still comes before its implementation and MUST be seen
  failing first.
- Every new `src/lib` module gets unit or integration tests.
- Every user story gets an e2e journey at desktop and phone viewports. e2e uses the default switches
  (both on) and never toggles them in the shared e2e database (002 R7). "Off" is proven in unit
  tests (`switchOffCss`).
- The Extreme Awesomeness toggle changes only that test's own browser context (its local storage).
  The pipes run only in the three journeys that turn it on, so the rest of the suite carries no
  extra load (research R10).
- e2e runs a production build, so the client components get a hand check against `next dev` for
  React Strict Mode (002 R7, known gap).

**Safety rule**: nothing may flash more than 3 times in any one second (FR-011). The strobe holds
every color for at least 400 ms, and it changes only backgrounds and borders, never text colors
(research R7).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US2)

---

## Phase 1: Setup

- [X] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR. Main is 005's merge (b9e25dd), last verified at 569 unit and integration tests, 94.87% line
  coverage, and 80 e2e.
  - *Result:* main's code is unchanged on this branch (docs only since b9e25dd), last verified at 569 unit and integration tests, 94.87% coverage and 80 e2e. A fresh baseline run of main's e2e during T015 took 2.4 min, all green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the two switches (data-model.md, research R1).

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts: `validateSettings`
  accepts `flashMode` and `pipesBackground` as booleans, and reports each one when it's missing or the
  wrong type
- [X] T003 [P] Write failing integration tests:
  - in tests/integration/settings-switches.test.ts: both switches default on for a row written
    without them, and round-trip off
  - in a new tests/integration/migration-0009.test.ts (`databaseBefore("0009")`, `toMatchObject` for
    the settings row): an existing `store_settings` row gains `flash_mode = 1` and
    `pipes_background = 1`, and `foreign_key_check` is clean
- [X] T004 Add `flashMode` and `pipesBackground` (booleans) to `StoreSettings` in
  src/lib/catalog/types.ts and to `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [X] T005 Extend `store_settings` in src/lib/db/schema.ts with `flash_mode` and `pipes_background`:
  "integer (boolean), NOT NULL, default 1". Then run `npx drizzle-kit generate --name awesome_switches`
  to produce drizzle/0009_awesome_switches.sql. Check that it only adds the two columns and rebuilds
  no table.
- [X] T006 Carry the switches through src/lib/data/settings.ts, scripts/seed-data.ts,
  tests/fixtures/catalog.ts, and `setSwitches` in tests/helpers/db.ts (T003 passes)

**Checkpoint**: both switches exist and default on, and every existing test still passes.

---

## Phase 3: User Story 1 - Extreme Awesomeness: Flash Mode (Priority: P1) 🎯 MVP

**Goal**: the header toggle on every page: the loudest button on the site, off until he turns it
on, applied at once, and then remembered by his browser. It starts the strobe, on everything except
the sale.

**Independent Test**: with the Flash Mode switch on:
- the button is in every page's header at every size, and off at first
- pressing it strobes the store at once, at no more than 3 changes a second, while prices, badges
  and Add to Cart hold their colors and no text gets harder to read
- it survives reloads, tabs and later visits in that browser

### Tests for User Story 1 (write first, watch them fail)

- [X] T007 [P] [US1] Unit tests in a new tests/unit/awesome-choice.test.ts (research R2, R3):
  - **The stored value**: `AWESOME_KEY` is `df-awesome`.
    - `parseChoice` reads `"1"` as on, and anything else (missing, `"0"`, junk) as off.
    - `serializeChoice` writes `"1"` and `"0"`.
  - **The script**: run `firstPaintScript()` against a fake `document` and `localStorage`.
    - It sets `data-awesome="on"` on the root only when the stored value is `"1"`.
    - It leaves the root alone otherwise.
    - It never throws, even when `localStorage` is missing or throws on access.
- [X] T008 [P] [US1] Unit tests in a new tests/unit/awesome-strobe.test.ts (research R7, analysis I1):
  - **The rate**: `STROBE_HOLD_MS` ≥ 400, and `1000 / STROBE_HOLD_MS` ≤ 3 (FR-011).
  - **The paper palette** excludes hot pink and ultraviolet.
  - **The dark palette** is only ink and ultraviolet.
  - **The CSS**, in src/app/globals.css:
    - the `df-strobe` animation (its duration divided by its step count) holds each color for at
      least `STROBE_HOLD_MS`
    - its keyframes set only `--df-strobe-*` properties, never a `--color-*` theme token
  - *Revised in T024* (research R7): the strobe is no longer a CSS animation, so these now check the step rules `strobeCss()` and `fieldStrobeCss()` write. Those rules change only `background-color` and `border-color`, skip `[data-steady]`, and run in palette order. The test also checks that globals.css has no strobe animation.
- [X] T009 [P] [US1] Unit tests in a new tests/unit/awesome-switches.test.ts (research R4):
  `switchOffCss(settings)` returns:
  - `""` while both switches are on
  - rules that stop the strobe under `:root[data-awesome="on"]` while `flashMode` is off
  - rules that restore the plain field and hide the canvas while `pipesBackground` is off
  - with both off, those rules plus hiding `[data-testid="extreme-awesomeness"]`
- [X] T010 [P] [US1] e2e journey in a new tests/e2e/extreme-awesomeness.spec.ts (desktop and phone;
  the phone at 360×780):
  - **Off at first**:
    - the button (`data-testid="extreme-awesomeness"`) is in the header without opening Menu, with
      `aria-pressed="false"`
    - `<html>` has no `data-awesome`
    - there's no sideways scroll
  - **The only self-animating control**: of every visible button, link and input, only this one
    has running animations (`getAnimations()`).
  - **Press it**:
    - **At once**: within 100 ms, `aria-pressed="true"` and `data-awesome="on"`, with no navigation.
    - **The rate**: a shirt card's background changes over 3 seconds, sampled every 50 ms, with no
      more than 3 changes in any 1-second window.
    - **The sale**: a price, a tier badge and Add to Cart keep exactly the computed colors they had
      before (FR-012).
    - **Readability** (analysis I1): on `/shirts/geo-riot` and `/cart` (with a line), at 6 sample
      times across a strobe cycle, every visible text element's contrast with its nearest backing
      is at least the lower of 3:1 and its contrast with it off. This includes the Check out
      button.
    - **No "strobe"** (analysis C4): no visible text on the pages visited contains "strobe"
      (FR-019).
  - **It stays**:
    - after a reload, it's on, and on before React hydrates: an init script records `data-awesome`
      the moment `<body>` is inserted
    - a new page in the same context is on
    - a second page that's already open follows along when the first one toggles (the `storage`
      event)
    - signing up, then out, then in leaves it as it was
    - a fresh context is off
  - **Press it again**: off at once, the attribute is gone, and the card stops changing

### Implementation for User Story 1

- [X] T011 [US1] Create the pure modules (T007, T008's constant and palette checks, and T009 pass):
  - src/lib/awesome/choice.ts: `AWESOME_KEY`, `parseChoice`, `serializeChoice`, `firstPaintScript`
  - src/lib/awesome/strobe.ts: `STROBE_HOLD_MS = 400`, `PAPER_PALETTE`, `DARK_PALETTE`,
    `EDGE_PALETTE`
  - src/lib/awesome/switches.ts: `switchOffCss`
- [X] T012 [US1] Wire the page:
  - **src/app/layout.tsx**:
    - `<html suppressHydrationWarning>`
    - `<head>` with an inline `<script>` holding `firstPaintScript()`
    - `<Suspense fallback={null}><AwesomeIsland /></Suspense>`
  - **A new src/app/_data/awesome.ts** (the island): `connection()`, then `getSettings`. It renders
    `<style>{switchOffCss(settings)}</style>` when that isn't empty. It gets the pipes slot in T020.
  - *Note:* the island is src/app/_data/awesome.tsx (it renders JSX). The inline script renders through a small client `InlineScript`, as Next's guide suggests, so React doesn't warn about a `<script>`.
- [X] T013 [US1] Create src/components/ExtremeAwesomeness.tsx (client) and mount it in
  src/components/SiteHeader.tsx beside the cart (research R5):
  - **The button**: a `<button aria-pressed data-testid="extreme-awesomeness" data-steady>`. It
    renders both state labels from `copy.awesome` in src/lib/copy.ts, and CSS shows the one that
    matches `data-awesome`.
  - **Its state**: `aria-pressed` syncs from the attribute in a `useLayoutEffect`, which also
    re-applies the attribute from `localStorage` after the dev remount.
  - **Pressing it**: flips the attribute and `localStorage` at once, with no server call.
  - **Other tabs**: a `storage` listener follows the other tabs.
  - **Phones**: below `md`, the label stacks onto two short lines, and the logo steps down to
    `text-xl`.
- [X] T014 [US1] In src/app/globals.css (research R7):
  - **The strobe**: the `df-strobe` keyframe animation on `:root[data-awesome="on"]`. It steps
    `--df-strobe-paper`, `--df-strobe-dark` and `--df-strobe-edge` through the palettes, holding
    each color for `STROBE_HOLD_MS`.
  - **The overrides**, under the same selector:
    - `.bg-paper` and the body field read `--df-strobe-paper`
    - `.solid-backing` reads `--df-strobe-dark`
    - `.border-ink` reads `--df-strobe-edge`
  - *Also steady* (FR-012, every price): the checkout add-on rows, the order summary's money list, the stream rows, the top-up presets and the ledger rows, which hold money outside `PriceTag` (and the hot-pink spend amounts).
  - *Revised in T024* (research R7): the keyframes and variables are gone. `StrobeClock` (mounted by the island while Flash Mode is on) moves `data-strobe-step` every 400 ms, and `strobeCss()` in the layout's `<head>` recolors the strobing classes directly. The animation restyled the page every frame: 1.7–2.8 s of style work on the home page under Lighthouse, now 0.35 s.

    Each falls back to its normal color. No text color changes.
  - **Steady**: `[data-steady]` resets the `--df-strobe-*` properties to `initial` for its subtree.
  - **The button**: its own sliding-gradient animation and pulse, and the label switching.
  - **Print**: no strobe.
  - **Marking the steady parts**: add `data-steady` to src/components/PriceTag.tsx,
    src/components/ShirtBadge.tsx, Add to Cart in src/components/AddToCart.tsx,
    src/components/ShameDialog.tsx, the dialog in src/components/ConfirmTwice.tsx,
    src/components/DrainCorner.tsx, src/components/PurchasePops.tsx and
    src/components/Countdown.tsx.
  - T008 and T010 pass.
- [X] T015 [US1] Run the whole e2e suite. Fix any existing journey the header button moved (for
  example, the phone pop-up banner sitting under a taller header), without loosening what it checks.
  - *Result:* 84 e2e pass in 3.0 min (main: 80 in 2.4 min). Two fixes came out of it:
    - The phone Menu's dropdown opened under the new button row, which took its taps (FR-003). It's now `z-50`.
    - A smooth 60 fps rainbow on every page doubled the suite's time (5.5 min) and made sign-ups time out, because headless Chromium renders in software. The rainbow now hops 2.5 times a second (`steps(10)` over 4 s), and a unit test keeps it there.

**Checkpoint**: US1 works on its own. The toggle, the strobe and the remembering are all complete,
with the plain field still behind the page.

---

## Phase 4: User Story 2 - Pipes Background (Priority: P2)

**Goal**: with Extreme Awesomeness on, classic-colored pipes grow behind every page on a black
field. They never cover anything, and no text sits on them. **Depends on US1's toggle.**

**Independent Test**: with the Pipes switch on and Extreme Awesomeness on, pipes grow behind every
page:
- they turn only at right-angle joints, start over when full, pause while hidden and restart on
  resize
- every control and line of text sits above them, readable and clickable
- with it off, the plain field is back

### Tests for User Story 2 (write first, watch them fail)

- [X] T016 [P] [US2] Unit tests in a new tests/unit/pipes-engine.test.ts (research R6, exact
  constants per analysis A2):
  - **`gridFor(width, height)`**: `CELL_PX_PHONE = 28` below 768 px wide and `CELL_PX = 40`
    otherwise, with at least one cell each way.
  - **`createEngine({ cols, rows, seed })`**: each `step()` returns drawing commands. Across many
    seeded steps:
    - a pipe moves one cell at a time, straight or turned 90°, never reversing
    - it never enters an occupied or off-grid cell
    - every change of direction emits a joint
    - at most `MAX_PIPES = 4` are live at once
    - a pipe with no free neighbor ends, and a new one starts in a free cell
    - colors come only from the classic set (red, green, blue, yellow, cyan, magenta, white)
  - **Clearing**: "clear" is emitted once the occupied share reaches `CLEAR_AT = 0.7`, or nothing
    can start. Then the grid is empty and growth resumes.
  - **Teapots**: over 6,000 seeded joints, the teapot share is within ±1.5 percentage points of
    `TEAPOT_ODDS = 1/60`.
  - **Determinism**: the same seed gives the same commands.
  - **`stepsDue(elapsedMs, STEPS_PER_SECOND = 6, maxPerFrame)`** (25 at first; see T020): time-based, and never more than
    `maxPerFrame`, so a slow frame falls behind instead of bursting (FR-018).
- [X] T017 [P] [US2] e2e journey in a new tests/e2e/pipes.spec.ts (desktop and phone; it turns
  Extreme Awesomeness on in its own context):
  - **The canvas**: `canvas[data-testid="pipes"]` is fixed, fills the viewport, has `z-index` below
    the page and `pointer-events: none`, and sits on a black field.
  - **It draws**: its pixels change over 1 second.
  - **It pauses** (analysis C2): with `document.visibilityState` emulated as hidden and
    `visibilitychange` dispatched, the pixels stop changing for 1 second. Made visible again, they
    resume.
  - **It restarts** (analysis C2): after `setViewportSize`, the canvas matches the new viewport and
    starts over from empty.
  - **It covers nothing**: `elementFromPoint` at the cart link, a price and Add to Cart returns
    those, never the canvas.
  - **The text-backing audit** (FR-016) on `/`, `/shirts`, `/shirts/geo-riot`, `/about`, `/cart`
    (with a line), `/checkout`, `/account`, `/sign-in`, `/sign-up`, an order page, and a 404: every
    visible text node in `<main>` has an ancestor, up to `<main>`, with a non-transparent
    background.
  - **No sideways scroll** at 360 px.
  - **Turning it off**: the canvas is hidden and the field is plain again.
  - *Notes:* the canvas carries `data-generation` (incremented on every fresh start) so the resize check can see it start over. The audit waits for `networkidle`, so streamed parts are checked too, not their loading placeholders.
- [X] T018 [P] [US2] e2e smoke journey in a new tests/e2e/everything-on.spec.ts (desktop and phone,
  `test.slow()`; analysis C1, SC-005). With Extreme Awesomeness on:
  - browse the listing
  - zoom and add Geo Riot
  - in the cart, raise to 2, then lower to 1 through the roach motel (`confirmTwice`)
  - check out by card (`untickAddOns`) and land on the order page
  - open the account and see the order in the history

  Every step behaves exactly as it does with it off.

### Implementation for User Story 2

- [X] T019 [US2] Create the pure pipes modules. T016 passes.
  - src/lib/pipes/engine.ts: `gridFor`, `createEngine`, the classic colors, and the constants
    `CELL_PX_PHONE`, `CELL_PX`, `MAX_PIPES`, `CLEAR_AT` and `TEAPOT_ODDS`
  - src/lib/pipes/loop.ts: `stepsDue` and `STEPS_PER_SECOND`
  - They're pure, with no DOM.
- [X] T020 [US2] Create src/components/PipesBackground.tsx (client, research R6), after T012:
  - **The canvas**: `<canvas data-testid="pipes">`, fixed, `inset: 0`, `z-index: -1`,
    `pointer-events: none`.
  - **Drawing**: tube segments with a linear gradient across them, radial-gradient ball joints, and
    a small teapot silhouette. Only new segments are drawn each step.
  - **The loop**: `requestAnimationFrame` with `stepsDue` (capped per frame), and the device pixel
    ratio capped at 2.
  - **Starting and stopping**:
    - a `MutationObserver` on `<html>` runs it only under `data-awesome="on"`
    - `visibilitychange` pauses it (FR-017)
    - a debounced resize starts it over (FR-015)
  - **Mounting** (analysis U1): the island in src/app/_data/awesome.ts renders it only while the
    Pipes switch is on.
  - **In src/app/globals.css**: the black field and the visible canvas under
    `:root[data-awesome="on"]`, and neither in print.
  - *Tuned after looking at it:* 25 steps a second cleared a desktop screen every ~5 s (a phone every ~2.5 s). `STEPS_PER_SECOND` is now 6, about 20 s to fill a desktop. Research R6 is updated to match.
- [X] T021 [US2] Text backings (FR-016, research R8):
  - **The utility**: a `field-backing` utility in src/app/globals.css. It's `bg-paper` always, and
    gains padding and an ink border on the black field.
  - **Where it goes**: every loose text block on the page field:
    - src/app/page.tsx, src/app/shirts/page.tsx, src/app/shirts/[slug]/page.tsx and
      src/app/about/page.tsx
    - src/app/cart/page.tsx, src/app/checkout/page.tsx, src/app/account/page.tsx and
      src/app/orders/[id]/page.tsx
    - src/app/_data/auth-page.tsx, src/app/not-found.tsx and src/app/error.tsx
    - any component that renders text straight on the field
  - T017 and T018 pass.
  - *Result:* the audit found 18 bare lines on 7 pages: page titles, the account's headings, balance and lines, "Checking out as…", the zoom hint, the style, "Pick your size", and two outline buttons. They now have `field-backing`, or `bg-paper` for the two buttons. All 11 routes pass on desktop and phone.

**Checkpoint**: both stories work. Extreme Awesomeness strobes the store and grows the pipes, and each
switch removes its own feature.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T022 [P] README.md:
  - add `flash_mode` and `pipes_background` to the switches table
  - note "Extreme Awesomeness" in what shoppers see, and that each browser remembers its own choice
  - note `npm run db:migrate` for 0009
- [X] T023 Check against `next dev` under React Strict Mode (002 R7, known gap):
  - one animation loop and one observer, even after toggling it ten times
  - the attribute re-applied after the dev remount
  - no hydration warnings
  - a clean console
  - *Result:* clean, under `next dev`.
    - **Loop and observers**: one pipes loop, with three observers on `<html>` (the two button instances and the canvas). Both stayed the same after ten toggles.
    - **The attribute** came back after the dev remount, and held through a client navigation.
    - **The console** had no errors or warnings.
    - **One fix came out of it**: the pipes loop woke 60 times a second to draw 6 steps. It now waits on a timer, then takes one frame per step, about 5.5 wake-ups a second.
- [X] T024 Constitution VII spot check: run Lighthouse (mobile, applied throttling, production build)
  with `df-awesome=1` set before load on `/`, `/shirts/geo-riot` and `/checkout` (with a line), and
  with it off on `/` for comparison. Each must have LCP ≤ 2.5 s and CLS ≤ 0.1, with TBT noted
  (SC-004).
  - *Result* (mobile, applied throttling, the installed Chrome, two runs each; the machine's benchmark index was 1300–2500): all within budget.

    | Page | LCP | CLS | TBT |
    |---|---|---|---|
    | `/`, on | 1.6 / 1.7 s | 0 | 300 / 330 ms |
    | `/`, off | 1.6 / 1.7 s | 0 | 350 / 310 ms |
    | `/shirts/geo-riot`, on | 1.5 / 1.6 s | 0 | 450 / 460 ms |
    | `/checkout` (with a line), on | 1.0 / 0.8 s | 0.054 | 720 / 400 ms |

  - The first runs found the strobe's cost: as a CSS animation, it restyled the page every frame (2.3 s of style work on `/`, LCP up to 3.5 s). It's now a 400 ms clock with direct step rules, and style work on `/` is down to 0.35 s (off: 0.23 s). See T014 and research R7.
- [X] T025 Run quickstart.md scenarios 1–15 and note the results.
  - *Result:* 1–15 pass on a production build, with Studio edits made in SQLite.
    - The e2e journeys cover 1–5 and 7–12 on desktop and phone.
    - Scripted here:
      - **6**: the bland-shirt dialog sits above the pipes and the strobe, and holds still.
      - **13**: Flash Mode off leaves the pipes only, the Pipes off leaves the strobe only, and both off means no button and the plain store.
      - **14**: a 404 gets everything, and `/teapot` (418) is unchanged.
      - **15**: print has no pipes and no strobe.
- [X] T026 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including src/lib/pipes/ and src/lib/awesome/.
  - *Result:* green.
    - Unit and integration: 62 files and 609 tests.
    - Coverage on `src/lib`: 94.79% lines, 93.03% branches. src/lib/awesome/ is at 100%, and src/lib/pipes/ at 91.1% (the free-cell scan's fallback is the uncovered part).
    - e2e: 90 passed in 4.3 min. Main had 80 in 2.4 min; the 10 new journeys sample the strobe and grow the pipes.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks both stories.
- **US1 (T007–T015)** depends only on Foundational.
- **US2 (T016–T021)** depends on US1's toggle and island (T012–T014) as well as Foundational: the
  pipes show only with Extreme Awesomeness on.
- Within a story: tests first, then pure modules, then UI, then the existing-journey fixes.
- Shared files are touched in turn:
  - src/app/globals.css (T014, T020, T021)
  - src/app/_data/awesome.ts (T012, T020)
  - src/app/layout.tsx (T012)
  - src/components/SiteHeader.tsx (T013)

  Do these sequentially.
- **Polish (T022–T026)** comes after both stories.

### Parallel opportunities

- T002 ∥ T003
- Within US1: T007 ∥ T008 ∥ T009 ∥ T010
- Within US2: T016 ∥ T017 ∥ T018 (they can be written while US1's UI is in progress)
- T022 can run beside T023–T025

### Parallel example: User Story 1

```text
Task: "Unit tests for the stored value and first-paint script in tests/unit/awesome-choice.test.ts"
Task: "Unit tests for the strobe rate and palettes in tests/unit/awesome-strobe.test.ts"
Task: "Unit tests for switchOffCss in tests/unit/awesome-switches.test.ts"
Task: "e2e journey in tests/e2e/extreme-awesomeness.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1 (Extreme Awesomeness and the strobe). It satisfies
   constitution V's Flash Mode MUST on its own.
2. **Increment 2**: US2 (the pipes), riding on the same toggle, plus the everything-on smoke journey.
3. **Polish**: the README, the Strict Mode check, Lighthouse, the quickstart, then verify. Then
   converge, and a PR.

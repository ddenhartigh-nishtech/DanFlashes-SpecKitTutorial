# Tasks: Flash Mode & Pipes Background

**Input**: Design documents from `/specs/006-flash-mode-pipes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-16, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- No money path changes, but every test task still comes before its implementation and MUST be seen
  failing first.
- Every new `src/lib` module gets unit or integration tests.
- Every user story gets an e2e journey at desktop and phone viewports. e2e uses the default switches
  (both on) and never toggles them in the shared e2e database (002 R7). "Off" is proven in unit and
  integration tests.
- The Extreme Awesomeness toggle changes only that test's own browser context (its cookie). The pipes
  run only in the journeys that turn it on, so the rest of the suite carries no extra load (research
  R10).
- e2e runs a production build, so the client components get a hand check against `next dev` for
  React Strict Mode (002 R7, known gap).

**Safety rule**: nothing may flash more than 3 times in any one second (FR-011). The strobe holds
every color for at least 400 ms (research R7).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US2)

---

## Phase 1: Setup

- [ ] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR. Main is 005's merge (b9e25dd), last verified at 569 unit and integration tests, 94.87% line
  coverage, and 80 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the two switches and the account column (data-model.md, research R1).

- [ ] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts: `validateSettings`
  accepts `flashMode` and `pipesBackground` as booleans, and reports each one when it's missing or the
  wrong type
- [ ] T003 [P] Write failing integration tests:
  - in tests/integration/settings-switches.test.ts: both switches default on for a row written
    without them, and round-trip off
  - in a new tests/integration/migration-0009.test.ts (`databaseBefore("0009")`, `toMatchObject` for
    the settings row):
    - an existing `store_settings` row gains `flash_mode = 1` and `pipes_background = 1`
    - an existing `users` row gains `extreme_awesomeness = 0`
    - `foreign_key_check` is clean
- [ ] T004 Add `flashMode` and `pipesBackground` (booleans) to `StoreSettings` in
  src/lib/catalog/types.ts and to `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [ ] T005 Extend src/lib/db/schema.ts per data-model.md:
  - `store_settings` gains `flash_mode` and `pipes_background`: "integer (boolean), NOT NULL,
    default 1"
  - `users` gains `extreme_awesomeness`: "integer (boolean), NOT NULL, default 0"

  Then run `npx drizzle-kit generate --name extreme_awesomeness` to produce
  drizzle/0009_extreme_awesomeness.sql. Check that it only adds the three columns and rebuilds no
  table.
- [ ] T006 Carry the switches through src/lib/data/settings.ts, scripts/seed-data.ts,
  tests/fixtures/catalog.ts, and `setSwitches` in tests/helpers/db.ts (T003 passes)

**Checkpoint**: both switches exist and default on, the account column defaults off, and every
existing test still passes.

---

## Phase 3: User Story 1 - Extreme Awesomeness: Flash Mode (Priority: P1) 🎯 MVP

**Goal**: the header toggle on every page: the loudest button on the site, off until he turns it
on, then remembered (cookie; account while signed in). It starts the strobe, everywhere except the
sale.

**Independent Test**: with the Flash Mode switch on:
- the button is in every page's header at every size, and off at first
- pressing it strobes the store at no more than 3 changes a second, while prices, badges and Add to
  Cart hold their colors
- it survives reloads, new tabs and later visits
- it follows a signed-in shopper to another browser

### Tests for User Story 1 (write first, watch them fail)

- [ ] T007 [P] [US1] Unit tests in a new tests/unit/awesome-choice.test.ts (research R2, R3):
  - **The cookie**: `AWESOME_COOKIE` is `df_awesome`.
    - `parseChoice` reads `"1"` as on, and anything else (missing, `"0"`, junk) as off.
    - `serializeChoice` writes `"1"` and `"0"`.
  - **Its options**: `awesomeCookieOptions()` is "1 year, `path=/`, `SameSite=Lax`, not `httpOnly`,
    `Secure` in production".
  - **The script**: run `firstPaintScript()` against a fake `document`. It sets `data-awesome="on"`
    on the root only when the cookie string holds `df_awesome=1`, among other cookies, at any
    position. It leaves the root alone otherwise, and it never throws on a malformed cookie string.
- [ ] T008 [P] [US1] Unit tests in a new tests/unit/awesome-strobe.test.ts (research R7):
  - `STROBE_HOLD_MS` ≥ 400, and `1000 / STROBE_HOLD_MS` ≤ 3 (FR-011).
  - The strobe palette for backgrounds behind ink text excludes ultraviolet.
  - The `df-strobe` animation in src/app/globals.css (its duration divided by its step count) holds
    each color for at least `STROBE_HOLD_MS`.
- [ ] T009 [P] [US1] Integration tests in a new tests/integration/awesome.test.ts (research R2, R4;
  contracts):
  - **`saveExtremeAwesomenessCore(db, jar, on)`**:
    - for a guest: sets `df_awesome` to `"1"`/`"0"` with `awesomeCookieOptions()`, and writes no
      account
    - signed in: also saves `users.extreme_awesomeness`
  - **`signUpCore`**: a new account is saved on when the jar holds `df_awesome=1`, and off when it's
    missing or `0`.
  - **`signInCore`**: sets `df_awesome` to the account's choice, `"1"` for an on account even when
    the jar held `"0"`, and the reverse.
  - **`signOutCore`**: leaves `df_awesome` alone.
  - **`awesomeState(db, settings, user)`**: returns `{ strobe, pipes, account }` for every switch
    combination. `account` is `null` for a guest, and the saved boolean when he's signed in.
- [ ] T010 [P] [US1] e2e journey in a new tests/e2e/extreme-awesomeness.spec.ts (desktop and phone;
  the phone at 360×780):
  - **Off at first**:
    - the button (`data-testid="extreme-awesomeness"`) is in the header without opening Menu, with
      `aria-pressed="false"`
    - `<html>` has no `data-awesome`
    - there's no sideways scroll
  - **The only self-animating control**: of every visible button, link and input, only this one
    has running animations (`getAnimations()`).
  - **Press it**:
    - `aria-pressed="true"` and `data-awesome="on"`
    - a shirt card's background changes over 3 seconds, sampled every 50 ms, with no more than 3
      changes in any 1-second window
    - a price, a tier badge and Add to Cart keep exactly the computed colors they had before (FR-012)
  - **It stays**:
    - after a reload, it's on, and on before React hydrates: an init script records `data-awesome`
      the moment `<body>` is inserted
    - a new page in the same context is on
    - a fresh context is off
  - **Accounts**:
    - with it on, sign up: in a new context, signing in to that account turns it on
    - with an "off" account, signing in turns off a browser that had it on
    - signing out leaves it as it was
  - **Press it again**: off, the attribute is gone, and the card stops changing

### Implementation for User Story 1

- [ ] T011 [US1] Create src/lib/awesome/choice.ts (`AWESOME_COOKIE`, `parseChoice`,
  `serializeChoice`, `awesomeCookieOptions`, `firstPaintScript`) and src/lib/awesome/strobe.ts
  (`STROBE_HOLD_MS = 400`, the palettes). Widen `CookieOptions` in src/lib/http/cookies.ts so
  `httpOnly` can be false for this one cookie, without changing `cookieOptions()` (T007 and T008's
  constant checks pass).
- [ ] T012 [US1] Create src/lib/awesome/account.ts (`getAccountChoice`, `saveAccountChoice`,
  `awesomeState`). Add `saveExtremeAwesomenessCore` in a new src/lib/actions/awesome.ts, and its
  `"use server"` adapter in a new src/actions/awesome.ts, taking `on` as a boolean.
  - In src/lib/actions/auth.ts, sign-up saves the guest cookie's choice to the new account, and
    sign-in sets the cookie from the account.
  - T009 passes.
- [ ] T013 [US1] Wire the page:
  - **src/app/layout.tsx**:
    - `<html suppressHydrationWarning>`
    - `<head>` with an inline `<script>` holding `firstPaintScript()`
    - `<Suspense fallback={null}><AwesomeIsland /></Suspense>`
  - **A new src/app/_data/awesome.ts** for the island's request-time read: `connection()`,
    `getSettings`, `currentUser`, `awesomeState`.
  - **A new src/components/AwesomeState.tsx** (client, no UI). In a `useLayoutEffect`, it:
    - sets `data-strobe="off"` and `data-pipes="off"` on `<html>` while those switches are off
    - when signed in, applies the account's choice to the attribute and the cookie where they
      differ (research R4)
- [ ] T014 [US1] Create src/components/ExtremeAwesomeness.tsx (client) and mount it in
  src/components/SiteHeader.tsx beside the cart (research R5):
  - **The button**: a `<button aria-pressed data-testid="extreme-awesomeness" data-steady>`. It
    renders both state labels from `copy.awesome` in src/lib/copy.ts, and CSS shows the one that
    matches `data-awesome`.
  - **Its state**: `aria-pressed` syncs from the attribute in a `useLayoutEffect`, which also
    re-applies the attribute from the cookie after the dev remount.
  - **Pressing it**: flips the attribute and the cookie at once, then calls
    `saveExtremeAwesomeness` in a transition.
  - **Phones**: below `md`, the label stacks onto two short lines, and the logo steps down to
    `text-xl`.
  - **Both switches off**: the button is hidden (`:root[data-strobe="off"][data-pipes="off"]`).
- [ ] T015 [US1] In src/app/globals.css (research R7):
  - **The strobe**: a `df-strobe` keyframe animation on
    `:root[data-awesome="on"]:not([data-strobe="off"])`. It steps `--color-paper` and a border
    variable (an override on `.border-ink`) through the palettes, holding each color for
    `STROBE_HOLD_MS`.
  - **Steady**: `[data-steady]` pins the custom properties to their fixed values for its subtree,
    with no animation.
  - **The button**: its own sliding-gradient animation and pulse, and the label switching.
  - **Print**: no strobe.
  - **Marking the steady parts**: add `data-steady` to src/components/PriceTag.tsx,
    src/components/ShirtBadge.tsx, Add to Cart in src/components/AddToCart.tsx,
    src/components/ShameDialog.tsx, the dialog in src/components/ConfirmTwice.tsx,
    src/components/DrainCorner.tsx, src/components/PurchasePops.tsx and
    src/components/Countdown.tsx.
  - T008 and T010 pass.
- [ ] T016 [US1] Run the whole e2e suite. Fix any existing journey the header button moved (for
  example, the phone pop-up banner sitting under a taller header), without loosening what it checks.

**Checkpoint**: US1 works on its own. The toggle, the strobe and the remembering are all complete,
with the plain field still behind the page.

---

## Phase 4: User Story 2 - Pipes Background (Priority: P2)

**Goal**: with Extreme Awesomeness on, classic-colored pipes grow behind every page on a black
field. They never cover anything, and no text sits on them. **Depends on US1's toggle.**

**Independent Test**: with the Pipes switch on and Extreme Awesomeness on, pipes grow behind every
page:
- they turn only at right-angle joints and start over when full
- every control and line of text sits above them, readable and clickable
- with it off, the plain field is back

### Tests for User Story 2 (write first, watch them fail)

- [ ] T017 [P] [US2] Unit tests in a new tests/unit/pipes-engine.test.ts (research R6):
  - **`gridFor(width, height)`**: about 28 px cells below 768 px wide and about 40 px otherwise,
    with at least one cell each way.
  - **`createEngine({ cols, rows, seed })`**: each `step()` returns drawing commands. Across many
    seeded steps:
    - a pipe moves one cell at a time, straight or turned 90°, never reversing
    - it never enters an occupied or off-grid cell
    - every change of direction emits a joint
    - at most 4 pipes are live at once
    - a pipe with no free neighbor ends, and a new one starts in a free cell
    - colors come only from the classic set (red, green, blue, yellow, cyan, magenta, white)
  - **Clearing**: "clear" is emitted once ≥ 70% of cells are occupied or nothing can start. Then
    the grid is empty and growth resumes.
  - **Teapots**: over 6,000 seeded joints, between 0.5% and 3.5% are teapots.
  - **Determinism**: the same seed gives the same commands.
  - **`stepsDue(elapsedMs, stepsPerSecond, maxPerFrame)`**: time-based, and never more than
    `maxPerFrame`, so a slow frame falls behind instead of bursting (FR-018).
- [ ] T018 [P] [US2] e2e journey in a new tests/e2e/pipes.spec.ts (desktop and phone; it turns
  Extreme Awesomeness on in its own context):
  - **The canvas**: `canvas[data-testid="pipes"]` is fixed, fills the viewport, has `z-index` below
    the page and `pointer-events: none`, and sits on a black field.
  - **It draws**: its pixels change over 1 second.
  - **It covers nothing**: `elementFromPoint` at the cart link, a price and Add to Cart returns
    those, never the canvas.
  - **The text-backing audit** (FR-016) on `/`, `/shirts`, `/shirts/geo-riot`, `/about`, `/cart`
    (with a line), `/checkout`, `/account`, `/sign-in`, `/sign-up`, an order page, and a 404: every
    visible text node in `<main>` has an ancestor, up to `<main>`, with a non-transparent
    background.
  - **No sideways scroll** at 360 px.
  - **Turning it off**: the canvas is hidden and the field is plain again.

### Implementation for User Story 2

- [ ] T019 [US2] Create src/lib/pipes/engine.ts (`gridFor`, `createEngine`, the classic colors,
  teapot odds) and src/lib/pipes/loop.ts (`stepsDue`). Pure, with no DOM. T017 passes.
- [ ] T020 [US2] Create src/components/PipesBackground.tsx (client, research R6):
  - **The canvas**: `<canvas data-testid="pipes">`, fixed, `inset: 0`, `z-index: -1`,
    `pointer-events: none`.
  - **Drawing**: tube segments with a linear gradient across them, radial-gradient ball joints, and
    a small teapot silhouette. Only new segments are drawn each step.
  - **The loop**: `requestAnimationFrame` with `stepsDue` (about 25 steps a second, capped per
    frame), and the device pixel ratio capped at 2.
  - **Starting and stopping**:
    - a `MutationObserver` on `<html>` runs it only under `data-awesome="on"` without
      `data-pipes="off"`
    - `visibilitychange` pauses it (FR-017)
    - a debounced resize starts it over (FR-015)
  - **Mounting**: the island renders it only while the Pipes switch is on.
  - **In src/app/globals.css**: the black field and the visible canvas under
    `:root[data-awesome="on"]:not([data-pipes="off"])`, and neither in print.
- [ ] T021 [US2] Text backings (FR-016, research R8):
  - **The utility**: a `field-backing` utility in src/app/globals.css. It's `bg-paper` always, and
    gains padding and an ink border while the pipes show.
  - **Where it goes**: every loose text block on the page field:
    - src/app/page.tsx, src/app/shirts/page.tsx, src/app/shirts/[slug]/page.tsx and
      src/app/about/page.tsx
    - src/app/cart/page.tsx, src/app/checkout/page.tsx, src/app/account/page.tsx and
      src/app/orders/[id]/page.tsx
    - src/app/_data/auth-page.tsx, src/app/not-found.tsx and src/app/error.tsx
    - any component that renders text straight on the field
  - T018 passes.

**Checkpoint**: both stories work. Extreme Awesomeness strobes the store and grows the pipes, and each
switch removes its own feature.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T022 [P] README.md:
  - add `flash_mode` and `pipes_background` to the switches table
  - note "Extreme Awesomeness" in what shoppers see
  - note `npm run db:migrate` for 0009
- [ ] T023 Check against `next dev` under React Strict Mode (002 R7, known gap):
  - one animation loop and one observer, even after toggling it ten times
  - the attribute re-applied after the dev remount
  - no hydration warnings
  - a clean console
- [ ] T024 Constitution VII spot check: run Lighthouse (mobile, applied throttling, production build)
  with `df_awesome=1` on `/`, `/shirts/geo-riot` and `/checkout` (with a line), and with it off on
  `/` for comparison. Each must have LCP ≤ 2.5 s and CLS ≤ 0.1, with TBT noted (SC-004).
- [ ] T025 Run quickstart.md scenarios 1–15 and note the results.
- [ ] T026 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including src/lib/pipes/ and src/lib/awesome/.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks both stories.
- **US1 (T007–T016)** depends only on Foundational.
- **US2 (T017–T021)** depends on US1's toggle (T013–T015) as well as Foundational: the pipes show
  only with Extreme Awesomeness on.
- Within a story: tests first, then pure modules, then data and actions, then UI, then the
  existing-journey fixes.
- Shared files are touched in turn: src/app/globals.css (T015, T020, T021), src/app/layout.tsx
  (T013), src/components/SiteHeader.tsx (T014). Do these sequentially.
- **Polish (T022–T026)** comes after both stories.

### Parallel opportunities

- T002 ∥ T003
- Within US1: T007 ∥ T008 ∥ T009 ∥ T010
- Within US2: T017 ∥ T018 (they can be written while US1's UI is in progress)
- T022 can run beside T023–T025

### Parallel example: User Story 1

```text
Task: "Unit tests for the cookie and first-paint script in tests/unit/awesome-choice.test.ts"
Task: "Unit tests for the strobe rate in tests/unit/awesome-strobe.test.ts"
Task: "Integration tests for saving and carrying the choice in tests/integration/awesome.test.ts"
Task: "e2e journey in tests/e2e/extreme-awesomeness.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1 (Extreme Awesomeness and the strobe). It satisfies
   constitution V's Flash Mode MUST on its own.
2. **Increment 2**: US2 (the pipes), riding on the same toggle.
3. **Polish**: the README, the Strict Mode check, Lighthouse, the quickstart, then verify. Then
   converge, and a PR.

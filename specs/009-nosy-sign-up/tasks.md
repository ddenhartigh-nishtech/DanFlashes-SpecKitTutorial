# Tasks: Nosy Sign-Up

**Input**: Design documents from `/specs/009-nosy-sign-up/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-16, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- The one rule that matters is "nosy fields are never submitted, stored or logged". It gets e2e proof
  with sentinel values, written and seen failing before the fields exist.
- Every new `src/lib` module gets unit tests.
- e2e uses the default switch (on) and never toggles it in the shared e2e database (002 R7). "Off" is
  proven in unit and integration tests and in quickstart scenario 12.
- e2e runs a production build, so the client component gets a hand check against `next dev` for
  React Strict Mode (002 R7, known gap).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1)

---

## Phase 1: Setup

- [X] T001 Record the baseline for the PR. Main is 006's merge (dc80dd6), last verified at 610 unit
  and integration tests, 94.79% line coverage, and 90 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the switch (data-model.md, research R1).

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts: `validateSettings`
  accepts `nosySignUp` as a boolean, and reports it when it's missing or the wrong type
- [X] T003 [P] Write failing integration tests:
  - in tests/integration/settings-switches.test.ts: the switch defaults on for a row written without
    it, and round-trips off
  - in a new tests/integration/migration-0010.test.ts (`databaseBefore("0010")`, `toMatchObject` for
    the settings row): an existing `store_settings` row gains `nosy_sign_up = 1`, and
    `foreign_key_check` is clean
- [X] T004 Add `nosySignUp` (boolean) to `StoreSettings` in src/lib/catalog/types.ts and to
  `settingsSchema` in src/lib/catalog/validate.ts (T002 passes)
- [X] T005 Extend `store_settings` in src/lib/db/schema.ts with `nosy_sign_up`: "integer (boolean),
  NOT NULL, default 1". Then run `npx drizzle-kit generate --name nosy_sign_up` to produce
  drizzle/0010_nosy_sign_up.sql. Check that it only adds the column and rebuilds no table.
- [X] T006 Carry the switch through src/lib/data/settings.ts, scripts/seed-data.ts,
  tests/fixtures/catalog.ts, and `setSwitches` in tests/helpers/db.ts (T003 passes)

**Checkpoint**: the switch exists and defaults on, and every existing test still passes.

---

## Phase 3: User Story 1 - The Nosy Sign-Up (Priority: P1) 🎯 MVP

**Goal**: sign-up asks for far too much, all marked "Required". None of it ever leaves his browser. A
blank gets one line from Dan, and then he's in.

**Independent Test**: with the switch on, sign up with a sentinel in every nosy field:
- no request, database file, browser storage or console message holds any of them
- the account is exactly the real fields
- with blanks, the first press gets Dan's line and the second signs up

### Tests for User Story 1 (write first, watch them fail)

- [X] T007 [P] [US1] Unit tests in a new tests/unit/nosy.test.ts (research R6, R8):
  - **The field list**: `copy.nosy.fields` has at least 10 fields.
    - It includes the Social Security Number, mother's maiden name, blood type and current
      medications.
    - Every label is non-empty.
    - Only the Social Security Number and mother's maiden name are `masked`.
  - **The other copy**: `copy.nosy.required`, `skipped` ("Dan noticed you skipped a few. He'll allow
    it.") and `legend` ("** Actually required.") are there.
  - **The nudge**: `shouldNudge({ anyBlank, nudged })` is true only when a field is blank and Dan
    hasn't said his line yet.
- [X] T008 [P] [US1] e2e journey in a new tests/e2e/nosy-sign-up.spec.ts (desktop and phone; the phone
  at 360×780). Every nosy field gets its own distinctive sentinel, e.g. `NOSY-<field>-7Q2X`.
  - **The page** (US1-1, FR-003, FR-009):
    - the real fields first, with `**` on email and password
    - every nosy field (`data-testid="nosy-field"`) after them, each marked "Required"
    - "** Actually required." and Sign up last
    - no sideways scroll
  - **The fields are props** (FR-005, FR-006): every nosy input has:
    - no `name`, and `form === null`
    - `autocomplete="off"`, `spellcheck="false"`
    - the ignore hints (`data-1p-ignore`, `data-lpignore`, `data-bwignore`, `data-form-type="other"`)
  - *Seen failing first*: the e2e build refused to type-check until `copy.nosy` existed. Once the fields existed, the nudge journey caught a test bug: a refused sign-up resets the real form (as it always has), so the test fills it in again.

    The SSN and mother's maiden name inputs compute `-webkit-text-security: disc`, and the others
    don't.
  - **Leaving** (US1-6, FR-007), both ways:
    - type into the nosy fields, `goto("/about")`, go Back: they're empty
    - type again, click the header's About link (an in-app navigation, which keeps the page mounted
      but hidden), go Back: they're empty (analysis C2)
  - **The nudge** (US1-2, FR-008): with the real fields filled and the nosy fields blank, the first
    press shows `data-testid="nosy-skipped"` and stays on `/sign-up`.
    - **Once per visit** (analysis C4): with an email that's already taken, the next press goes
      straight to the store, whose "taken" error shows, with no second line.
    - **Then**: fix the email, and the next press lands on `/account`.
  - **Sign-in is unchanged** (FR-011, analysis C3): `/sign-in` has no nosy fields, no `**` and no
    legend.
  - **Nothing leaves** (US1-3, SC-001), in a fresh context: fill every nosy field with its sentinel and
    sign up on the first press, recording every request's URL, headers and body and every console
    message. Then:
    - no request and no console message contains a sentinel
    - `localStorage`, `sessionStorage` and the cookies don't
    - the e2e database file and its WAL (`data/e2e.db`, `data/e2e.db-wal`) don't
    - `/account` shows the name he gave, and nothing else from the form
- [X] T009 [US1] Update `signUp` in tests/e2e/helpers.ts. With the switch on, a blank nosy form gets
  Dan's line first: press Sign up, wait for `nosy-skipped`, then press it again. Every journey that
  signs up keeps checking what it checks.

### Implementation for User Story 1

- [X] T010 [US1] Create src/lib/nosy/nudge.ts (`shouldNudge`), and add `copy.nosy` to src/lib/copy.ts:
  - the heading and the "Required" mark
  - the ten starting fields, in the spec's order, each with `label` and `masked`
  - `skipped` and `legend`

  T007 passes.
- [X] T011 [US1] Create src/components/NosyFields.tsx (client, research R2–R5):
  - **The fields**: one label per field (`data-testid="nosy-field"`) wrapping its "Required" mark and
    an **uncontrolled, unnamed** `<input type="text">`. Each input has `autoComplete="off"`,
    `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"` and the four ignore hints.
    Masked ones get the `nosy-masked` class.
  - **Where it renders**: **outside** any `<form>`.
  - **Emptiness**: it gives the form a way to ask whether any field is blank (a ref to its
    container), and only ever reads emptiness.
  - **Clearing**: every input empties in its effect cleanup (hide or unmount) and on `pagehide`.
  - **In src/app/globals.css**: `.nosy-masked { -webkit-text-security: disc; }`
  - *Watch out*: the Tailwind Prettier plugin strips a leading space inside a class string, so `` `${input}${masked ? " nosy-masked" : ""}` `` would have glued the class on. The ternary picks between two whole strings instead.
- [X] T012 [US1] Wire it into sign-up:
  - **src/app/_data/auth-page.tsx** reads `getSettings` and passes `nosy={settings.nosySignUp}` to
    `AuthForm` in sign-up mode.
  - **src/components/AuthForm.tsx**, while `nosy` is on:
    - the real `<form>` gets `id="sign-up-form"`
    - email and password labels get `**`
    - `NosyFields` renders after the form, then the legend, then Sign up as
      `<button type="submit" form="sign-up-form">`
    - the form's `onSubmit` asks `shouldNudge`. On a nudge it calls `preventDefault()` and shows
      `copy.nosy.skipped` (`data-testid="nosy-skipped"`) once.
    - the "said it" flag resets when he leaves, in the same effect cleanup and on `pagehide` as the
      fields, so "once" means once per visit (analysis U1)
  - **While off**: the markup is as before.
  - **Last**: run the whole e2e suite. T008 passes, and every journey that signs up passes through
    T009's helper.
  - *Result:* the 8 new journeys pass, and the whole e2e suite passes: 98 tests in 3.5 min. AuthForm owns the clearing and the "said it" flag in one stable effect, so re-renders (Dan's line appearing) never wipe the fields.

**Checkpoint**: US1 is complete. Nothing typed into a nosy field reaches the store, and sign-up works
in two presses at most.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T013 [P] README.md: add `nosy_sign_up` to the switches table, and note `npm run db:migrate` for
  0010
- [ ] T014 Check against `next dev` under React Strict Mode (002 R7, known gap):
  - Dan's line shows once, and the second press signs up
  - the fields clear on leaving
  - no hydration warnings
  - a clean console
- [ ] T015 Constitution VII spot check: run Lighthouse (mobile, applied throttling, production build,
  the installed Chrome) on `/sign-up` with the switch on, twice. It must have LCP ≤ 2.5 s and
  CLS ≤ 0.1, with TBT noted (SC-005).
- [ ] T016 Run quickstart.md scenarios 1–12 and note the results.
  - **Scripted**, against a production build on a scratch `db:reset` copy, with "Studio" edits made
    straight in SQLite, as in 005 and 006.
  - **Scenario 12** (analysis C1, FR-002, SC-004): flip `nosy_sign_up` to 0. `/sign-up` must show no
    nosy fields, no `**` and no legend, and sign up on the first press. Then flip it back.
  - **Scenario 6** (autofill and password managers) stays a hand check in a real browser profile.
- [ ] T017 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including src/lib/nosy/.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks US1.
- **US1 (T007–T012)**: tests first (T007 ∥ T008), then T009, T010, T011 → T012.
- **Polish (T013–T017)** comes after US1. T013 can run beside T014–T016.

### Parallel opportunities

- T002 ∥ T003
- T007 ∥ T008

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1. It's the whole feature.
2. **Polish**: the README, the Strict Mode check, Lighthouse, the quickstart, then verify. Then
   converge, and a PR.

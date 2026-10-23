# Tasks: Pushy Shirt Sales Bot (PSSB)

**Input**: Design documents from `/specs/012-pushy-sales-bot/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pssb.md, quickstart.md

**Generated**: 2026-10-20, against constitution v5.1.0 (draft; ratified by merging this PR)

**Tests**: REQUIRED (constitution VI), and written first.
- **Before the code**: "Add it" reaches the cart, so `detectOffer` and its refusals are tested first,
  and so are the price guard and `buildFacts`' exclusions.
- **The stand-in model**: every model-facing test uses it (`verify`). The real model is measured by
  `npm run pssb:eval` before merge (v5.1.0).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Record the baseline. Main is at ec11faf (#10 with 011 inside), last verified at 1,052 unit
  and integration tests, 95.09% line coverage, and 154 e2e. Confirm Ollama answers at
  `http://localhost:11434` with `llama3.2:3b`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PSSB's settings and switch, and the pure library every story uses.

- [X] T002 [P] Write a failing tests/integration/migration-0016.test.ts (`databaseBefore("0016")`):
  - `pushy_sales_bot = 1`; `pssb_model_url`, `pssb_model` and `support_email` are NULL
  - the other settings are unchanged
  - the CHECKs refuse: a non-http URL, a URL over 200 characters, an empty or over-80 model name, and
    an email without exactly one `@`
- [X] T003 [P] Update the switch and settings tests: 16 keys including `pushySalesBot`
  (tests/unit/admin-switches.test.ts); `validateSettings` requires the four new fields
  (tests/unit/catalog-validate.test.ts); the round trip (tests/integration/settings-switches.test.ts);
  the e2e switchboard count is 16.
- [X] T004 Extend src/lib/db/schema.ts per data-model.md:
  - `pushySalesBot`: boolean, NOT NULL, default true
  - `pssbModelUrl`, `pssbModel`, `supportEmail`: text, NULL, with their CHECKs

  Then:
  - Run `npx drizzle-kit generate --name pushy_sales_bot`. Hand-check the rebuild, so new columns
    take their defaults.
  - Carry them through `StoreSettings`, `settingsSchema`, `getSettings` / `saveSettings`,
    scripts/seed-data.ts, tests/fixtures/catalog.ts, `SWITCH_KEYS` and
    `copy.console.settings.switches.pushySalesBot`.
  - T002 and T003 pass.
- [X] T005 [P] Write failing tests/unit/pssb-redact.test.ts: test card numbers in 13–19 digits (with
  spaces or dashes) that pass Luhn are blanked; ones that fail Luhn, prices and order numbers are
  kept; `123-45-6789` and 9 digits in a row are blanked. Then implement src/lib/pssb/redact.ts (R7).
- [X] T006 [P] Write failing tests/unit/pssb-endpoint.test.ts: Settings beats the environment, which
  beats `DEFAULT_PSSB` (`http://localhost:11434`, `llama3.2:3b`); a blank override falls through.
  Then implement src/lib/pssb/endpoint.ts (R1, R10).
- [X] T007 [P] Write failing tests/unit/pssb-guard.test.ts:
  - **The stream guard** (`guardStream`): an allowed amount passes; "$750.00", when it isn't in the
    facts, becomes `copy.pssb.priceGuard`; a "$" word split across chunks is held until it's whole
  - **Linking** (`linkShirts`): exact case-insensitive whole names become `<a href="/shirts/slug">`;
    partial and unknown names don't; everything else is escaped HTML

  Then implement src/lib/pssb/guard.ts (R4).
- [X] T008 Write failing tests/integration/pssb-facts.test.ts against a seeded store that also has
  scores, a resting shirt, another shopper's one of a kind, card brand and last 4 on orders, and a
  user's email:
  - the stable prompt names every listed active shirt with the store's formatted price, tier and
    sizes, and none of the excluded things
  - no number equal to any shirt's score appears beside its name, and no "complexity" field
  - BLAND shirts are marked unsellable while bland shaming is on
  - the fake-scarcity line appears only while that tactic is on
  - the dial appears only while the generator is on, and the surcharge only while it's on
  - the support email is used, or the excuse instruction
  - the allowed-amounts set holds every price and the surcharge

  Then implement src/lib/pssb/facts.ts (stable part and page part; the shopper part is in T024) and
  src/lib/pssb/persona.ts (R2, R5).
- [X] T009 Implement src/lib/pssb/ollama.ts:
  - `streamChat(endpoint, messages, { firstWordMs: 20_000, totalMs: 45_000, signal })`: yields text
    chunks from Ollama's NDJSON, with `stream: true`, `keep_alive: "2h"`, and `options: { num_predict:
    90, num_ctx: 4096, temperature: 0.8 }`
  - `warm(endpoint, system)`: a detached one-token call
  - a 5 s connection deadline: no response headers in 5 s throws `PssbUnreachable` (analysis I1)

  Test it with a stand-in `fetch` (tests/unit/pssb-ollama.test.ts): chunks in order; the deadlines
  abort and throw `PssbTimeout`; an unreachable model throws `PssbUnreachable`.

**Checkpoint**: the settings exist, and every rule that doesn't need a model is tested.

---

## Phase 3: User Story 1 - Ask PSSB Anything (Priority: P1) 🎯 MVP

**Independent Test**: with the stand-in model, ask about a shirt, Dan, the designer and an order
problem. The replies are linked, prices are guarded, the support email or an excuse is given, and no
score appears.

- [X] T010 [P] [US1] Write failing tests/integration/pssb-route.test.ts (`POST /api/pssb` with a
  stand-in `fetch`):
  - `text` events and then a `done` event with linked HTML
  - a stand-in that names "$750.00" never shows it
  - redaction happens before the call (inspect what the stand-in received)
  - 404 when the switch is off
  - 400 for an empty or 501-character message, or 7 history turns
  - canned on unreachable, on no first words in 20 s, and past 45 s (fake timers)
  - nothing is logged (spy on `console`)
  - the stable prompt's hash change triggers one `warm`
  - `{ kind: "warm" }` answers 204 at once and warms only when the prompt changed (analysis U1)
  - an address that never answers gives the canned line within 5 s (SC-004, analysis I1)
- [X] T011 [US1] Implement src/app/api/pssb/route.ts per contracts/pssb.md (R6): the request-time
  read, the session's shopper, redaction, `buildFacts`, `streamChat`, `guardStream`, `linkShirts`,
  canned lines, deadlines and warming. T010 passes.
- [X] T012 [US1] Add `copy.pssb` to src/lib/copy.ts in the store voice:
  - the launcher's label, the placeholder, the "PSSB is judging you…" indicator
  - the unreachable and timeout lines, `priceGuard`
  - 12 openers, the sulk opener
  - 8 pompous excuses for Dan
  - "Add it" and its pressed state
  - `supportLine(email)`
- [X] T013 [US1] Implement src/components/Pssb.tsx (R8):
  - the launcher and the panel (desktop panel, phone bottom sheet), `data-steady`
  - the messages, streaming text then the linked final HTML
  - the "judging you…" indicator, the text box (500-character limit)
  - the conversation in `sessionStorage`, sent as the last 6 turns, plus the page
  - it sends `{ kind: "warm" }` on mount (analysis U1)
  - the launcher, bubble and panel have a solid backing behind their text, so the pipes check's "no
    text on a pipe" holds (analysis C1)

  Load it from src/components/StoreChrome.tsx with `next/dynamic` (`ssr: false`) only while the
  switch is on. Add 80 px of bottom padding to `<main>` while it's on. Move src/components/PurchasePops.tsx
  72 px up on desktop while it's on.
- [X] T014 [US1] Write tests/e2e/pssb-stub.ts, a deterministic Ollama stand-in on port 3101:
  - it streams words
  - it answers from keywords in the last message and from the facts in the system message (it echoes
    a named shirt's name, plants "$750.00" once, and answers "order" with the excuse instruction or
    the email it was given)

  Add it to playwright.config.ts's `webServer` list, and set `PSSB_MODEL_URL=http://localhost:3101`
  on the store's e2e server. Extend the shared fixture in tests/e2e/helpers.ts to push PSSB's
  approach clock an hour ahead (like `pushPopsAway`), so the journeys from 001–011 never meet a
  bubble. pssb.spec.ts opts in (analysis C1).
- [X] T015 [US1] Write tests/e2e/pssb.spec.ts (shopper projects). Open the launcher, then ask about
  Fractal Fury:
  - the reply links it, with no "$750.00", and "$1,350.00" appears via the link's own page
  - ask about an order with no email set: an excuse, and no "@"
  - the panel holds still under Extreme Awesomeness
  - at 360 px there's no sideways scroll

**Checkpoint**: PSSB answers in character from the store's facts.

---

## Phase 4: User Story 2 - He Comes to You (Priority: P2)

- [X] T016 [P] [US2] Write failing tests/unit/pssb-clock.test.ts for `nextApproach(now, last,
  blockers)` (pure, in src/lib/pssb/clock.ts): due at 120 s; held while there's text, a reply is
  streaming, a dialog is open, or the tab is hidden; a claim written before an approach stops a
  second tab. Then implement it.
- [X] T017 [US2] Add approaches to src/components/Pssb.tsx (R9):
  - the 5-second check against `localStorage["df-pssb-last"]` (try/catch around storage)
  - the bubble with its close (`df-pssb-closed`)
  - `kind: "approach"` requests with the page and `closedLast`; a canned opener if the model fails
- [X] T018 [US2] Extend tests/e2e/pssb.spec.ts with `page.clock`:
  - no bubble before 120 s, and a bubble about the current shirt at 120 s
  - closing it means the next opener sulks
  - text in the box holds the approach until it's cleared
  - an open shame dialog holds it
  - two tabs produce one approach

---

## Phase 5: User Story 3 - "Say the Word" (Priority: P3)

- [X] T019 [P] [US3] Write failing tests/unit/pssb-offer.test.ts (contracts/pssb.md table):
  - **Phrasings**: "add X in XL", "I'll take it, large" on a shirt page, "put the X in my cart" (no
    size: none, and ask for the size), size words and letters, no intent
  - **Refusals, with no offer**: BLAND with shaming on (BLAND with it off is offered), a resting
    shirt, somebody else's one of a kind, an unknown name, "XXXL"
  - **The maker's own one of a kind**: offered
  - **The price**: the offer's price is `resolvePrice`'s current one

  Then implement src/lib/pssb/offer.ts, returning `{ offer } | { tell: "ask-size" | "refuse-bland" |
  "unavailable" }`.
- [X] T020 [US3] Wire `detectOffer` into the route: its `tell` goes into the page part of the prompt,
  and the offer into `done`. Extend tests/integration/pssb-route.test.ts.
- [X] T021 [US3] Render the "Add it" button in src/components/Pssb.tsx:
  - it names the shirt, the size and the price (`data-steady`)
  - it posts `{ slug, size }` through the existing `addToCart` action, and shows its message in the
    chat
  - it updates the header count the way AddToCart does
- [X] T022 [US3] Extend tests/e2e/pssb.spec.ts:
  - "add Fractal Fury in L", then Add it: the cart has the line, and the header count rose
  - "add Beige Regret in M": no button, and the cart is unchanged
  - with fake scarcity on, the second add says "we found another one!"

---

## Phase 6: User Story 4 - He Knows You (Priority: P4)

- [X] T023 [P] [US4] Write failing tests/integration/pssb-facts-shopper.test.ts. For a signed-in
  shopper, the shopper part has:
  - his display name
  - his cart lines and subtotal
  - his last 5 orders (number, date, shirts, total)
  - his Flash Credit and per diem left, each to the cent

  And it never has his email, a card brand or last 4, or anything nosy. A guest gets only his cart.
  Every amount joins the allowed set.
- [X] T024 [US4] Implement the shopper part in src/lib/pssb/facts.ts, as a second system message after
  the stable prompt (R2). T023 passes.
- [X] T025 [US4] Extend tests/e2e/pssb.spec.ts: signed in with an order and credit, "how much credit
  do I have?" is answered with the exact balance (the stand-in echoes the credit fact).

---

## Phase 7: User Story 5 - Dan's Controls (Priority: P5)

- [X] T026 [P] [US5] Write failing tests/integration/admin-pssb.test.ts:
  - **`savePssb`**: saves only its columns; blank clears; refuses ftp, over 200 characters, and bad
    model names, with the refusal staying
  - **`saveSupportEmail`**: saves, clears, and refuses malformed or over-120 addresses
  - **`testPssb`**, against a stand-in `fetch`: "answered in N s: '…'", or "No answer from …"
  - **The door sweep**: all three join it
- [X] T027 [US5] Implement src/lib/actions/admin/pssb.ts, the wrappers in src/actions/admin.ts, and
  src/components/admin/PssbForm.tsx:
  - calm; placeholders show what's in effect
  - Test shows its result
  - `copy.console.settings.pssb`

  Add it to src/app/admin/settings/page.tsx. T026 passes.
- [X] T028 [P] [US5] (The pages are covered by e2e, T029: Vitest here runs only `.ts`, and pages have always been checked in e2e.) Write failing tests/integration/support-line.test.ts: with an email set, the
  order page and order history render `copy.pssb.supportLine` with a `mailto:` link; without one,
  nothing. Then add it to src/app/(store)/orders/[id]/page.tsx and src/app/(store)/account/page.tsx
  (`data-testid="support-line"`).
- [X] T029 [US5] Write tests/e2e/admin/pssb.spec.ts (admin projects):
  - set the support email: PSSB gives it, and the order page shows it; then clear it
  - Test answers (the stand-in); a wrong address says no answer; restore it
  - switch PSSB off: no launcher on the next store page; on again

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T030 [P] Write scripts/pssb-eval.ts (`npm run pssb:eval`) per R11: 30 questions and 20 attacks
  against the configured model. It reports per reply:
  - the first-words time and the total time
  - amounts outside the allowed set, before the guard
  - named shirts linked, and discount words
  - the sentence count, and whether it ends by pushing a shirt, the dial or the cart (FR-002,
    analysis C2)

  It summarizes against SC-001–SC-003, and writes transcripts to `data/pssb-eval-<date>.md`.
- [X] T031 Run `npm run pssb:eval` against `llama3.2:3b` here. Tune src/lib/pssb/persona.ts (brevity,
  condescension, encouragement, the excuse) until SC-001–SC-003 hold. Record the numbers and three
  sample exchanges in quickstart.md.
- [X] T032 [P] Update the README:
  - PSSB, and running Ollama (`ollama pull llama3.2:3b`)
  - the default endpoint and how to point it elsewhere (Settings or `PSSB_MODEL_URL` / `PSSB_MODEL`
    in `.env`, documented in `.env.example`)
  - the switch row, the support email, `pssb:eval`, and migration 0016
- [X] T033 [P] Hand-check `Pssb` and `PssbForm` in `next dev` under React Strict Mode, on a scratch
  database, with the real model: no console errors or warnings.
- [ ] T034 [P] Run Lighthouse on `/` and a shirt page with PSSB on (mobile, applied throttling): LCP ≤
  2.5 s, CLS ≤ 0.1. Record the numbers.
- [ ] T035 Run `npm run verify` until it's green. Record the counts and the coverage.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T009)**: T002 ∥ T003 → T004. T005 ∥ T006 ∥ T007. T008 needs T004. T009 is
  independent.
- **US1 (T010–T015)** needs Foundational. It's the MVP.
- **Then**: US2 (T016–T018), US3 (T019–T022) and US4 (T023–T025) need US1's route and component. US3's
  tests (T019) can be written any time.
- **US5 (T026–T029)** needs T004 only, and can run beside US1.
- **Polish (T030–T035)** comes last. T031 needs the real model.

## Implementation Strategy

1. **MVP**: Setup, Foundational, US1. PSSB answers in character from the store's facts.
2. **Then**: US5 (Dan's controls and the email), US3 (Add it), US2 (approaches), US4 (knows you).
3. **Polish**: tune against the real model, verify, converge, and a PR that ratifies constitution
   v5.1.0.

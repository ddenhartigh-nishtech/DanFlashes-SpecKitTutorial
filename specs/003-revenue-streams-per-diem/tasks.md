# Tasks: Revenue Streams & Per Diem Drain

**Input**: Design documents from `/specs/003-revenue-streams-per-diem/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/changes.md, quickstart.md

**Generated**: 2026-10-14, against constitution v4.0.0

**Tests**: REQUIRED (constitution VI), and written first.
- This feature changes Flash Credit and checkout, which are money paths. Every test task comes before
  its implementation and MUST be seen failing first.
- Every new `src/lib` module gets unit or integration tests. Time is always injected (`now`); no test
  sleeps.
- Every user story gets an e2e journey at desktop and phone viewports. e2e uses the default switches
  and never toggles them in the shared e2e database (002 R7).
- e2e runs a production build, so dev-only behavior (React Strict Mode) is checked by hand against
  `next dev` for the client components (002 R7, known gap).

**Money rule**: every amount is a two-decimal USD string handled through `src/lib/money.ts`. No task
may do money math with JS numbers.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: which user story the task belongs to (US1–US2)

---

## Phase 1: Setup

- [ ] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the schema, migration 0002, and the two settings that both stories need.

- [ ] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts. `validateSettings`
  must:
  - accept `perDiemDrain` (boolean) and `streamPayPeriodMinutes` (an integer ≥ 1)
  - report each when it is missing, the wrong type, `0`, or `1.5`
- [ ] T003 Add `perDiemDrain: boolean` and `streamPayPeriodMinutes: number` to `StoreSettings` in
  src/lib/catalog/types.ts, and to `settingsSchema` in src/lib/catalog/validate.ts as `z.boolean()`
  and `z.number().int().min(1)` (T002 passes)
- [ ] T004 Extend src/lib/db/schema.ts per data-model.md, then run
  `npx drizzle-kit generate --name revenue_streams` to produce drizzle/0002_revenue_streams.sql.
  - **New table `revenue_streams`**:
    - `preset` is one of `per_diem`, `expense_report`, `college_fund`, `garage_sale`,
      `second_mortgage`
    - `custom_name` is "1–40 characters after trimming"
    - CHECK "exactly one of `preset` and `custom_name` is set"
    - `amount_usd` uses the `money` CHECK, positive and not `0.00`
    - `schedule` is one of `recurring`, `one_time`, `whenever`
    - CHECK "`ends_at IS NULL OR ends_at > starts_at`"
    - `payments_made` defaults to 0 with CHECK `>= 0`
    - nullable `next_due_at` and `disconnected_at`
    - unique partial index `revenue_streams_one_per_diem` on (`user_id`) WHERE
      `preset = 'per_diem' AND disconnected_at IS NULL`
    - index on (`user_id`, `next_due_at`)
  - **`flash_credit_entries`**:
    - `kind` adds `stream`; `stream` rows need a positive amount, `stream_id` NOT NULL,
      `stream_payment_no >= 1`, and NULL order/card fields
    - nullable `stream_id` (FK, RESTRICT) and `stream_payment_no`
    - unique index on (`stream_id`, `stream_payment_no`)
  - **`orders`**: `per_diem_drained` integer (boolean), NOT NULL, default 0
  - **`store_settings`**: `per_diem_drain` (boolean, default 1) and `stream_pay_period_minutes`
    (integer, default 5, CHECK `>= 1`)
- [ ] T005 Wire the settings through, using `perDiemDrain: true, streamPayPeriodMinutes: 5` in both
  seed sources:
  - read and write both in `getSettings` / `saveSettings` in src/lib/data/settings.ts
  - add them to scripts/seed-data.ts and tests/fixtures/catalog.ts
  - extend `setSwitches` in tests/helpers/db.ts to accept `perDiemDrain`
- [ ] T006 Write tests/integration/migration-0002.test.ts:
  - **Setup**: build a database migrated through 0001 only, by migrating from a temp copy of
    `drizzle/` whose journal stops at 0001. Seed it, add a top-up, and place a Flash Credit order (a
    spend).
  - **Then** apply 0002 and check:
    - every ledger row and the balance are unchanged
    - both new settings read as their defaults
    - a `stream` entry without `stream_id` is rejected
    - a duplicate (`stream_id`, `stream_payment_no`) is rejected
    - a second connected per diem for the same user is rejected

**Checkpoint**: migration 0002 applies cleanly to an existing database, and the existing suite is still
green.

---

## Phase 3: User Story 1 - Connect a Revenue Stream (Priority: P1) 🎯 MVP

**Goal**: a signed-in shopper connects preset or custom streams with a schedule and a window. Payments
land in Flash Credit as their own entries, exactly once, settled whenever his money is shown. "Cash in"
pays on demand, and he can disconnect.

**Independent Test**: quickstart scenarios 1–8 and 11.

### Tests for User Story 1 (write first; they must fail)

- [ ] T007 [P] [US1] Unit tests in tests/unit/streams-schedule.test.ts for
  `duePayments({ schedule, nextDueAt, endsAt, now, periodMs, cap })`, table-driven. It returns the
  due ISO times and the new `nextDueAt`.
  - **Recurring with no end**: pays `nextDueAt`, `+p`, `+2p`… ≤ `now`.
  - **Recurring with an end**: the last tick ≤ `endsAt`, then `nextDueAt = null`.
  - **Start in the future**: nothing is due.
  - **The cap**: 30 at most; `nextDueAt` resumes after the last paid tick.
  - **A changed period**: applies from the stored `nextDueAt`.
  - **One time**: pays once, then null.
  - **Whenever**: never due.
- [ ] T008 [P] [US1] Unit tests in tests/unit/streams-validate.test.ts for
  `validateConnectInput(input, now)`:
  - **The name**: a preset key **or** a custom name trimmed to 1–40 characters → otherwise
    `INVALID_STREAM_NAME`.
  - **The amount**: dollars and cents, > `0.00` and ≤ `10000.00` → otherwise `INVALID_STREAM_AMOUNT`.
    Includes `0.00`, `10000.01`, `1.5` and `abc`.
  - **The schedule**: one of the three.
  - **The start**: empty means now; within 60 s in the past is clamped to now; earlier →
    `INVALID_WINDOW`.
  - **The end**: after the start, or `ongoing` → otherwise `INVALID_WINDOW`.
  - **Result**: normalized ISO strings on success.
- [ ] T009 [P] [US1] Integration tests in tests/integration/streams-settle.test.ts (seeded test
  database, injected `now`). Results are `Ok`/`Err` values with the error codes below.
  - **`connectStream`**:
    - a recurring or one-time stream starting now pays its first payment immediately; a whenever
      stream pays nothing
    - the stream row carries `next_due_at` and `payments_made`
  - **`settleStreams`**:
    - pays each due period exactly once; settling twice at the same `now` adds nothing
    - stops at `ends_at`
    - pays at most 30 per call and catches up on later calls
    - a period change affects only payments still to come
    - a future start pays nothing until then
    - one time pays once
    - a disconnected stream stops paying
    - each entry is `kind = 'stream'`, its `created_at` is the due time, and the balance equals the
      sum of the history
  - **Per diem rules**:
    - a running per diem blocks a second one (`PER_DIEM_EXISTS`)
    - an ended per diem is disconnected and superseded by the new one
  - **`cashIn`**:
    - pays exactly once per `paymentNo`; repeating it is a no-op success
    - outside the window, not "whenever", or disconnected → `NOT_CASHABLE`
    - someone else's stream → `STREAM_NOT_FOUND`
  - **`disconnectStream`**: someone else's stream or one already disconnected → `STREAM_NOT_FOUND`
  - **`listStreams`**: returns name, amount, schedule, window, next payment, cashable, and connected
- [ ] T010 [P] [US1] Integration tests in tests/integration/streams-actions.test.ts:
  - `connectStreamCore`, `disconnectStreamCore` and `cashInCore` with a `FakeCookieJar`
  - guests get `SIGN_IN_REQUIRED`
  - every error code passes through with its `copy.codes` message
  - success states
  - `placeOrder` settles first: a payment due before checkout can be spent, in the same transaction
- [ ] T011 [P] [US1] Integration test in tests/integration/demo-shopper.test.ts: with a `perDiem`
  configured, `ensureDemoShopper` connects an ongoing recurring per diem after the past order, and its
  first payment is in the history
- [ ] T012 [P] [US1] e2e journey in tests/e2e/revenue-streams.spec.ts (desktop and phone):
  - **Setup**: sign up, then open Account → Revenue Streams. It shows the empty state, and no field
    anywhere asks for bank, routing or payroll details (SC-007).
  - **Per diem**: connect Per Diem, $75.00, every payday, starts now, Ongoing. It's listed, and the
    Flash Credit history has a "Per Diem" +$75.00 entry.
  - **One time**: connect My Kid's College Fund, $2,000.00, just once. Exactly one +$2,000.00.
  - **Custom**: connect "Craig owes me", $40.00, whenever I want. Each separate Cash in press adds
    +$40.00.
  - **Validation**: $0.00 is refused in brand voice.
  - **Disconnect**: the label reads "Disconnect (and settle for less)", and after disconnecting the
    stream shows as disconnected.
  - **Phone**: no sideways scroll at 360px.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `duePayments` in src/lib/streams/schedule.ts: pure, no framework
  imports, with ISO strings and millisecond periods (T007 passes)
- [ ] T014 [P] [US1] Implement `validateConnectInput` in src/lib/streams/validate.ts, with the money
  checks through `money.ts` (T008 passes)
- [ ] T015 [US1] Add brand copy to src/lib/copy.ts, never explaining the joke:
  - `copy.streams`:
    - the 5 preset names
    - the 3 schedule names ("Every payday", "Just once", "Whenever I want")
    - form labels, the "Something else…" custom option, "Starts now", "Ongoing"
    - "Cash in", "Done", the next-payment wording
    - the history entry `(name) => …`
    - the empty state and the section heading
  - `copy.codes`: `INVALID_STREAM_NAME`, `INVALID_STREAM_AMOUNT`, `INVALID_WINDOW`,
    `PER_DIEM_EXISTS`, `STREAM_NOT_FOUND` and `NOT_CASHABLE`
  - `copy.shame.labels.disconnect`: `{ shamed: "Disconnect (and settle for less)", neutral:
    "Disconnect" }`. Add its row to tests/unit/shaming-labels.test.ts.
- [ ] T016 [US1] Implement src/lib/streams/streams.ts, the only module that writes `revenue_streams`
  or `stream` ledger entries:
  - `connectStream`: validate, supersede an ended per diem, insert, then settle
  - `disconnectStream`
  - `listStreams`
  - `settleStreams(db, userId, now)`: a cheap read first; then one `BEGIN IMMEDIATE` transaction that
    reads `streamPayPeriodMinutes` from settings, runs `duePayments`, inserts entries, and advances
    `next_due_at` / `payments_made`
  - `cashIn(db, userId, { streamId, paymentNo, now })`

  T009 passes.
- [ ] T017 [US1] Extend src/lib/flash-credit/ledger.ts. `LedgerEntry.kind` adds `"stream"` with
  `streamName`, which `listEntries` gets by joining `revenue_streams` (the preset name from copy, or
  the custom name).
- [ ] T018 [US1] Settle in `placeOrder` in src/lib/checkout/place-order.ts: call `settleStreams` inside
  its transaction before reading the balance, for signed-in shoppers. Settle in the checkout page
  (src/app/checkout/page.tsx) before it shows the balance.
- [ ] T019 [US1] Add action cores to src/lib/actions/streams.ts (`connectStreamCore`,
  `disconnectStreamCore`, `cashInCore`, using `sessionUser`, `field` and `failure`). Add thin
  `"use server"` adapters in src/actions/streams.ts that call `refresh()` on success. T010 passes.
- [ ] T020 [P] [US1] Create src/components/LocalTime.tsx (client): it formats an ISO time in the
  shopper's locale with `useSyncExternalStore`, showing UTC on the server and local time on the
  client, with no effect
- [ ] T021 [US1] Create src/components/ConnectStreamForm.tsx (client, `useActionState(connectStream)`):
  - a preset select plus "Something else…", which reveals the custom name input
  - the amount, and schedule radios
  - "Starts now" (checked by default), otherwise a `datetime-local` start
  - "Ongoing", otherwise a `datetime-local` end
  - a wrapper converts the local inputs to ISO UTC before dispatching
  - brand-voice errors shown in a `role="status"` region
- [ ] T022 [US1] Create src/components/CashInButton.tsx (client, `useActionState(cashIn)`, with hidden
  `streamId` and `paymentNo`) and src/components/StreamList.tsx (server):
  - each stream shows its name, amount, schedule, `LocalTime` window, and either its next payment,
    "Done", or the Cash in button
  - a Disconnect form labeled `labelFor("disconnect", confirmshaming)`
- [ ] T023 [US1] Add a request-time loader to src/app/_data/streams.ts (`connection()`, current user,
  `settleStreams`, `listStreams`). In src/app/account/page.tsx:
  - add the Revenue Streams section (`id="revenue-streams"`) with the form and the list
  - settle before reading the balance and history
  - label `stream` history entries with `copy.streams.historyEntry(name)`

  T012 passes.
- [ ] T024 [US1] Demo Dan's per diem (R9):
  - `DemoShopper` gains an optional `perDiem: { amountUsd }`
  - `ensureDemoShopper` in src/lib/data/demo-shopper.ts connects an ongoing recurring per diem after
    the past order
  - `DEMO_SHOPPER` in scripts/seed-data.ts gets `perDiem: { amountUsd: "75.00" }`

  T011 passes.

**Checkpoint**: US1 works on its own, and `npm run verify` is green.

---

## Phase 4: User Story 2 - The Per Diem Drain (Priority: P2)

**Goal**: while the drain is on, a floating gauge on every page shows the per diem left. The order
that takes it to $0 is flagged at placement and opens with a loud achievement. With the drain off,
none of this appears.

**Independent Test**: quickstart scenarios 9, 10 and 12.

### Tests for User Story 2 (write first; they must fail)

- [ ] T025 [P] [US2] Unit tests in tests/unit/streams-meter.test.ts:
  - `perDiemLeft(paidIn, spent)` is `max(0, Σpaid − Σspent)` in exact cents, never negative
  - `crossedToZero(before, after)` is true only when before > 0 and after = 0. Overshooting counts;
    starting at 0 doesn't.
- [ ] T026 [P] [US2] Integration tests in tests/integration/per-diem-drain.test.ts (injected `now`,
  `setSwitches`):
  - **`getPerDiemMeter`**:
    - null with no per diem, when it's disconnected, or with the drain off
    - counts only the current per diem's payments
    - subtracts orders at or after its start by card and Flash Credit, ignoring earlier ones
    - still meters an ended per diem
  - **`placeOrder` sets `per_diem_drained`**:
    - only on the crossing order; not on later orders while at $0
    - again after a payday refills the meter
    - never while the drain is off; turning it on later doesn't flag old orders
    - counts a payment that came due before checkout (settled in the transaction)
  - **Read model**: `getOrderForUser` exposes `perDiemDrained`.
- [ ] T027 [P] [US2] e2e journey in tests/e2e/per-diem-drain.spec.ts (desktop and phone):
  - **Setup**: sign up, connect a Per Diem of $500.00 (every payday, starts now, ongoing).
  - **The gauge**: reads "$500.00" on the home page and the listing, and causes no sideways scroll at
    360px.
  - **First order**: buy Geo Riot by card. The gauge drops by its total and there's no celebration.
  - **Second order**: buy Geo Riot again. The confirmation opens with the per diem achievement, and the
    gauge shows the achievement state.

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement `perDiemLeft` and `crossedToZero` in src/lib/streams/meter.ts: pure,
  through `money.ts` (T025 passes)
- [ ] T029 [US2] Add `getPerDiemMeter(db, userId, settings)` to src/lib/streams/streams.ts: null when
  the drain is off or there's no connected per diem; otherwise `{ leftUsd, drained, streamId }`
- [ ] T030 [US2] In `placeOrder` (src/lib/checkout/place-order.ts), after settling, read the meter
  before the order and compute it after. Store `per_diem_drained` when the drain is on and
  `crossedToZero`. Expose `perDiemDrained` in `getOrderForUser` / `listOrdersForUser` in
  src/lib/orders/orders.ts. T026 passes.
- [ ] T031 [US2] Add brand copy to src/lib/copy.ts, in voice:
  - `copy.meter`: "Per diem left", the achievement state at $0, the account line
  - `copy.celebration`: headline, body, badge
- [ ] T032 [US2] Create src/components/PerDiemMeter.tsx (server: `connection()`, current user,
  `settleStreams`, `getPerDiemMeter`):
  - a fixed bottom-left gauge linking to `/account#revenue-streams`, with `data-testid="per-diem-meter"`
  - the achievement styling at $0
  - loud tokens, fits at 360px

  Render it in `<Suspense fallback={null}>` from src/app/layout.tsx. Show the same value beside the
  Flash Credit balance in src/app/account/page.tsx.
- [ ] T033 [US2] Create src/components/PerDiemCelebration.tsx (loud, `data-testid="per-diem-achievement"`)
  and render it at the top of src/app/orders/[id]/page.tsx when `order.perDiemDrained` and
  `settings.perDiemDrain`. T027 passes.

**Checkpoint**: US1 and US2 both work, and `npm run verify` is green.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Update README.md:
  - add `per_diem_drain` and `stream_pay_period_minutes` to the switches table
  - note Demo Dan's per diem and the 1-minute period trick for demos
- [ ] T035 Check the client components (ConnectStreamForm, CashInButton, LocalTime) by hand against
  `next dev`: React Strict Mode, connect, Cash in, and disconnect (known e2e gap, 002 R7)
- [ ] T036 Constitution VII spot check: run Lighthouse (mobile) on `/account` with streams and on `/`
  with the gauge, against a production build. Both must have CLS ≤ 0.1 and LCP ≤ 2.5 s (applied
  throttling); the gauge must add no layout shift.
- [ ] T037 Run quickstart.md scenarios 1–13 and note the results
- [ ] T038 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including `src/lib/streams/`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks both stories:
  - T003 depends on T002.
  - T004 → T005 → T006.
- **US1 (T007–T024)** needs Foundational. Within it:
  - the tests (T007–T012) come first
  - T013 and T014 are independent
  - T015 comes before T016
  - T016 → T017 → T018 → T019
  - T020 is independent
  - T021 and T022 come after T019 and T020
  - T023 comes after T021 and T022
  - T024 comes after T016
- **US2 (T025–T033)** needs Foundational, and US1's T016 (streams exist to meter). Within it:
  - the tests (T025–T027) come first
  - T028 → T029 → T030
  - T031 comes before T032 and T033
- **Polish (T034–T038)** comes after both stories.

### User story dependencies

- **US1** is independent after Foundational.
- **US2** needs US1's streams (the per diem it meters), but it's testable on its own once a per diem
  can be connected.

### Parallel opportunities

- **Foundational**: T002 alongside the T004 chain.
- **US1 tests**: T007–T012 can run together. Then T013, T014 and T020 alongside the T015 → T019 chain.
- **US2 tests**: T025–T027 can run together, then T028 alongside the copy task T031.

## Parallel Example: User Story 1

```text
Task: "Unit tests for duePayments in tests/unit/streams-schedule.test.ts"
Task: "Unit tests for validateConnectInput in tests/unit/streams-validate.test.ts"
Task: "Integration tests for settlement in tests/integration/streams-settle.test.ts"
Task: "e2e connect / cash in / disconnect in tests/e2e/revenue-streams.spec.ts"
```

## Implementation Strategy

1. **MVP**: Setup, Foundational, then US1. Stop and validate with quickstart 1–8 and 11. Money now
   flows into Flash Credit from streams.
2. **Then** US2: the meter and the celebration.
3. **Then** Polish, converge, and open a PR to main.

## Notes

- The only writers of stream rows and stream ledger entries live in `src/lib/streams/streams.ts`.
- Each payment is exactly once by construction: the unique (stream, payment number) index.
- No new dependencies (constitution VIII).
- Commit after each phase checkpoint.

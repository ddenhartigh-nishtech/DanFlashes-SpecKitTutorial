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
- **[Story]**: which user story the task belongs to (US1–US3)

---

## Phase 1: Setup

- [X] T001 Run `npm run verify` on the branch before changing anything, and record the baseline for
  the PR

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the schema, migration 0002, and the two settings that both stories need.

- [X] T002 [P] Write failing unit tests in tests/unit/catalog-validate.test.ts. `validateSettings`
  must:
  - accept `perDiemDrain` (boolean) and `streamPayPeriodMinutes` (an integer ≥ 1)
  - report each when it is missing, the wrong type, `0`, or `1.5`
- [X] T003 Add `perDiemDrain: boolean` and `streamPayPeriodMinutes: number` to `StoreSettings` in
  src/lib/catalog/types.ts, and to `settingsSchema` in src/lib/catalog/validate.ts as `z.boolean()`
  and `z.number().int().min(1)` (T002 passes)
- [X] T004 Extend src/lib/db/schema.ts per data-model.md, then run
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
  - **`orders`**:
    - `per_diem_drained` integer (boolean), NOT NULL, default 0
    - `payment_method` adds `split`
    - `flash_credit_usd` text, NOT NULL, default `0.00`, with the `money` CHECK
    - the per-method payment CHECK replaces `orders_card_fields`: "`card`: `flash_credit_usd = '0.00'`
      and card fields set; `flash_credit`: `flash_credit_usd = total_usd` and no card fields; `split`:
      `flash_credit_usd` not `0.00` and card fields set"
    - **hand-edit the generated SQL** so the rebuild copies existing rows with `flash_credit_usd = CASE
      WHEN payment_method = 'flash_credit' THEN total_usd ELSE '0.00' END`; the column default alone
      would fail the new CHECK for existing Flash Credit orders
  - **`store_settings`**: `per_diem_drain` (boolean, default 1) and `stream_pay_period_minutes`
    (integer, default 5, CHECK `>= 1`)
- [X] T005 Wire the settings through, using `perDiemDrain: true, streamPayPeriodMinutes: 5` in both
  seed sources:
  - read and write both in `getSettings` / `saveSettings` in src/lib/data/settings.ts
  - add them to scripts/seed-data.ts and tests/fixtures/catalog.ts
  - extend `setSwitches` in tests/helpers/db.ts to accept `perDiemDrain`
- [X] T006 Write tests/integration/migration-0002.test.ts:
  - **Setup**: build a database migrated through 0001 only, by migrating from a temp copy of
    `drizzle/` whose journal stops at 0001. Seed it, add a top-up, and place a Flash Credit order (a
    spend).
  - **Then** apply 0002 and check:
    - every ledger row and the balance are unchanged
    - both new settings read as their defaults
    - a `stream` entry without `stream_id` is rejected
    - a duplicate (`stream_id`, `stream_payment_no`) is rejected
    - a second connected per diem for the same user is rejected
    - every existing order is unchanged through the `orders` rebuild, with `flash_credit_usd` backfilled
      (`0.00` for card orders, `total_usd` for Flash Credit orders)

**Checkpoint**: migration 0002 applies cleanly to an existing database, and the existing suite is still
green.

---

## Phase 3: User Story 1 - Connect a Revenue Stream (Priority: P1) 🎯 MVP

**Goal**: a signed-in shopper connects preset or custom streams with a schedule and a window. Payments
land in Flash Credit as their own entries, exactly once, settled whenever his money is shown. "Cash in"
pays on demand, and he can disconnect.

**Independent Test**: quickstart scenarios 1–8 and 11.

### Tests for User Story 1 (write first; they must fail)

- [X] T007 [P] [US1] Unit tests in tests/unit/streams-schedule.test.ts for
  `duePayments({ schedule, nextDueAt, endsAt, now, periodMs, cap })`, table-driven. It returns the
  due ISO times and the new `nextDueAt`.
  - **Recurring with no end**: pays `nextDueAt`, `+p`, `+2p`… ≤ `now`.
  - **Recurring with an end**: the last tick ≤ `endsAt`, then `nextDueAt = null`.
  - **Start in the future**: nothing is due.
  - **The cap**: 30 at most; `nextDueAt` resumes after the last paid tick.
  - **A changed period**: applies from the stored `nextDueAt`.
  - **One time**: pays once, then null.
  - **Whenever**: never due.
- [X] T008 [P] [US1] Unit tests in tests/unit/streams-validate.test.ts for
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
- [X] T009 [P] [US1] Integration tests in tests/integration/streams-settle.test.ts (seeded test
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
- [X] T010 [P] [US1] Integration tests in tests/integration/streams-actions.test.ts:
  - `connectStreamCore`, `disconnectStreamCore` and `cashInCore` with a `FakeCookieJar`
  - guests get `SIGN_IN_REQUIRED`
  - every error code passes through with its `copy.codes` message
  - success states
  - `placeOrder` settles first: a payment due before checkout can be spent, in the same transaction
- [X] T011 [P] [US1] Integration test in tests/integration/demo-shopper.test.ts: with a `perDiem`
  configured, `ensureDemoShopper` connects an ongoing recurring per diem after the past order, and its
  first payment is in the history
- [X] T012 [P] [US1] e2e journey in tests/e2e/revenue-streams.spec.ts (desktop and phone):
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
  - **SC-001**: each connection is a single form submission, which is the "three steps or fewer"
    check.

### Implementation for User Story 1

- [X] T013 [P] [US1] Implement `duePayments` in src/lib/streams/schedule.ts: pure, no framework
  imports, with ISO strings and millisecond periods (T007 passes)
- [X] T014 [P] [US1] Implement `validateConnectInput` in src/lib/streams/validate.ts, with the money
  checks through `money.ts` (T008 passes)
- [X] T015 [US1] Add brand copy to src/lib/copy.ts, never explaining the joke:
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
- [X] T016 [US1] Implement src/lib/streams/streams.ts, the only module that writes `revenue_streams`
  or `stream` ledger entries:
  - `connectStream`: validate, supersede an ended per diem, insert, then settle
  - `disconnectStream`
  - `listStreams`
  - `settleStreams(db, userId, now)`: a cheap read first; then `db.transaction(...)` that reads
    `streamPayPeriodMinutes` from settings, runs `duePayments`, inserts entries, and advances
    `next_due_at` / `payments_made`. When it's called inside `placeOrder`'s transaction, this becomes
    a savepoint within that transaction rather than a second transaction, which SQLite doesn't allow.
  - `cashIn(db, userId, { streamId, paymentNo, now })`

  T009 passes.
- [X] T017 [US1] Extend src/lib/flash-credit/ledger.ts. `LedgerEntry.kind` adds `"stream"` with
  `streamName`, which `listEntries` gets by joining `revenue_streams` (the preset name from copy, or
  the custom name).
- [X] T018 [US1] Settle in `placeOrder` in src/lib/checkout/place-order.ts: call `settleStreams` inside
  its transaction before reading the balance, for signed-in shoppers. Settle in the checkout page
  (src/app/checkout/page.tsx) before it shows the balance.
- [X] T019 [US1] Add action cores to src/lib/actions/streams.ts (`connectStreamCore`,
  `disconnectStreamCore`, `cashInCore`, using `sessionUser`, `field` and `failure`). Add thin
  `"use server"` adapters in src/actions/streams.ts that call `refresh()` on success. T010 passes.
- [X] T020 [P] [US1] Create src/components/LocalTime.tsx (client): it formats an ISO time in the
  shopper's locale with `useSyncExternalStore`, showing UTC on the server and local time on the
  client, with no effect
- [X] T021 [US1] Create src/components/ConnectStreamForm.tsx (client, `useActionState(connectStream)`):
  - a preset select plus "Something else…", which reveals the custom name input
  - the amount, and schedule radios
  - "Starts now" (checked by default), otherwise a `datetime-local` start
  - "Ongoing", otherwise a `datetime-local` end
  - a wrapper converts the local inputs to ISO UTC before dispatching
  - brand-voice errors shown in a `role="status"` region
- [X] T022 [US1] Create src/components/CashInButton.tsx (client, `useActionState(cashIn)`, with hidden
  `streamId` and `paymentNo`) and src/components/StreamList.tsx (server):
  - each stream shows its name, amount, schedule, `LocalTime` window, and either its next payment,
    "Done", or the Cash in button
  - a Disconnect form labeled `labelFor("disconnect", confirmshaming)`
- [X] T023 [US1] Add a request-time loader to src/app/_data/streams.ts (`connection()`, current user,
  `settleStreams`, `listStreams`). In src/app/account/page.tsx:
  - add the Revenue Streams section (`id="revenue-streams"`) with the form and the list
  - settle before reading the balance and history
  - label `stream` history entries with `copy.streams.historyEntry(name)`

  T012 passes.
- [X] T024 [US1] Demo Dan's per diem (R9):
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

- [X] T025 [P] [US2] Unit tests in tests/unit/streams-meter.test.ts:
  - `perDiemLeft(paidIn, spent)` is `max(0, Σpaid − Σspent)` in exact cents, never negative
  - `crossedToZero(before, after)` is true only when before > 0 and after = 0. Overshooting counts;
    starting at 0 doesn't.
- [X] T026 [P] [US2] Integration tests in tests/integration/per-diem-drain.test.ts (injected `now`,
  `setSwitches`):
  - **`getPerDiemMeter`**:
    - null with no per diem, when it's disconnected, or with the drain off
    - counts only the current per diem's payments
    - subtracts orders at or after its start by card and Flash Credit, ignoring earlier ones
    - still meters an ended per diem
    - returns `drained: true` at $0, and false again after a payday refills it (FR-014)
  - **`placeOrder` sets `per_diem_drained`**:
    - only on the crossing order; not on later orders while at $0
    - again after a payday refills the meter
    - never while the drain is off; turning it on later doesn't flag old orders
    - counts a payment that came due before checkout (settled in the transaction)
  - **Read model**: `getOrderForUser` exposes `perDiemDrained`.
- [X] T027 [P] [US2] e2e journey in tests/e2e/per-diem-drain.spec.ts (desktop and phone):
  - **Setup**: sign up, connect a Per Diem of $500.00 (every payday, starts now, ongoing).
  - **The gauge**: reads "$500.00" on the home page and the listing, and causes no sideways scroll at
    360px.
  - **First order**: buy Geo Riot by card. The gauge drops by its total and there's no celebration.
  - **Second order**: buy Geo Riot again. The confirmation opens with the per diem achievement, and the
    gauge shows the achievement state.
  - **Guests**: in a fresh, signed-out context, `/` has no `per-diem-meter` (spec Edge Case "Signed
    out").

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement `perDiemLeft` and `crossedToZero` in src/lib/streams/meter.ts: pure,
  through `money.ts` (T025 passes)
- [X] T029 [US2] Add `getPerDiemMeter(db, userId, settings)` to src/lib/streams/streams.ts: null when
  the drain is off or there's no connected per diem; otherwise `{ leftUsd, drained, streamId }`
- [X] T030 [US2] In `placeOrder` (src/lib/checkout/place-order.ts), after settling, read the meter
  before the order and compute it after. Store `per_diem_drained` when the drain is on and
  `crossedToZero`. Expose `perDiemDrained` in `getOrderForUser` / `listOrdersForUser` in
  src/lib/orders/orders.ts. T026 passes.
- [X] T031 [US2] Add brand copy to src/lib/copy.ts, in voice:
  - `copy.meter`: "Per diem left", the achievement state at $0, the account line
  - `copy.celebration`: headline, body, badge
- [X] T032 [US2] Create src/components/PerDiemMeter.tsx (server: `connection()`, current user,
  `settleStreams`, `getPerDiemMeter`):
  - a fixed bottom-left gauge linking to `/account#revenue-streams`, with `data-testid="per-diem-meter"`
  - the achievement styling at $0
  - loud tokens, fits at 360px

  Render it in `<Suspense fallback={null}>` from src/app/layout.tsx. Show the same value beside the
  Flash Credit balance in src/app/account/page.tsx.
- [X] T033 [US2] Create src/components/PerDiemCelebration.tsx (loud, `data-testid="per-diem-achievement"`)
  and render it at the top of src/app/orders/[id]/page.tsx when `order.perDiemDrained` and
  `settings.perDiemDrain`. T027 passes.

**Checkpoint**: US1 and US2 both work, and `npm run verify` is green.

---

## Phase 5: User Story 3 - Split the Bill (Priority: P3)

**Goal**: at checkout he applies his Flash Credit. If it covers the total, that's the order. If not,
the store shows the split, makes him confirm putting the rest on a card, and lets him remove the credit
at any time before placing. The server recomputes the split, and any refusal writes nothing.

**Independent Test**: quickstart scenarios 14–18.

### Tests for User Story 3 (write first; they must fail)

- [X] T034 [P] [US3] Unit tests in tests/unit/split-payment.test.ts, table-driven, in exact cents,
  for `splitPayment(balanceUsd, totalUsd)`:
  - balance ≥ total → `{ creditUsd: total, cardUsd: "0.00", method: "flash_credit" }`
  - 0 < balance < total → `split`, with credit plus card equal to the total
  - balance `0.00` → `card`
  - credit never exceeds the balance or the total
- [X] T035 [P] [US3] Integration tests in tests/integration/place-order-split.test.ts:
  - **Happy path**: one spend entry of `−creditUsd` linked to the order; `payment_method = 'split'`,
    `flash_credit_usd = creditUsd`, and the card's brand and last four. The balance after equals the
    balance before minus the credit; credit plus card equals the total; the ledger equals its sum.
  - **No confirmation**: without `confirmSplit` → `SPLIT_CONFIRMATION_REQUIRED` with the split, and
    nothing written.
  - **The balance moved**: a stream payment settling inside the transaction, or a top-up, makes the
    live credit differ from `expectedCreditUsd` → `CREDIT_CHANGED` with the new split, and nothing
    written.
  - **A bad card in a split**: nothing deducted.
  - **Balance equals the total**: a `flash_credit` order with no confirmation needed.
  - **`useFlashCredit` off**: card only.
  - **A replayed token**: the same order, charged once.
  - **The per diem meter** counts the full total of a split order.
  - **`getOrderForUser`** exposes `payment: { method: "split", creditUsd, brand, last4, cardUsd }`.
- [X] T036 [P] [US3] Update the tests that the new `placeOrder` inputs break (`method` becomes
  `useFlashCredit` / `expectedCreditUsd` / `confirmSplit`; `INSUFFICIENT_FLASH_CREDIT` is retired):
  - tests/integration/place-order-card.test.ts and tests/integration/place-order-flash-credit.test.ts:
    its short-balance case becomes a split that needs confirmation
  - tests/integration/actions-auth-checkout.test.ts
  - tests/e2e/flash-credit-checkout.spec.ts: "a short balance is refused" becomes "a short balance
    asks to confirm the split"
  - tests/e2e/card-checkout.spec.ts, wherever it picks a payment method
- [X] T037 [P] [US3] e2e journey in tests/e2e/split-checkout.spec.ts (desktop and phone), the
  constitution's happy path for this payment method:
  1. Sign up, top up $100.00, add Geo Riot, open checkout.
  2. Apply my Flash Credit: Flash Credit −$100.00, $244.61 on the card.
  3. Try to place it unconfirmed: it isn't placed.
  4. Remove Flash Credit: card only.
  5. Apply again, tick "Put the remaining $244.61 on my card", enter the test card, place it.
  6. The confirmation shows both parts. The account balance is $0.00, with a −$100.00 history entry
     linked to the order.
  7. No sideways scroll at 360px.
  8. A fresh account with $0.00 sees the top-up / Revenue Streams prompt instead of Apply (US3-7).

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement `splitPayment` in src/lib/checkout/split.ts: pure, through
  `money.ts` (T034 passes)
- [X] T039 [US3] Change `placeOrder` in src/lib/checkout/place-order.ts:
  - **Inputs**: `useFlashCredit`, `expectedCreditUsd` and `confirmSplit` replace `method`.
  - **Order of checks**: after settling, compute `splitPayment` from the live balance, then:
    1. `CREDIT_CHANGED` when the credit differs from `expectedCreditUsd`
    2. `SPLIT_CONFIRMATION_REQUIRED` for an unconfirmed split
    3. validate the card when `cardUsd > 0`
  - **Writes**: insert the order with `payment_method` and `flash_credit_usd`, and write the spend
    entry for `−creditUsd` when it's above $0.
  - **Retire** `INSUFFICIENT_FLASH_CREDIT`.
  - **Callers**: update `ensureDemoShopper` in src/lib/data/demo-shopper.ts.

  T035 and the integration part of T036 pass.
- [X] T040 [US3] In src/lib/orders/orders.ts, `OrderPayment` gains a `split` variant
  (`creditUsd`, `brand`, `last4`, `cardUsd`), with the card portion derived as
  `total_usd − flash_credit_usd` through `money.ts`
- [X] T041 [US3] Add brand copy to src/lib/copy.ts, in voice:
  - `copy.checkout`:
    - `applyCredit(available)` and `removeCredit`
    - the breakdown lines `creditLine(amount)` / `cardLine(amount)`
    - `confirmSplit(cardUsd)`, "Put the remaining $Y on my card"
    - the $0-balance prompt, linking to top-up and Revenue Streams
  - `copy.order.paidSplit(credit, brand, last4, card)`
  - `copy.codes`: add `SPLIT_CONFIRMATION_REQUIRED` and `CREDIT_CHANGED`, and remove
    `INSUFFICIENT_FLASH_CREDIT`
- [X] T042 [US3] In src/lib/actions/checkout.ts, parse `useFlashCredit`, `expectedCreditUsd` and
  `confirmSplit`, and pass the new codes through with their `creditUsd` / `cardUsd` in the action
  state
- [X] T043 [US3] In src/components/CheckoutForm.tsx (client), replace the method radios with:
  - an "Apply my Flash Credit" / "Remove Flash Credit" toggle, disabled with the prompt at $0
  - the breakdown
  - the card fields whenever a card portion remains
  - a **required** confirmation checkbox when splitting
  - hidden `useFlashCredit` and `expectedCreditUsd` fields
  - on `CREDIT_CHANGED`: show the new split and clear the confirmation

  src/app/checkout/page.tsx passes the settled balance. T037 and the e2e part of T036 pass.
- [X] T044 [US3] Render the split payment line on the order confirmation (src/app/orders/[id]/page.tsx)
  and in the account's order history (src/app/account/page.tsx) with `copy.order.paidSplit`

**Checkpoint**: all three stories work independently, and `npm run verify` is green.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T045 [P] Update README.md:
  - add `per_diem_drain` to the switches table (`stream_pay_period_minutes` was dropped in 0003:
    each recurring top-off has its own interval)
  - note Demo Dan's per diem and the 1-minute interval trick for demos
  - describe split checkout in a sentence
  - **Result (2026-10-14).** Done. The switches table also covers the drain's "left" amounts and
    achievements (US4), and the shamed Disconnect label.
- [X] T046 Check the client components (ConnectStreamForm, CashInButton, LocalTime, CheckoutForm) by
  hand against `next dev`: React Strict Mode, connect, Cash in, disconnect, apply and remove credit,
  and place a split (known e2e gap, 002 R7)
  - **Result (2026-10-14).** Clean. Driven with Playwright against `next dev` on a throwaway
    database: three kinds of connect, a double-pressed Cash in (paid once), disconnect, the
    collapsible sections, apply, remove and re-apply credit, and a confirmed split. There were no
    console errors or warnings, and nothing in the server log.
- [X] T047 Constitution VII spot check: run Lighthouse (mobile) on `/account` with streams, on `/` with
  the gauge, and on `/checkout`, against a production build. All must have CLS ≤ 0.1 and LCP ≤ 2.5 s
  (applied throttling); the gauge must add no layout shift.
  - **Result (2026-10-14, Lighthouse 13.5.0, mobile, production build, signed in with three
    streams and a shirt in the cart).** Applied throttling:
    - `/account`: LCP 2.2 s, CLS 0, TBT 310 ms
    - `/checkout`: LCP 2.0 s, CLS 0, TBT 190 ms
    - `/` with the gauge: LCP 2.3 s and 2.2 s, CLS 0.005
    - `/` as a guest (no gauge): LCP 2.2 s and 2.1 s, CLS 0.005
    - 001's baseline for `/` was 2.2 s.

    The gauge adds no shift: CLS is the same with and without it. A first run of `/` measured
    3.0 s. That was the first request after the server started; it didn't repeat.
- [X] T048 Run quickstart.md scenarios 1–21 and note the results
  - **Result (2026-10-14).** All 21 pass, as 002 did them: scripted through the UI with Playwright
    against the production build on a fresh `db:reset` copy, with the switches flipped directly in
    SQLite. Scenario 4 waited for the real 1-minute top-off, and scenario 11 re-checked a minute
    later that the disconnected per diem stayed quiet.
  - **Bug found and fixed.** The connect form was a React form action, so React reset its fields
    after every connect, but not its React state:
    - a refusal wiped what he had typed
    - "Starts now" showed ticked while its required start field was still on screen, so the
      browser silently blocked every later submit
    - after "Just once", the radio showed "Recurring top-off" while the form still behaved as
      one-time

    ConnectStreamForm now submits by hand, which keeps his input on a refusal, and remounts on
    success, which resets the fields and controls together. There is a regression test in
    tests/e2e/revenue-streams.spec.ts. The quickstart's row order and its scenario 1 wording were
    also corrected.
- [X] T049 Run `npm run format`, then `npm run verify`. It must be fully green, with line coverage
  ≥ 90% on `src/lib`, including `src/lib/streams/` and `src/lib/checkout/split.ts`.
  - **Result (2026-10-14).** Green: 467 unit and integration tests at 94.9% line coverage
    (`src/lib/streams/allocation.ts` and `streams.ts` are at 100%), and 70 e2e tests.

---

## Phase 7: Owner Feedback (2026-10-14, after US1)

- [X] T050 Stop a big cart subtotal spilling out of its summary box (a 001 bug). `PriceTag` gets
  `max-w-full` and `overflow-wrap: anywhere`, so any amount wraps inside its container; the cart
  summary row wraps the tag under its label. Test: tests/e2e/zoom-and-cart.spec.ts "a huge subtotal
  stays inside its box" (99 × Dan's Masterpiece; no descendant crosses the box's edges).
- [X] T051 Label a one-time stream's submit "Apply it" (and its success "Applied…"). Other schedules
  keep "Connect it". The changes are in src/components/ConnectStreamForm.tsx and
  src/lib/actions/streams.ts. Test: tests/e2e/revenue-streams.spec.ts.
- [X] T052 Make the schedules self-explanatory:
  - each radio shows a hint, with "Every payday" spelling out the store's pay period
    (`copy.streams.period`: "5 minutes", "hour", "2 days")
  - the stream list shows "Every payday · every 5 minutes"
  - the period reaches the form and list from `store_settings.stream_pay_period_minutes`

  Tests: tests/unit/streams-period.test.ts and the e2e journey.
- [X] T053 Remove the $10,000.00 ceiling on a stream's amount ("the sky should be the limit"). Any
  amount ≥ $0.01 is accepted. This supersedes the ceiling in T008's description, and FR-002 is
  updated. Tests: tests/unit/streams-validate.test.ts (a $1,000,000,000,000.99 stream is accepted).

## Phase 8: Owner Feedback, Round 2 (2026-10-14)

- [X] T054 Make the neon cart's glow follow its color: the `neon` utility (src/app/globals.css)
  draws its drop-shadows in `currentColor`, so on hover the glow turns yellow with the icon. Test:
  tests/e2e/about.spec.ts (the glow contains the icon's color, at rest and on hover).
- [X] T055 Make Flash Credit and Purchase history collapse at their headers, with a ▼ indicator that
  flips: `CollapsibleSection` (native `<details open>`) in src/app/account/page.tsx. Test:
  tests/e2e/account-sections.spec.ts.
- [X] T056 Replace the store-wide pay period with a per-stream interval:
  - "Every payday" becomes **Recurring top-off**, every N (1–1,000) minutes, hours, days or weeks;
    the first top-off sets the day and time it repeats on
  - migration 0003 adds `revenue_streams.interval_minutes` and drops
    `store_settings.stream_pay_period_minutes`. Its generated SQL was hand-edited to reorder the
    rebuilds and copy the old period into existing recurring streams.
  - the CHECKs are NULL-proof: SQLite passes a CHECK that evaluates to NULL, so the interval and
    stream payment number rules say `IS NOT NULL`
  - `INVALID_INTERVAL` is a new error code
  - Demo Dan's per diem tops off daily

  Tests: tests/unit/streams-validate.test.ts, tests/integration/streams-settle.test.ts ("each
  recurring top-off pays on its own interval"), tests/integration/migration-0003.test.ts, and the e2e
  journey.
- [X] T057 Make one-time streams final: "Just once" is applied immediately (no start, end, or window)
  and arrives greyed out as paid in full. Only recurring and "whenever" streams can be disconnected
  (`canDisconnect`; `disconnectStream` refuses a one-time stream). Tests: settle and e2e.

- [X] T058 Make Revenue Streams collapse at its header too, the same `CollapsibleSection` as Flash Credit and Purchase history (owner request). Test: tests/e2e/account-sections.spec.ts covers all three.

## Phase 9: User Story 4 - Drain Them All (Priority: P4, owner addition)

**Goal**: every order is counted against the current per diem first, then the oldest money from his
other streams. Each stream shows what's left, and every stream an order empties unlocks its own
achievement, stacked on the confirmation.

**Independent Test**: quickstart scenarios 19–21.

### Tests for User Story 4 (write first; they must fail)

- [X] T059 [P] [US4] Unit tests in tests/unit/streams-allocation.test.ts for the pure engine. Port US2's meter
  cases to it, plus:
  - the per diem is consumed before any other stream
  - other money is consumed oldest first, and at a tie the earlier payment counts as older
  - overspending isn't carried into a later lot
  - `drainedBy` lists every stream taken from above $0 to $0, including several at once, and
    nothing already at $0
- [X] T060 [P] [US4] Integration tests in tests/integration/drain-them-all.test.ts:
  - the order draws on per diem, then College Fund, then Garage Sale
  - `getStreamBalances` reports each stream's left, and is null with the drain off
  - `placeOrder` writes `order_drains` for the other streams it empties (several in one order) and
    `per_diem_drained` for the current per diem
  - nothing is recorded with the drain off
  - the read model exposes every achievement
  - migration 0004 creates `order_drains`
- [X] T061 [P] [US4] e2e journey in tests/e2e/drain-them-all.spec.ts (desktop and phone), per quickstart 19–21:
  - the "left" amounts
  - the first order unlocks the per diem achievement only
  - the second order stacks two achievement cards
  - no sideways scroll at 360px

### Implementation for User Story 4

- [X] T062 [US4] Implement src/lib/streams/allocation.ts (`replay`, `drainedBy`, `leftByStream`; T059 passes)
  and delete src/lib/streams/meter.ts. `getPerDiemMeter` and a new `getStreamBalances` in
  src/lib/streams/streams.ts use the engine.
- [X] T063 [US4] Add `order_drains` to src/lib/db/schema.ts and generate migration 0004
  (`npx drizzle-kit generate --name order_drains`)
- [X] T064 [US4] In `placeOrder`, compute `drainedBy` after settling. Record `per_diem_drained` for the
  current per diem and `order_drains` rows for the rest (drain on). `OrderView` gains `drainedStreams`
  (name and preset). T060 passes.
- [X] T065 [US4] Add copy (`copy.achievements`: one line per preset, a custom-name line, a "GONE"
  badge, and a "N achievements" header). Show what's left on each stream record (StreamList, from
  `getStreamBalances` on the account page). PerDiemCelebration becomes an achievement stack on the
  order confirmation. Update tests/e2e/per-diem-drain.spec.ts to the stack. T061 passes.

**Checkpoint**: all four stories work, and `npm run verify` is green.

## Phase 10: Owner Feedback, Round 4 (2026-10-15): GONE Pops in the Corner

**Goal**: every stream that runs dry pops in the bottom-left corner, stacked above the per diem
gauge. Every GONE pop, the per diem's included, has an (x) that clears it until that stream drains
again (FR-029, FR-030, R13).

**Independent Test**: quickstart scenarios 22–23.

### Tests (write first; they must fail)

- [ ] T066 [P] Integration tests in tests/integration/drain-pops.test.ts:
  - `getDrainPops` lists every non-per-diem stream at $0 after paying in, disconnected ones
    included, but no per diem; it's null with the drain off
  - `dismissDrain` clears one pop
  - paying in again and draining again brings it back
  - a stale `paymentNo` can't clear a newer drain
  - the per diem meter reports `dismissed`
  - `dismissDrainCore` refuses guests (`SIGN_IN_REQUIRED`) and unknown streams or payments
    (`STREAM_NOT_FOUND`)
  - migration 0005 adds `dismissed_drain_payment_no` as NULL on existing rows
- [ ] T067 [P] Extend tests/e2e/drain-them-all.spec.ts (quickstart 22–23):
  - after the second order, the corner stacks the per diem's GONE gauge with the College Fund and
    Garage Sale pops above it
  - Garage Sale's (x) clears it, and it stays cleared after a reload and on another page
  - the per diem's (x) clears the gauge
  - no sideways scroll at 360px

### Implementation

- [ ] T068 Add `dismissed_drain_payment_no` (integer, nullable) to `revenue_streams` in
  src/lib/db/schema.ts, and generate migration 0005 (`npx drizzle-kit generate --name drain_dismissals`)
- [ ] T069 In src/lib/streams/streams.ts:
  - `getDrainPops`
  - `dismissDrain` (keeps the highest `paymentNo`; refuses one the stream hasn't made)
  - `getPerDiemMeter` gains `paymentNo` and `dismissed`

  Then `dismissDrainCore` in src/lib/actions/streams.ts, and the `dismissDrain` adapter in
  src/actions/streams.ts. Copy: the (x)'s label in voice. T066 passes.
- [ ] T070 The corner (src/components/PerDiemMeter.tsx, loaded by src/app/_data/streams.ts): one fixed
  bottom-left stack. The per diem gauge is at the bottom, with a GONE pop above it for each drained
  stream, and an (x) form on every GONE. T067 passes; then `npm run verify`.

**Checkpoint**: quickstart 1–23 hold, and `npm run verify` is green.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001)** comes first.
- **Foundational (T002–T006)** blocks every story:
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
- **US3 (T034–T044)** needs Foundational and US1's T018 (`placeOrder` settles first). Within it:
  - the tests (T034–T037) come first
  - T038 → T039 → T040
  - T041 comes before T042, T043 and T044
  - T039 and T030 both edit `placeOrder`, so do them one after the other (US2 first)
- **US4 (T059–T065)** needs US2 (the per diem drain). Within it, the tests (T059–T061) come first, then
  T062 → T063 → T064 → T065.
- **Polish (T045–T049)** comes after all four stories.
- **Round 4 (T066–T070)** needs US4's allocation engine. Tests (T066, T067) first, then T068 → T069 →
  T070.

### User story dependencies

- **US1** is independent after Foundational.
- **US2** needs US1's streams (the per diem it meters), but it's testable on its own once a per diem
  can be connected.
- **US3** is independent of US2. It needs only a Flash Credit balance, which a 001 top-up can supply.

### Parallel opportunities

- **Foundational**: T002 alongside the T004 chain.
- **US1 tests**: T007–T012 can run together. Then T013, T014 and T020 alongside the T015 → T019 chain.
- **US2 tests**: T025–T027 can run together, then T028 alongside the copy task T031.
- **US3 tests**: T034–T037 can run together, then T038 alongside the copy task T041.

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
3. **Then** US3: the split checkout.
4. **Then** Polish, converge, and open a PR to main.

## Notes

- The only writers of stream rows and stream ledger entries live in `src/lib/streams/streams.ts`.
- Each payment is exactly once by construction: the unique (stream, payment number) index.
- No new dependencies (constitution VIII).
- Commit after each phase checkpoint.

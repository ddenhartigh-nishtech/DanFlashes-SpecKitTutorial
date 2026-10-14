# Research: Revenue Streams & Per Diem Drain (003)

**Date**: 2026-10-14 | **Plan**: [plan.md](./plan.md)

003 reuses the 001/002 stack and patterns unchanged:
- Next.js 16 with Cache Components; request-time reads via `connection()` inside `<Suspense>`
- SQLite and Drizzle
- framework-free logic in `src/lib/`, with thin Server Actions
- exact-money strings via `src/lib/money.ts`
- brand copy in `src/lib/copy.ts`

Only the new decisions are recorded here.

## R1. Storage

- **Decision**: migration `0002` makes four changes.
  1. A new `revenue_streams` table: one row per connected stream, holding its preset or custom name,
     amount, schedule, window (`starts_at`, `ends_at`), the next payment's due time (`next_due_at`),
     a running `payments_made` count, and `disconnected_at`.
  2. `flash_credit_entries` gains a third kind, `stream`, with `stream_id` and `stream_payment_no`,
     and a **unique index on (`stream_id`, `stream_payment_no`)**.
  3. `orders` gains `per_diem_drained` (R5).
  4. `store_settings` gains `per_diem_drain` (default on) and `stream_pay_period_minutes` (default 5,
     at least 1).
- **Rationale**: every stream payment is a ledger entry (constitution), and the unique index makes
  "credited exactly once" (SC-003) a database guarantee, not just a code path. A partial unique index
  enforces one connected per diem per shopper (FR-010).
- **Note**: SQLite can't alter a CHECK constraint, so drizzle-kit rebuilds `flash_credit_entries`
  (copy, drop, rename). A migration test on a populated database at migration 0001 must show every
  existing entry and every balance unchanged.
- **Alternatives**: computing payments on read without storing them was rejected, because the ledger
  must contain them. Storing the schedule as a cron string was rejected as overkill for three
  schedules.

## R2. Lazy settlement instead of a background job

- **Decision**: `settleStreams(db, userId, now)` pays every recurring or one-time payment that has
  come due, inside one transaction.
  - It walks `next_due_at` forward one interval at a time, using the stream's own
    `interval_minutes` (owner, round 2; it replaced 0002's store-wide pay period).
  - It stops at `ends_at`, at `now`, or after **30 payments per stream per call** (the catch-up cap).
  - Each payment's history `created_at` is its due time, so the history reads in true order.
  - It runs at request time wherever money or the meter is shown: the per diem gauge on every page for
    signed-in shoppers, the account, the checkout page, and inside `placeOrder` before the balance and
    meter are read.
  - A cheap read (`next_due_at <= now` for this user) skips the write transaction when nothing is due.
- **Rationale**:
  - There's no worker process to host a cron (constitution VIII; no serverless assumptions).
  - "Automatic" only has to be true whenever he looks, and he only sees money when a page renders.
  - Settling before `placeOrder` reads the balance means due money can always be spent.
- **Alternatives**: a `setInterval` in the server process was rejected because it's lost on restart,
  doubles up in dev, and ignores shoppers who aren't online. The owner rejected a "Payday" button in
  place of automation (Q2).

## R3. Schedule math is pure

- **Decision**: `src/lib/streams/schedule.ts` exposes
  `duePayments({ schedule, nextDueAt, endsAt, now, periodMs, cap })`. It returns the due times to pay
  and the new `nextDueAt`, which is null once the stream is finished.
  - **Recurring**: pays at `nextDueAt`, then every period, while the time is ≤ `endsAt` (if any) and
    ≤ `now`.
  - **One time**: `nextDueAt = starts_at`. It pays once, then `nextDueAt = null`.
  - **Whenever**: never due on a schedule.
- **Rationale**: it's table-testable without a database or a clock (constitution VI).

## R4. "Cash in" pays exactly once per press

- **Decision**: the Cash in form carries `paymentNo` = `payments_made + 1` as rendered. The insert
  uses that number, so the unique index (R1) turns a double press or a replayed request into a no-op
  success.
  - The press is refused outside the window, for a disconnected stream, or for a schedule other than
    "whenever".
- **Rationale**: this reuses R1's guarantee, so no separate token table is needed. It's the same idea
  as 001's checkout token.

## R5. The meter and the celebration

- **Decision**:
  - **Meter**: pure `perDiemLeft(paidIn: Usd[], spent: Usd[])`, which is `max(0, Σpaid − Σspent)` in
    exact money.
    - `paidIn` is the payments of the shopper's connected per diem.
    - `spent` is his order totals with `created_at ≥ starts_at`, by any payment method.
    - `getPerDiemMeter(db, userId)` returns null when there's no connected per diem.
  - **Celebration**: `placeOrder` already runs in one `BEGIN IMMEDIATE` transaction. It settles, reads
    the meter before the order, and computes the meter after it. It stores
    `orders.per_diem_drained = 1` only when the drain switch is on, the meter was above $0, and the
    order takes it to $0 (`crossedToZero(before, after)`). The order confirmation shows the
    celebration when that flag is set and the drain is still on.
- **Rationale**:
  - Fires exactly once per crossing (SC-005).
  - Re-armed naturally when a payday refills the meter (FR-015).
  - Never replays for orders placed while the switch was off.
- **Alternatives**: detecting the crossing at render time from history was rejected; it's fragile
  across refills and switch flips.

## R6. Where the meter lives

- **Decision**: a server component `PerDiemMeter`, rendered from the root layout inside
  `<Suspense>` like `CartCount`.
  - It's a **floating gauge** with `position: fixed`, pinned to the bottom-left corner of every page,
    desktop and phone.
  - It shows "Per diem left $X.XX", or an achievement state at $0, and links to
    `/account#revenue-streams`.
  - The account shows the same value next to the Flash Credit balance.
  - It updates on navigation; there's no client polling.
- **Rationale**:
  - It streams in after the shell, so anything in the page flow (like a strip under the header) would
    push every page down when it arrives: a layout shift on every page for signed-in shoppers
    (constitution VII). A fixed element shifts nothing.
  - It's always in view, and it doesn't crowd the phone header bar, which already holds the logo, the
    cart and Menu.
  - No polling keeps it cheap (constitution VII, VIII).
- **Alternatives**: a strip under the header was rejected for the layout shift. A pill in the header bar
  was rejected because it doesn't fit beside the logo, cart and Menu at 360px.

## R7. Time windows and local time

- **Decision**: windows are stored as ISO-8601 UTC strings, which sort and compare correctly in
  SQLite.
  - `ConnectStreamForm` (client) uses `datetime-local` inputs. A wrapper around the action converts
    them to ISO UTC in the browser before submitting.
  - "Starts now" is a checkbox, checked by default. "Ongoing" is a checkbox; otherwise an end is
    required.
  - The server re-validates: start ≥ now − 60 s (then clamped to now), and end > start.
  - Displayed times use a tiny `LocalTime` client component built on `useSyncExternalStore`, which
    shows UTC on the server and local time after hydration, with no mismatch and no effect.
- **Rationale**: only the browser knows his time zone. The server stays authoritative on validation.

## R8. Names, presets, and copy

- **Decision**:
  - Preset keys are `per_diem`, `expense_report`, `college_fund`, `garage_sale` and
    `second_mortgage`. Their display names live in `copy.streams.presets`.
  - Custom names are 1–40 characters after trimming, stored as-is, and rendered escaped.
  - `copy.shame.labels` gains `disconnect`, so `labelFor("disconnect", confirmshaming)` from 002 is
    reused (FR-009).
- **Rationale**: presets are brand copy, like 002's bio, and shoppers can't change them. Custom names
  are the shopper's own data.

## R9. Demo data

- **Decision**: Demo Dan gets an ongoing $75.00 recurring per diem in `DEMO_SHOPPER`, so a fresh
  `db:reset` shows the meter after sign-in.
- **Rationale**: the demo should show the feature without setup. It's created through the same
  connect function the UI uses.

## R11. Split payment (US3, owner addition)

- **Decision**:
  - **Pure math**: `splitPayment(balanceUsd, totalUsd)` in `src/lib/checkout/split.ts` returns
    `{ creditUsd: min(balance, total), cardUsd: total − credit, method: "card" | "flash_credit" | "split" }`,
    in exact money.
  - **`placeOrder` inputs**: `useFlashCredit`, `expectedCreditUsd` (what he was shown), and
    `confirmSplit` replace `method`. Card fields are required whenever `cardUsd > 0`.
  - **Inside the existing transaction**, after settling streams:
    1. recompute the split from the live balance
    2. a different `creditUsd` → `CREDIT_CHANGED` (returns the new split)
    3. a split without `confirmSplit` → `SPLIT_CONFIRMATION_REQUIRED`
    4. validate the card
    5. insert the order with its method and `flash_credit_usd`
    6. write one spend entry for `−creditUsd` when it's above $0

    Any refusal writes nothing.
  - **Retired**: `INSUFFICIENT_FLASH_CREDIT` can no longer happen; a short balance becomes a split.
  - **UI**: `CheckoutForm` replaces the method radios with an "Apply my Flash Credit" toggle.
    - Applying shows the breakdown. When there's a remainder, it shows the card fields and a required
      "Put the remaining $Y on my card" checkbox.
    - "Remove Flash Credit" flips the toggle back.
- **Rationale**:
  - The server stays authoritative: the split is never taken from the client, only compared with it
    (constitution).
  - Confirmation is enforced on the server, not only by the form (SC-010).
  - It's one spend entry, so the ledger rules are unchanged.
- **Alternatives**: typing a partial credit amount was rejected; the owner didn't ask for it, and it
  adds validation. Auto-splitting without asking was rejected; the owner asked for confirmation.

## R10. Testing

- **Unit**:
  - `duePayments` tables: recurring with and without an end, the cap, a period change, one time,
    whenever, and a start in the future
  - `perDiemLeft` / `crossedToZero`
  - connect-input validation (name, amount bounds, window rules)
  - settings validation
- **Integration** (an injected `now`, no sleeping):
  - settlement is exactly-once, including two settles at the same instant
  - the window end and the cap are respected
  - one time and whenever behave as specified
  - disconnect stops payments
  - a period change affects only future payments
  - Cash in is idempotent and window-checked
  - one connected per diem, and a new per diem supersedes an ended one
  - `placeOrder` settles first and sets `per_diem_drained` only on a crossing with the drain on
  - the balance always equals the history
  - migration 0002 preserves existing ledger rows
  - the actions pass error codes through
  - split checkout:
    - `splitPayment` tables
    - `placeOrder` split happy path, `SPLIT_CONFIRMATION_REQUIRED`, `CREDIT_CHANGED` (a payday or
      top-up between render and submit), an invalid card, an exactly-covered total, a replay
    - the per diem counts the full total of a split order
- **End-to-end** (default switches, never toggled in the shared database):
  - connect a per diem starting now → first payment in the history and the gauge
  - a one-time stream and Cash in
  - drain to $0 with Flash Credit → celebration on the confirmation, achievement on the gauge
  - the disconnect label, desktop and phone
  - a split checkout: apply, confirm, remove, place (constitution: a happy path per payment method)
  - Recurring payments after the first, and "drain off", are covered by integration tests.

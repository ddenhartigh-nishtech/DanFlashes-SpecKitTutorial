# Implementation Plan: Revenue Streams & Per Diem Drain

**Branch**: `003-revenue-streams-per-diem` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-revenue-streams-per-diem/spec.md`

## Summary

Three additions on top of 001's Flash Credit ledger:

1. **Revenue streams.** A signed-in shopper connects money sources: a per diem, absurd presets, or
   custom names. Each has an amount, a schedule (a recurring top-off on his own interval, just once, or
   whenever I want), and a
   window (start, plus an end or ongoing).
   - Payments land in Flash Credit as their own ledger entries.
   - Recurring and one-time payments are **settled lazily**: whenever his money or meter is shown,
     every payment that has come due is credited, exactly once (guaranteed by a unique index), up to
     30 per stream per visit.
   - "Cash in" pays on demand, once per press.
2. **The per diem drain.** While the new switch is on, a floating gauge on every page shows his per
   diem left: per diem paid in, minus his orders since it started, floored at $0. The order that takes
   it to $0 is flagged at placement and opens with a loud achievement.
3. **Split the bill** (owner addition). At checkout he applies his Flash Credit: his whole balance, up
   to the total. If that doesn't cover it, the store shows the split, requires him to confirm putting
   the rest on a card, and lets him remove the credit before placing. The server recomputes the split
   from the live balance and refuses, writing nothing, on any mismatch.
4. **Drain them all** (owner addition). Every order is counted against the per diem first, then the
   oldest money from his other streams (one pure allocation engine, R12). Each stream shows what's
   left, and each one that runs dry unlocks its own achievement, recorded with the order.
5. **GONE pops** (owner, round 4). Every stream that runs dry also pops in the corner, stacked above
   the per diem gauge. Every GONE pop has an (x) that clears it for his account, per drain (R13,
   migration 0005). Since round 5 the corner is the whole celebration: the confirmation has no
   achievement box. Since round 6, each GONE also carries its joke line, behind
   `store_settings.drain_jokes` (on by default, migration 0006).

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components)

**Primary Dependencies**: unchanged; no new packages. Local-time display uses the browser's `Intl`.

**Storage**: SQLite. One migration (`0002`):
- a new `revenue_streams` table
- a `stream` kind on `flash_credit_entries`, with a unique index on (stream, payment number)
- `orders.per_diem_drained`, a `split` payment method, and `flash_credit_usd` (rebuilt with a hand
  backfill)
- a `store_settings` column for the drain switch
- migration `0003`: each recurring stream's own `interval_minutes` (it replaces the store-wide pay
  period), plus NULL-proof CHECKs

See [data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration, with an injected `now`) and Playwright (e2e, desktop and
phone, production build). `npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Constraints**:
- Every change to a balance is a ledger entry, and the balance is never negative (constitution).
- Exact money.
- Settlement is idempotent under concurrent requests.
- No bank or payroll fields.
- e2e never toggles switches in the shared database (002 R7).

All Technical Context items are resolved. See [research.md](./research.md) (R1–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 003 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | Preset names, the meter, the celebration and the history copy all live in `copy.ts`, in voice. The joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | No pricing change. No score is shown. | ✅ | ✅ |
| III | Relentlessly Vibrant | Unaffected. | ✅ | ✅ |
| IV | Shamelessly Manipulative | The per diem drain gets its own named switch, `store_settings.per_diem_drain`, on by default. Disconnect reuses 002's confirmshaming switch. Revenue streams are a store feature, not a tactic (spec Assumptions). | ✅ | ✅ |
| V | Maximum Visual Assault | The gauge and the celebration use the loud tokens, responsive from 360px. | ✅ | ✅ |
| VI | Fully Tested | Money paths are test-first: schedule math, the meter, settlement, Cash in, and placeOrder's flag. Exactly-once is tested under simultaneous settles. `src/lib` stays ≥ 90%. Each story gets an e2e journey, including the constitution's happy path for the new split payment. | ✅ | ✅ |
| VII | Fast | Settlement skips its write transaction when nothing is due. There's no polling. The meter streams in Suspense as a fixed-position gauge, so it causes no layout shift. | ✅ | ✅ |
| VIII | Simple Code | No new packages, no background worker. Pure schedule and meter functions plus one settlement function. | ✅ | ✅ |
| C | Commerce constraints | **Ledger**: each stream payment is its own positive entry, the balance is the exact sum, and duplicates are impossible (unique index). **Fake money**: streams are props with no bank details. **Exact money**: amounts go through `money.ts`. **Server-authoritative**: placeOrder settles, re-reads the balance, and recomputes the split in its transaction; the client's split is only compared, never trusted, and confirmation is enforced on the server. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → **analyze** (mandatory: this touches Flash Credit and checkout) → implement → converge; merge by PR. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). See Complexity Tracking for the one design choice
worth flagging.

## Project Structure

### Documentation (this feature)

```text
specs/003-revenue-streams-per-diem/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001/002 routes and actions
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001/002 layout)

```text
drizzle/0002_*.sql                    # new: revenue_streams, ledger stream kind, orders flag, settings
scripts/seed-data.ts                  # DEMO_SHOPPER gains an ongoing per diem (R9); settings defaults
src/
├── actions/streams.ts                # new: connectStream, disconnectStream, cashIn ("use server" adapters)
├── app/
│   ├── account/page.tsx              # Revenue Streams section; meter beside the balance; settles first
│   ├── checkout/page.tsx             # settles before showing the balance; passes it to the split form
│   ├── orders/[id]/page.tsx          # per diem achievement when per_diem_drained
│   ├── layout.tsx                    # renders <PerDiemMeter/> in Suspense on every page
│   └── _data/streams.ts              # new: request-time loaders (settle + meter + list)
├── components/
│   ├── ConnectStreamForm.tsx         # new (client): preset/custom, amount, schedule, window → ISO UTC
│   ├── StreamList.tsx                # new: streams, next payment, Cash in, Disconnect (confirmshaming)
│   ├── CashInButton.tsx              # new (client): useActionState(cashIn) with paymentNo
│   ├── CheckoutForm.tsx              # apply/remove Flash Credit, split breakdown, required confirmation
│   ├── DrainCorner.tsx               # new (server): the bottom-left corner: per diem gauge + GONE pops, each with an (x) (R13)
│   └── LocalTime.tsx                 # new (client): useSyncExternalStore local-time formatting
└── lib/
    ├── streams/schedule.ts           # new (pure): duePayments
    ├── streams/allocation.ts         # new (pure): lots + orders → left per stream, drains (R12)
    ├── streams/validate.ts           # new (pure): connect-input validation
    ├── streams/streams.ts            # new: connect, disconnect, list, settleStreams, cashIn, getPerDiemMeter
    ├── actions/streams.ts            # new: framework-free action cores
    ├── flash-credit/ledger.ts        # LedgerEntry gains kind "stream" + stream name
    ├── checkout/place-order.ts       # settle first; split recompute + checks; per_diem_drained flag
    ├── checkout/split.ts             # new (pure): splitPayment
    ├── actions/checkout.ts           # parses the split inputs; new codes
    ├── orders/orders.ts              # perDiemDrained and the split payment in the read model
    ├── data/demo-shopper.ts          # ensureDemoShopper connects the demo per diem
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # new settings + tables
    ├── shaming/labels.ts             # "disconnect" label key
    └── copy.ts                       # streams, meter, celebration, codes, disconnect labels
tests/
├── unit/streams-schedule.test.ts, unit/streams-meter.test.ts, unit/streams-validate.test.ts   # new
├── unit/split-payment.test.ts, integration/place-order-split.test.ts                        # new (US3)
├── integration/streams-settle.test.ts, integration/streams-actions.test.ts                    # new
├── integration/per-diem-drain.test.ts, integration/migration-0002.test.ts                     # new
└── e2e/revenue-streams.spec.ts, e2e/per-diem-drain.spec.ts, e2e/split-checkout.spec.ts       # new
    # updated: place-order-card/-flash-credit, actions-auth-checkout, flash-credit-checkout, card-checkout
```

**Structure Decision**: this extends the single project. Stream logic sits in `src/lib/streams/`: pure
schedule and meter math, plus one data module, the only code that writes `revenue_streams` and stream
ledger entries. It follows the `flash-credit/ledger.ts` precedent for writes to Flash Credit.

## Complexity Tracking

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Settlement **writes during page renders** (the gauge, account, checkout) | "Automatic" payments must already be there when he looks. There's no worker process (VIII), and the write is idempotent (unique index) and skipped when nothing is due. | A background timer is lost on restart, doubles up in dev, and ignores offline shoppers. The owner rejected a manual "Payday" button (Q2). |

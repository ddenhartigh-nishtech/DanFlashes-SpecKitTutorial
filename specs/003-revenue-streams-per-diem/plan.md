# Implementation Plan: Revenue Streams & Per Diem Drain

**Branch**: `003-revenue-streams-per-diem` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-revenue-streams-per-diem/spec.md`

## Summary

Two additions on top of 001's Flash Credit ledger:

1. **Revenue streams.** A signed-in shopper connects money sources: a per diem, absurd presets, or
   custom names. Each has an amount, a schedule (every payday, just once, or whenever I want), and a
   window (start, plus an end or ongoing).
   - Payments land in Flash Credit as their own ledger entries.
   - Recurring and one-time payments are **settled lazily**: whenever his money or meter is shown,
     every payment that has come due is credited, exactly once (guaranteed by a unique index), up to
     30 per stream per visit.
   - "Cash in" pays on demand, once per press.
2. **The per diem drain.** While the new switch is on, a meter strip under the header shows his per
   diem left: per diem paid in, minus his orders since it started, floored at $0. The order that takes
   it to $0 is flagged at placement and opens with a loud achievement.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components)

**Primary Dependencies**: unchanged; no new packages. Local-time display uses the browser's `Intl`.

**Storage**: SQLite. One migration (`0002`):
- a new `revenue_streams` table
- a `stream` kind on `flash_credit_entries`, with a unique index on (stream, payment number)
- `orders.per_diem_drained`
- two `store_settings` columns: the drain switch and the pay period

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
| V | Maximum Visual Assault | The meter strip and the celebration use the loud tokens, responsive from 360px. | ✅ | ✅ |
| VI | Fully Tested | Money paths are test-first: schedule math, the meter, settlement, Cash in, and placeOrder's flag. Exactly-once is tested under simultaneous settles. `src/lib` stays ≥ 90%. Each story gets an e2e journey. | ✅ | ✅ |
| VII | Fast | Settlement skips its write transaction when nothing is due. There's no polling, and the meter streams in Suspense like the cart count. | ✅ | ✅ |
| VIII | Simple Code | No new packages, no background worker. Pure schedule and meter functions plus one settlement function. | ✅ | ✅ |
| C | Commerce constraints | **Ledger**: each stream payment is its own positive entry, the balance is the exact sum, and duplicates are impossible (unique index). **Fake money**: streams are props with no bank details. **Exact money**: amounts go through `money.ts`. **Server-authoritative**: placeOrder settles and re-reads the balance in its transaction. | ✅ | ✅ |
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
│   ├── checkout/page.tsx             # settles before showing the balance
│   ├── orders/[id]/page.tsx          # per diem achievement when per_diem_drained
│   └── _data/streams.ts              # new: request-time loaders (settle + meter + list)
├── components/
│   ├── ConnectStreamForm.tsx         # new (client): preset/custom, amount, schedule, window → ISO UTC
│   ├── StreamList.tsx                # new: streams, next payment, Cash in, Disconnect (confirmshaming)
│   ├── CashInButton.tsx              # new (client): useActionState(cashIn) with paymentNo
│   ├── PerDiemMeter.tsx              # new (server): strip under the header; settles first
│   ├── PerDiemCelebration.tsx        # new: the $0 achievement
│   ├── LocalTime.tsx                 # new (client): useSyncExternalStore local-time formatting
│   └── SiteHeader.tsx                # renders <PerDiemMeter/> in Suspense
└── lib/
    ├── streams/schedule.ts           # new (pure): duePayments
    ├── streams/meter.ts              # new (pure): perDiemLeft, crossedToZero
    ├── streams/validate.ts           # new (pure): connect-input validation
    ├── streams/streams.ts            # new: connect, disconnect, list, settleStreams, cashIn, getPerDiemMeter
    ├── actions/streams.ts            # new: framework-free action cores
    ├── flash-credit/ledger.ts        # LedgerEntry gains kind "stream" + stream name
    ├── checkout/place-order.ts       # settle first; per_diem_drained flag
    ├── orders/orders.ts              # perDiemDrained in the read model
    ├── data/demo-shopper.ts          # ensureDemoShopper connects the demo per diem
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # new settings + tables
    ├── shaming/labels.ts             # "disconnect" label key
    └── copy.ts                       # streams, meter, celebration, codes, disconnect labels
tests/
├── unit/streams-schedule.test.ts, unit/streams-meter.test.ts, unit/streams-validate.test.ts   # new
├── integration/streams-settle.test.ts, integration/streams-actions.test.ts                    # new
├── integration/per-diem-drain.test.ts, integration/migration-0002.test.ts                     # new
└── e2e/revenue-streams.spec.ts, e2e/per-diem-drain.spec.ts                                     # new
```

**Structure Decision**: this extends the single project. Stream logic sits in `src/lib/streams/`: pure
schedule and meter math, plus one data module, the only code that writes `revenue_streams` and stream
ledger entries. It follows the `flash-credit/ledger.ts` precedent for writes to Flash Credit.

## Complexity Tracking

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Settlement **writes during page renders** (header meter, account, checkout) | "Automatic" payments must already be there when he looks. There's no worker process (VIII), and the write is idempotent (unique index) and skipped when nothing is due. | A background timer is lost on restart, doubles up in dev, and ignores offline shoppers. The owner rejected a manual "Payday" button (Q2). |

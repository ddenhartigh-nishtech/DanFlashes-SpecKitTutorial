# Implementation Plan: Checkout Squeeze

**Branch**: `005-checkout-squeeze` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-checkout-squeeze/spec.md`

## Summary

Two manipulation tactics, each behind its own new switch in `store_settings` (migration 0008, both
on by default).

1. **Pre-checked add-ons.** The owner keeps a list of absurd extras in SQLite: name, pitch, decline
   line, and a flat price per order.
   - Checkout lists every offered add-on, already ticked, every time it opens. A live total
     includes them, and unticking shows that add-on's decline line while confirmshaming is on.
   - `placeOrder` re-resolves the ticked add-ons from the database. A retired or repriced one refuses
     the order with `PRICE_CHANGED`.
   - On success it snapshots each add-on onto the order (`order_add_ons`). The total is the shirts
     plus the add-ons, exactly, by card, Flash Credit, or a split. The confirmation and the history
     show the add-on lines.
2. **Roach-motel cart.** A client gate, `ConfirmTwice`, sits in front of the cart's Remove form, and
   in front of the quantity form when the quantity goes down: "Are you sure?" → "Are you sure sure?"
   → only then does the form submit. The yes buttons follow confirmshaming. Adding and raising
   pass straight through, and store-made removals never see it.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19)

**Primary Dependencies**: unchanged; no new packages. The questions use the native `<dialog>`, like
002's ShameDialog.

**Storage**: SQLite. One migration, `0008`:
- a new `add_ons` table (owner data)
- a new `order_add_ons` table (snapshots)
- two `store_settings` switches

The starting add-ons come from the seed fixture, through `seedCatalog`, which is idempotent. See
[data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration) and Playwright (e2e, desktop and phone, production build).
`npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Constraints**:
- Exact money, and the total always equals the shirts plus the add-ons.
- Server-authoritative prices: add-on prices are never taken from the client.
- The ledger and split rules from 003 are unchanged.
- e2e never toggles switches in the shared database (002 R7).

All Technical Context items are resolved. See [research.md](./research.md) (R1–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 005 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | The two questions and their buttons live in `copy`. The add-ons' names, pitches and decline lines are owner data, seeded in voice. The joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | Shirt pricing is untouched. Add-ons are flat, owner-set extras, not shirts. No score is shown. | ✅ | ✅ |
| III | Relentlessly Vibrant | Unaffected. | ✅ | ✅ |
| IV | Shamelessly Manipulative | Both are named in the constitution's own list: pre-checked add-ons and the roach-motel cart. Each has its own switch, on by default. Decline lines and yes labels reuse 002's confirmshaming. | ✅ | ✅ |
| V | Maximum Visual Assault | Loud tokens, responsive from 360px. The dialogs fit a phone, and the keep button is always reachable. | ✅ | ✅ |
| VI | Fully Tested | **Add-ons are a money path, so they're test-first**: `orderTotals`, `placeOrder` with add-ons by every payment method, the refusals, and the snapshots. Checkout keeps an e2e happy path per payment method, with add-ons included. `src/lib` stays ≥ 90%. Each story has an e2e journey. | ✅ | ✅ |
| VII | Fast | The add-on list is one small query. The dialogs render only when opened. Lighthouse is re-checked on `/checkout` and `/cart` in polish. | ✅ | ✅ |
| VIII | Simple Code | No packages. One pure totals function, one data module, and one reusable client gate. The roach motel adds no server code. | ✅ | ✅ |
| C | Commerce constraints | **Server-authoritative pricing**: `placeOrder` re-resolves add-ons in its transaction and refuses on any mismatch. **Exact money**: through `money.ts`. **Ledger**: a Flash Credit spend is still one entry for the applied credit, now over a bigger total. **Fake money**: unchanged. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → **analyze** (mandatory: this touches checkout, the cart, and add-ons) → implement → converge; merge by PR. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). There are no deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/005-checkout-squeeze/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001–004 routes and actions
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001–004 layout)

```text
drizzle/0008_*.sql                    # new: add_ons, order_add_ons, two switches
scripts/seed-data.ts                  # the four starting add-ons; settings defaults gain both switches
src/
├── app/
│   ├── checkout/page.tsx             # passes add-ons, subtotal and confirmshaming to the form
│   └── cart/page.tsx                 # Remove goes through ConfirmTwice
├── components/
│   ├── CheckoutForm.tsx              # add-on checkboxes (ticked), decline lines, live total, hidden addOnId
│   ├── OrderSummary.tsx              # add-on rows (confirmation, history); optional Total row
│   ├── ConfirmTwice.tsx              # new (client): "Are you sure?" → "Are you sure sure?" gate
│   └── CartQuantityForm.tsx          # decreases go through ConfirmTwice
└── lib/
    ├── checkout/totals.ts            # new (pure): orderTotals
    ├── checkout/place-order.ts       # addOnIds: re-resolve, refuse on mismatch, snapshot order_add_ons
    ├── actions/checkout.ts           # parses addOnId fields
    ├── data/add-ons.ts               # new: listOfferedAddOns, resolveAddOns
    ├── data/seed.ts                  # seedCatalog seeds add-ons (idempotent)
    ├── orders/orders.ts              # OrderView.addOns
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # tables + switches
    ├── shaming/labels.ts             # removeYes, lowerYes
    └── copy.ts                       # roachMotel questions and keep label
tests/
├── unit/checkout-totals.test.ts                                                   # new
├── integration/add-ons.test.ts, integration/place-order-add-ons.test.ts           # new
├── integration/migration-0008.test.ts, integration/settings-switches.test.ts      # new / updated
└── e2e/add-ons.spec.ts, e2e/roach-motel.spec.ts                                   # new
    # updated: e2e helpers (untickAddOns, confirmTwice, buyByCard), journeys that check out or remove
```

**Structure Decision**: this extends the single project. The money is in a pure function
(`totals.ts`) and inside `placeOrder`'s transaction. Add-on data has its own module, which is the
only reader of `add_ons`. The roach motel is UI-only, a reusable gate that changes no server
behavior.

## Complexity Tracking

No constitution deviations. One choice is worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| The roach motel is **client-side friction only**; the server's remove and update are unchanged | It's a UI tactic, and the spec asks for friction, not enforcement. 001's cart actions and tests stay exactly as they are. | A server-side two-step token adds a protocol for a joke, and breaks every existing removal path and test. |

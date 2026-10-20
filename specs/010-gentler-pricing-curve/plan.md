# Implementation Plan: Gentler Pricing Curve

**Branch**: `010-gentler-pricing-curve` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-gentler-pricing-curve/spec.md`

## Summary

The one MSRP function becomes a straight line:

**MSRP = base price + price per point × score**, worked out exactly with the store's money helpers,
at $50.00 + $25.00 a point by default.

- **The dials** (R2): `store_settings` swaps its three exponential dials (start price, anchor score,
  doubling interval) for two, `msrp_base_price_usd` and `msrp_per_point_usd`.
- **The reprice** (R3): migration 0014 puts every store on the default line and clears every price
  Dan set himself. The store prices from the score at read time, so every shirt, cart and checkout
  follows at once. Orders keep their snapshots.
- **A real shirt's start** (R4): the BLAND rule now compares against the MSRP where the first tier
  above BLAND begins ($300.00 at score 10), since there's no start-price dial.
- **The dial** (R5): its top becomes a constant, 10,249 (today's top), so 007's dial plays exactly
  as it does now. The generator refuses above it with the same joke.
- **Dan's Office** (R6, R7): the tuning form has two fields and keeps its before/after preview. The
  pricing chart's price axis becomes linear, so the MSRP draws straight. The shirt editor's preview
  loses its "can't price" branch.
- **The seed** (R8) matches an upgraded store.
- **Constitution v5.0.0** (R10, draft, ratified by merging): II says "straight line" instead of
  "exponential" (MAJOR), and III defines a real shirt's starting price.

## Technical Context

**Language/Version**: unchanged (TypeScript on Node 22, Next.js 16.4 with Cache Components, React
19, Tailwind 4)

**Primary Dependencies**: unchanged. No new packages. big.js already does the exact arithmetic.

**Storage**: SQLite. Migration `0014`:
- a hand-edited rebuild of `store_settings` (two new dial columns, three dropped)
- `UPDATE shirts SET final_price_usd = NULL`

See [data-model.md](./data-model.md).

**Testing**:
- **Vitest, money first**: the MSRP table and properties over at least 1,000 random tunings,
  `resolvePrice`, the BLAND rule, the migration (orders identical to the cent), the checkout guard
  across a retune.
- **Then**: the dial's fixed top, the generator's refusal, the chart's linear axis, and the tuning
  action.
- **Playwright**: the existing journeys at their new prices, a console tuning round trip, and the
  pricing chart.

**Target Platform / Project Type**: unchanged (one Next.js web app)

**Performance Goals**: unchanged. The MSRP is cheaper than before (two big.js operations instead of
a float power), and the dial's top art is the same 785 KB.

**Constraints**:
- **One MSRP function.** Every price, preview and chart point calls `msrpUsd`.
- **Exact money.** No floats in a price.
- **Server-authoritative checkout.**
- **Orders are history.** The migration never touches them.
- **Shoppers never see a score.**
- **Calm console, loud store.**
- **360px.**

**Scale/Scope**:
- 1 migration
- about 15 source files: the MSRP, settings, validate, dial, generator, chart, tuning form,
  preview, seed and copy
- 12 test files that name the old dials, plus the tests that hard-code old prices
- the constitution, the README, and 3 earlier specs

All Technical Context items are resolved. See [research.md](./research.md) (R1–R10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution **v5.0.0 (draft; ratified by merging this PR)**. On v4.2.0, II requires
an "exponential function", which this feature replaces, so 010 can't pass without the amendment.

| # | Principle / Rule | How 010 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | Prices he can almost afford make him buy another shirt. The store's copy doesn't change, and the dial's top still says "too complicated to price". | ✅ | ✅ |
| II | Complexity Is the Price (v5.0.0) | One documented, deterministic, straight-line MSRP in `src/lib/pricing/msrp.ts`. Strictly increasing, and its two dials are owner settings. No ceiling: any whole score prices. Dan's final price still wins when set (the reprice clears the current ones, at the owner's request). Shoppers never see a score. | ✅ | ✅ |
| III | Relentlessly Vibrant | BLAND shirts must cost less than a real shirt's start, now defined as the MSRP where the first tier above BLAND begins (R4). On a climbing line that holds for every BLAND shirt at its MSRP. | ✅ | ✅ |
| IV | Shamelessly Manipulative | No tactic changes. The surcharge, add-ons and Flash Credit keep their amounts. | ✅ | ✅ |
| V | Maximum Visual Assault | No store markup changes. Prices stay steady (`data-steady`) and fit at 360px. The console stays calm. | ✅ | ✅ |
| VI | Fully Tested, Money Math First | The MSRP, resolution, the BLAND rule and the migration's money checks are written before the code. Property tests for determinism and monotonicity. It touches pricing, so `/speckit-analyze` runs before implement. | ✅ | ✅ |
| VII | Fast | Cheaper math, and the same top art. | ✅ | ✅ |
| VIII | Simple Code | It removes code: the float power, `scaleByFloat`, `maxPriceableScore`, `ART_MAX_SCORE` and three "can't price" branches. One new helper (`realShirtStartUsd`). | ✅ | ✅ |
| C | Commerce constraints | `placeOrder` still re-resolves every price and refuses an unseen total. Orders keep their snapshots. | ✅ | ✅ |
| W | Workflow | A feature branch (stacked on 007 until PR #9 merges); specify (Q1–Q3) → plan → tasks → analyze → implement → converge; merge by PR, carrying the v5.0.0 amendment; living specs updated in the same PR (FR-018). | ✅ | ✅ |

**Result**: PASS on v5.0.0, pre-research and post-design. The PR description must say that merging
ratifies v5.0.0, and that 007's PR (v4.2.0) merges first.

## Project Structure

### Documentation (this feature)

```text
specs/010-gentler-pricing-curve/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/pricing.md        # msrpUsd, realShirtStartUsd, saveTuning, the dial's top, the chart, the upgrade
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (changes to the 001–009 layout)

```text
drizzle/0014_gentler_pricing_curve.sql   # store_settings rebuild (2 dials in, 3 out); clear final prices
scripts/seed-data.ts                     # the new dials; Hawaiian Tax Return at its MSRP
.specify/memory/constitution.md          # v5.0.0 draft (II, III, Sync Impact Report)
README.md                                # the MSRP line, migration 0014
specs/001-*/spec.md, 007-*/spec.md, 008-*/spec.md   # living specs (FR-018)
src/
├── lib/
│   ├── pricing/msrp.ts                  # msrpUsd (straight line), DEFAULT_MSRP_SETTINGS, realShirtStartUsd
│   ├── money.ts                         # − scaleByFloat
│   ├── catalog/types.ts                 # MsrpSettings { basePriceUsd, perPointUsd }
│   ├── catalog/validate.ts              # the dials' schema; the BLAND rule via realShirtStartUsd; no "too complicated"
│   ├── db/schema.ts                     # the two columns and CHECKs
│   ├── data/settings.ts                 # read/write the two dials
│   ├── actions/admin/settings.ts        # saveTuningCore: basePriceUsd, perPointUsd
│   ├── admin/pricing.ts                 # chartPoints: linear axis, two-point MSRP line
│   ├── pattern/dial.ts                  # DIAL_MAX_SCORE; − maxPriceableScore, − ART_MAX_SCORE
│   ├── pattern/generator-view.ts        # readRecipe: refuse above DIAL_MAX_SCORE
│   ├── pattern/dial-view.ts, materialize.ts, actions/admin/generator.ts   # maxDialScore() without the tuning
│   └── copy.ts                          # tuning labels and help; generator.beyond; chart help
└── components/admin/
    ├── TuningForm.tsx                   # two fields, a real shirt's start, before/after
    ├── PricePreview.tsx                 # no "can't price"
    └── PriceChart.tsx                   # the doc comment (linear axis)
tests/
├── unit/msrp.test.ts, resolve.test.ts, catalog-validate.test.ts, money.test.ts, pattern-dial.test.ts,
│   pattern-generate.test.ts, admin-pricing.test.ts
├── integration/migration-0014.test.ts (new), admin-settings.test.ts, admin-generator.test.ts,
│   admin-shirts.test.ts, admin-door.test.ts, data-catalog.test.ts, materialize.test.ts,
│   place-order-card.test.ts             # + a retune between view and place → PRICE_CHANGED
├── fixtures/catalog.ts                  # the new dials
└── e2e/                                 # new prices; admin/switchboard tuning round trip; admin/pricing chart
```

**Structure Decision**: nothing moves. The change sits inside the existing pricing module, its one
settings row, and the places that read the dials. Every price still flows through `msrpUsd` →
`resolvePrice`.

## Complexity Tracking

No constitution violations on v5.0.0. These choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Two dials (base and per point) instead of keeping the anchor | They can't be tuned into a free or negative shirt, and every BLAND shirt at its MSRP stays below a real shirt by construction (R1, R4). | Three dials make the same line at the defaults, but a price per point above start ÷ anchor prices score 0 at $0 or less, which needs a cross-field rule. |
| The reprice clears Dan's prices in the migration | The owner asked for it (Q2), and every store has to reprice the same way (R3). The migration's automatic backup keeps the old prices. | A console button would leave e2e and other stores on old prices until someone pressed it. |
| `DIAL_MAX_SCORE` is a constant | The owner kept the top at 10,249 (Q3). It no longer depends on what the math can count. | Deriving it from the tuning would make the dial endless (a line never runs out). Deriving it from the art would move it to 24,000. |

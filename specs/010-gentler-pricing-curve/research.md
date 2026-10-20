# Research: Gentler Pricing Curve

Every Technical Context item was already known. These are the decisions the plan rests on, each with
what it replaced.

## R1 — The formula, in exact money

- **Decision**: `msrpUsd(score, { basePriceUsd, perPointUsd }) = add(basePriceUsd, mul(perPointUsd,
  score))`, from `src/lib/money.ts`.
  - It stays the one MSRP function, in `src/lib/pricing/msrp.ts`.
  - It throws `RangeError` only for a score that isn't a non-negative integer, as today.
  - It never touches a JS number: big.js adds and multiplies exactly, so every MSRP is already
    whole cents and needs no rounding.
- **Rationale**: a straight line is what the owner asked for ("a base price plus so much per
  point"). Exact arithmetic means every price is the formula to the cent, under any tuning, at any
  score (SC-001, SC-004).
- **Replaces**: 001 R5's `start × 2^((score − anchor) / interval)` in floating point. With it go
  `scaleByFloat` (its only caller was the MSRP), 008 R7's "too complicated to price" refusal, and
  every "can't price" branch that guarded against `Infinity`.
- **Alternatives**:
  - A gentler curve such as a power law. Rejected: the owner chose a straight line, and a curve
    still runs away at the top.
  - Keeping the anchor ("$300 at score 10, plus $25 a point"). That's the same line at the defaults,
    but a third dial couples the other two: any price per point above start ÷ anchor would price a
    score of 0 at $0 or less. Two dials can't be tuned into a free shirt.

## R2 — Two dials in Settings

- **Decision**: `MsrpSettings` becomes `{ basePriceUsd: Usd; perPointUsd: Usd }`.
  - Columns `store_settings.msrp_base_price_usd` (default `'50.00'`) and
    `store_settings.msrp_per_point_usd` (default `'25.00'`).
  - They replace `msrp_start_price_usd`, `msrp_anchor_score` and `msrp_doubling_interval`.
  - Each has a CHECK: a money string that isn't negative and isn't `'0.00'`.
  - The app validates both at no less than $0.01, using the console's existing `positiveUsd`.
- **Rationale**: exact two-decimal strings, like every other amount (constitution, money rule).
- **Alternative**: keep the start-price column and repurpose it. Rejected: its meaning changes
  (price at score 0, not at the anchor). A renamed column says what it holds.

## R3 — The reprice is a migration

- **Decision**: migration `0014_gentler_pricing_curve`:
  - **Settings**: drizzle-kit rebuilds `store_settings`, because SQLite can't drop a column that a
    CHECK names. The rebuild is hand-edited (like 0011–0013) to copy every other column as it is
    and start the two new dials at their defaults. The old tuning isn't carried over: an
    exponential's dials have no straight-line equivalent (spec Assumptions).
  - **Shirts**: `UPDATE shirts SET final_price_usd = NULL, updated_at = <now>` for every shirt that
    has one (spec Q2).
  - **Orders**: untouched. `order_items` keeps each line's `final_price_usd` and `msrp_usd`, and
    `orders` keeps its totals and surcharge (FR-008).
- **Rationale**: the store prices from the score at read time, so new dials plus no owner prices
  reprice every shirt at once (FR-007). `npm run db:migrate` already backs the database up first
  (`scripts/migrate.ts`), so the cleared prices survive in that backup if Dan wants them back.
- **Carts and checkout**: nothing new. Cart lines carry no price. `placeOrder` re-resolves every
  price on the server and refuses a total the shopper didn't see (`PRICE_CHANGED`), as it does for
  any retune (FR-009).
- **Alternative**: a script Dan runs by hand. Rejected: every store must reprice, and migrations
  already run on every upgrade and every e2e build.

## R4 — What a real shirt starts at

- **Decision**: add `realShirtStartUsd(tiers, msrp): Usd | null` beside `msrpUsd`: the MSRP at the
  `minScore` of the second tier in score order (the first above BLAND). It's null when BLAND is the
  only tier.
  - `validateShirt`'s BLAND rule compares a BLAND shirt's final price with it, and skips the rule
    when it's null.
  - The message keeps its words ("BLAND shirts must cost less than $300.00; this one resolves to
    …").
  - The tuning form shows it as "A real shirt starts at …".
  - Because `validateShirt` feeds the console's catalog check, a tier move or a retune that would
    put a hand-priced BLAND shirt at or above the start is still refused (008 FR-015, FR-030).
- **Rationale**: constitution III ("below the starting price of a real Dan Flashes shirt") needs a
  starting price, and there's no start-price dial any more. On a strictly climbing line, every BLAND
  shirt at its MSRP is below the next tier's start by construction (SC-004). Only Dan's own BLAND
  prices can break the rule.
- **Alternative**: compare with the base price. Rejected: the base is the price at score 0, which
  is a BLAND price, not a real shirt's.

## R5 — The dial's top is a constant

- **Decision**: `DIAL_MAX_SCORE = 10_249` in `src/lib/pattern/dial.ts`, under any tuning (spec Q3).
  - `maxDialScore()` returns it and no longer takes the tuning.
  - `maxPriceableScore` and `ART_MAX_SCORE` go. A straight line never runs out, and the art at
    10,249 (about 785 KB) is well inside 007's 2 MB budget (SC-005).
  - `scoreAtStep` is unchanged, so every step keeps its score and every recipe link keeps its shirt
    (FR-012).
  - The generator's `readRecipe` refuses a score above the top with reason `"unpriceable"` and the
    line "That's too complicated to price, even for Dan." The string moves from
    `copy.console.shirts.preview.cantPrice` (which no longer has a use there) to
    `copy.console.generator.beyond`.
  - `materialize` refuses a recipe above the top with `BEYOND`, as today.
- **Rationale**: the top was 10,249 because that's where the exponential ran out at the default
  tuning. Fixing it there keeps 007's dial exactly as it plays today.
- **Alternative**: keep `ART_MAX_SCORE` as a second guard. Rejected: it can never bind below 10,249
  (constitution VIII, simple code). The art-budget test moves to `DIAL_MAX_SCORE`.

## R6 — A linear price axis

- **Decision**: `chartPoints` maps price linearly from $0 to a "nice" top: the first 1, 2 or 5 ×
  10ⁿ at or above the highest price on the chart (each shirt's final price and the MSRP at the
  chart's right edge).
  - The gridlines step by a fifth of that top, with whole-dollar labels.
  - The MSRP line is two points, from score 0 to the right edge.
  - Every shirt at its MSRP sits on it, within the chart's 0.1 px rounding (SC-006).
  - Positions are still pixels, and every amount shown stays an exact string.
- **Rationale**: on a log axis a straight line bends. The chart's job is to show who's off the
  line (008 FR-018).
- **Alternative**: keep the log axis. Rejected: the MSRP would draw as a curve, and the help text
  would have to explain why.

## R7 — The tuning form

- **Decision**: `TuningForm` has two fields:
  - **Base price** (`basePriceUsd`) and **Price per point** (`perPointUsd`).
  - The help text says "MSRP = base price + price per point × score. Only the dials change, never
    the formula."
  - The live line: "A real shirt starts at $300.00 (Complicated, score 10)", from
    `realShirtStartUsd` under the dials as typed.
  - The before/after table stays, computed by the store's own `msrpUsd`.
  - `saveTuningCore` validates both with `positiveUsd`, and then runs the catalog check in a
    transaction, as today.
- **Rationale**: 008 FR-014's preview carries over; only the dials change.

## R8 — The seed

- **Decision**:
  - `scripts/seed-data.ts` tunes the MSRP at `{ basePriceUsd: "50.00", perPointUsd: "25.00" }`.
  - `DEFAULT_MSRP_SETTINGS` matches it.
  - Hawaiian Tax Return's `finalPriceUsd` becomes `null` (spec Q2, FR-010).
  - The seed still runs `validateShirt` on every shirt, and the catalog audit reports 0 errors
    (FR-016).
- **Rationale**: a reset store must look like an upgraded one (SC-007).

## R9 — Tests

- **Money first (constitution VI)**, written before the code:
  - **`msrp.test.ts`**: a table of exact prices (0 → $50.00, 10 → $300.00, 130 → $3,300.00, 9,000 →
    $225,050.00, 10,249 → $256,275.00, 1,000,000 → $25,000,050.00).
  - **Properties over at least 1,000 random tunings and scores**: determinism, a step of exactly
    the price per point, strictly increasing, whole cents.
  - **Bad inputs** throw.
  - **`resolve.test.ts`**: owner price, else MSRP, under the new dials.
  - **`catalog-validate.test.ts`**: the BLAND rule against `realShirtStartUsd`, tiers moved, a
    single-tier catalog, and no "too complicated" refusal at any score.
  - **`migration-0014.test.ts`**:
    - the dials replaced
    - every other setting kept
    - every owner price cleared
    - every order, line, add-on and surcharge identical, before and after
- **The rest**:
  - **`pattern-dial.test.ts`**: the top fixed under any tuning.
  - **Generator**: refuses 10,250.
  - **Chart**: linear ticks, and points at their MSRP on the line.
  - **Settings action**: the two dials, refusals.
  - **The checkout guard**: retune between view and place gives `PRICE_CHANGED`.
- **Existing tests**: every test that names the old dials (12 files) or hard-codes an old price
  moves to the new numbers. E2E journeys keep their meaning: if a journey needs a price above a
  Flash Credit preset (split checkout), it picks a shirt by its new price, not its old name.

## R10 — The constitution and the record

- **Decision**: draft constitution **v5.0.0** in this branch.
  - **II**: "a single, documented, deterministic, **straight-line** function of the complexity
    score: a base price plus a price per point". Its tuning parameters are named "the base price
    and the price per point".
  - **III**: "the starting price of a real Dan Flashes shirt" is defined as the MSRP where the first
    tier above BLAND begins.
  - **Sync Impact Report**: MAJOR, because it redefines a principle's MUST ("exponential"). The
    PATCH-level III wording is batched in.
  - Ratified by merging this feature's PR, after 007's PR ratifies v4.2.0.
  - **Living specs (FR-018)**: 001's, 007's and 008's specs, and the README's pricing lines, say
    "straight line". Their research files are left as the record of what was decided then.

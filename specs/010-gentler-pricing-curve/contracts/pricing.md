# Contract: The Straight-Line MSRP

The pricing function, the tuning action, and what the dial, the generator and the console promise
under the new curve. Every rule cites the spec's FR or the research R that decided it.

## The one MSRP function (FR-001, FR-002, R1)

`src/lib/pricing/msrp.ts`

```ts
export interface MsrpSettings { basePriceUsd: Usd; perPointUsd: Usd }
export const DEFAULT_MSRP_SETTINGS: MsrpSettings; // { basePriceUsd: "50.00", perPointUsd: "25.00" }
export function msrpUsd(score: number, settings: MsrpSettings): Usd;
export function realShirtStartUsd(tiers: readonly Tier[], settings: MsrpSettings): Usd | null;
```

| Input | Result |
|---|---|
| a whole score ≥ 0 | `base + perPoint × score`, exact, two decimals |
| a negative, fractional or non-number score | throws `RangeError` |
| a malformed money string in the settings | throws `MoneyError` (from `money.ts`) |
| `msrpUsd(s + 1) − msrpUsd(s)` | exactly `perPoint`, for every `s` |
| tiers sorted by `minScore`, two or more | `msrpUsd(tiers[1].minScore)` |
| a single tier (BLAND alone) | `null` |

Defaults, exact:

| Score | MSRP |
|---|---|
| 0 | $50.00 |
| 2 (Beige Regret) | $100.00 |
| 10 (a real shirt starts) | $300.00 |
| 130 (Dan's Masterpiece) | $3,300.00 |
| 9,000 | $225,050.00 |
| 10,249 (the dial's top) | $256,275.00 |
| 1,000,000 | $25,000,050.00 |

`resolvePrice` is unchanged: Dan's price if set, otherwise the MSRP (FR-005).

## The BLAND rule (FR-006, R4)

`validateShirt(draft, { tiers, msrp, imageCount })`

| Shirt | Result |
|---|---|
| in the BLAND tier, final price < `realShirtStartUsd` | no issue |
| in the BLAND tier, final price ≥ `realShirtStartUsd` | `{ field: "finalPriceUsd", message: "BLAND shirts must cost less than $300.00; this one resolves to …" }` |
| in the BLAND tier, BLAND the only tier | no issue |
| any whole score | never refused as too complicated to price (the 008 R7 refusal is gone) |

## The tuning action (FR-003, FR-013, R7)

`saveTuning(form)` → `saveTuningCore(db, jar, form)`, behind the console's door (008).

| Form field | Rule | Refusal (stays on screen) |
|---|---|---|
| `basePriceUsd` | dollars and cents, ≥ $0.01 | `copy.console.settings.tuning.baseFormat` |
| `perPointUsd` | dollars and cents, ≥ $0.01 | `copy.console.settings.tuning.perPointFormat` |

| Case | Result | Changes |
|---|---|---|
| a bad field | `{ ok: false, issues }` | none |
| valid dials that would put a hand-priced BLAND shirt at or above a real shirt's start | `{ ok: false, message: t.breaks, issues }` (the catalog check, as today) | none |
| valid dials | `{ ok: true, message: "Saved. …" }` (short-lived, 007 FR-028) | the two columns only (008 R11) |

`TuningForm` shows, as Dan types:
- the formula in words
- "A real shirt starts at $X (Tier, score N)", or nothing if BLAND is the only tier
- every active shirt's MSRP now and after

## The dial and the generator (FR-011, FR-012, R5)

| Rule | Where |
|---|---|
| `DIAL_MAX_SCORE = 10_249` under any tuning; `maxDialScore()` takes no settings | `src/lib/pattern/dial.ts` |
| Steps 0–100 keep `scoreAtStep(step, 10_249)`; step 101 shows "That's too complicated to price, even for Dan." and can't be bought | the dial page (007 contract) |
| A recipe above the top: `materialize` → `{ ok: false, code: "BEYOND" }`; the art route → 404 | 007, unchanged |
| The generator's `readRecipe`: a score above 10,249 → `{ ok: false, reason: "unpriceable", issues: [{ field: "score", message: copy.console.generator.beyond }] }` | `src/lib/pattern/generator-view.ts` |
| A recipe code made before 010 opens the same setting and the same shirt | 007 recipe codes, unchanged |

## The pricing chart (FR-014, R6)

`chartPoints(shirts, tiers, msrp, box)` returns the same `Chart` shape:

| Field | Under 010 |
|---|---|
| `curve` | `M x(0) y(msrp(0)) L x(xMax) y(msrp(xMax))`: a straight line |
| `ticks` | `y` for $0 and each fifth of a nice top (1, 2 or 5 × 10ⁿ ≥ the highest price), labels in whole dollars |
| `points` | every shirt at its final price; a shirt at its MSRP lies on `curve` within 0.1 px |
| `bands`, `xMax` | unchanged |

## The shirt editor's preview (FR-015)

`PricePreview` shows the tier, the MSRP and the final price for any whole score. It has no "can't
price" branch.

## The upgrade (FR-007–FR-010, R3)

`npm run db:migrate` (which backs up first) applies `0014`:

| Before | After |
|---|---|
| any tuning | `msrp_base_price_usd = '50.00'`, `msrp_per_point_usd = '25.00'` |
| shirts with `final_price_usd` set | `final_price_usd = NULL` |
| every other setting, shirt column, cart and order | identical |

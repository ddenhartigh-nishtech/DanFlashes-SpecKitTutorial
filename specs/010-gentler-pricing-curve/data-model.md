# Data Model: Gentler Pricing Curve

Migration `0014_gentler_pricing_curve` (research R3). It changes one table's columns and clears one
column's values. No table is added.

## store_settings (changed)

| Column | Type | Default | Rule |
|---|---|---|---|
| `msrp_base_price_usd` | text | `'50.00'` | NEW. The MSRP at score 0. CHECK: a money string, not negative, not `'0.00'` (`store_settings_base_price`). |
| `msrp_per_point_usd` | text | `'25.00'` | NEW. What each point of score adds. CHECK: the same (`store_settings_per_point`). |
| `msrp_start_price_usd` | — | — | DROPPED, with its CHECK `store_settings_start_price`. |
| `msrp_anchor_score` | — | — | DROPPED, with its CHECK `store_settings_anchor`. |
| `msrp_doubling_interval` | — | — | DROPPED, with its CHECK `store_settings_interval`. |

- **The rebuild**: every other column is copied as it is (switches, presets, media, the surcharge).
  The two new dials start at their defaults. The old dials aren't converted (spec Assumptions).
- **The app's type**: `MsrpSettings = { basePriceUsd: Usd; perPointUsd: Usd }`. Validated at no less
  than $0.01 each (`validateSettings`, `saveTuningCore`).

## shirts (values only)

| Column | Change |
|---|---|
| `final_price_usd` | Set to NULL on every row that has one. `updated_at` is set to the migration's time on those rows. |

No column or CHECK changes. After the migration, every shirt's final price is its MSRP until Dan sets
one again (FR-007).

## Derived values (not stored)

| Value | Defined as | Used by |
|---|---|---|
| MSRP | `basePriceUsd + perPointUsd × score`, exact | every price (`resolvePrice`), the console previews, the chart |
| A real shirt's start | the MSRP at the `minScore` of the first tier above BLAND; none if BLAND is the only tier | the BLAND rule (`validateShirt`), the tuning form |
| The dial's top | `DIAL_MAX_SCORE = 10,249`, a constant | the dial, `materialize`, the console generator |

## Unchanged

- **`orders`, `order_items`, `order_add_ons`, `order_drains`**: every snapshot stays (FR-008).
- **`carts`, `cart_items`**: cart lines carry no price, and they reprice on their next look.
- **`complexity_tiers`**: its bands, and so every badge.
- **`flash_credit_entries`**, `add_ons`, `revenue_streams`, `users`, `sessions`, `media`,
  `shirt_images`: no money in them is a shirt price.
- **The surcharge**: `uniquity_surcharge` and `uniquity_surcharge_usd`, copied as they are.

## State after an upgrade (the owner's store, 2026-10-20)

| Before | After |
|---|---|
| $300.00 at score 10, doubling every 10 | $50.00 + $25.00 a point |
| 4 shirts with Dan's price ($1,040, $10,000, $27,000, $1,300,000) | none |
| Dan's Masterpiece (130): $1,228,800.00 | $3,300.00 |
| The dial shirt (188): $68,462,882.06 | $4,750.00 |
| 13 orders | the same 13 orders, to the cent |

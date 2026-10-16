# Data Model: Checkout Squeeze (005)

Migration `0008`. Money is exact two-decimal USD text, using 001's `money` CHECK.

## New table: `add_ons` (owner data)

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK, autoincrement | |
| `name` | text, NOT NULL, unique | 1–60 characters after trimming |
| `pitch` | text, NOT NULL | 1–160 characters; shown under the name at checkout |
| `decline_line` | text, NOT NULL | 1–160 characters; shown when he unticks it, while confirmshaming is on |
| `price_usd` | text, NOT NULL | exact money; CHECK not negative and not `0.00`; a flat price per order; no ceiling |
| `active` | integer (boolean), NOT NULL, default 1 | offered at checkout while on; retire, never delete |
| `position` | integer, NOT NULL, default 0 | checkout order, then `id` |
| `created_at` | text, NOT NULL | 001's `timestamps` |

## New table: `order_add_ons` (one row per add-on bought)

| Column | Type | Rules |
|---|---|---|
| `order_id` | integer, NOT NULL | FK → `orders.id`, ON DELETE RESTRICT |
| `add_on_id` | integer, NOT NULL | FK → `add_ons.id`, ON DELETE RESTRICT |
| `name` | text, NOT NULL | snapshot at placement |
| `price_usd` | text, NOT NULL | snapshot at placement; exact money, CHECK not negative and not `0.00` |
| `position` | integer, NOT NULL | snapshot of the add-on's position, for display order |

PRIMARY KEY (`order_id`, `add_on_id`).

Invariant, enforced by `placeOrder` and tested: `orders.total_usd = subtotal_usd + Σ order_add_ons.price_usd + shipping_usd + tax_usd`.

## Changed: `store_settings`

| Column | Type | Rules |
|---|---|---|
| `pre_checked_add_ons` | integer (boolean), NOT NULL, default 1 | US1 (constitution IV) |
| `roach_motel` | integer (boolean), NOT NULL, default 1 | US2 (constitution IV) |

These map to `StoreSettings` as `preCheckedAddOns` and `roachMotel`, validated as booleans and
seeded on.

## Derived

- **Offered add-ons**: `active = 1`, ordered by `position`, then `id`. While the switch is off, the
  list is empty.
- **Order totals** (R2): `orderTotals({ subtotalUsd, addOnPrices, shippingUsd, taxUsd })` →
  `addOnsUsd = Σ addOnPrices`, and `totalUsd = subtotal + addOnsUsd + shipping + tax`.

## Seed fixture (`scripts/seed-data.ts`, not code-owned data)

Four starting add-ons (R9): Pattern Protection Plan™ $49.99, Complexity Insurance $89.99, Extended
Vibrancy Warranty $29.99, and Priority Compliments Package $19.99. `seedCatalog` inserts them,
skipping any name that already exists.

## Brand copy additions (`src/lib/copy.ts`)

- `copy.roachMotel`: `first` ("Are you sure?"), `second` ("Are you sure sure?"), `keep`
- `copy.shame.labels`: `removeYes` and `lowerYes`, each with a shamed and a neutral label
- `copy.checkout`: an `addOns` heading, and the add-on rows

# Data Model: Core Storefront (001)

**Date**: 2026-10-12 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

There are two stores:

- **The catalog** is JSON files the owner edits in git. It holds Shirt and Store Config. It is
  read-only at runtime.
- **The database** is SQLite. It holds everything shoppers create.

All money is integer **cents** (`*_cents`). All timestamps are ISO-8601 UTC.

---

## Catalog (JSON, owner-edited)

### Shirt: `catalog/shirts/<slug>.json`

| Field | Type | Rules |
|---|---|---|
| `slug` | string | Required. Unique. `^[a-z0-9-]+$`. Must match the file name. |
| `name` | string | Required, 1–80 chars. |
| `style` | `"polo" \| "button-down"` | Required. |
| `complexity` | integer | Required, ≥ 0, no upper bound (subject to the safe-money limit, research R4). |
| `finalPrice` | integer (whole dollars) | Optional, ≥ 1. When absent, the final price is the MSRP. |
| `bland` | boolean | Default `false`. When `true`, the final price must be < $300 (constitution III). |
| `description` | string | Required. Hype copy in the Dan Flashes voice. |
| `images` | `{ src: string, alt: string }[]` | Required, ≥ 1. `src` is relative to `public/`. The first image is primary. |
| `status` | `"active" \| "removed"` | Default `"active"`. Removed shirts are hidden and can't be checked out. |
| `featured` | boolean | Optional. Overrides the default "most complicated" pick for the home page. |

Formal schema: [contracts/catalog.schema.json](./contracts/catalog.schema.json).

### Store Config: `config/store.json`

| Field | Type | Rules |
|---|---|---|
| `msrp.startPriceDollars` | integer | Default 300, ≥ 1. |
| `msrp.anchorScore` | integer | Default 10, ≥ 0. Score at which the MSRP equals the start price. |
| `msrp.doublingInterval` | number | Default 10, > 0. Points per price doubling. |
| `tactics.checkoutGate` | boolean | Default `true`. FR-016/017. |
| `flashCredit.presetsDollars` | integer[] | Default `[500, 1000, 5000]`. |

### Derived values (computed, never stored in the catalog)

- `msrpCents(shirt) = round(start × 2^((complexity − anchor) / interval)) × 100`
- `finalPriceCents(shirt) = (finalPrice ?? msrpDollars) × 100`
- `orderWarnings(catalog)`: shirts whose final price is lower than any shirt with a strictly lower
  complexity score (FR-006).

### Catalog load validation (fails startup and `catalog:check`)

- Schema violations, a duplicate slug, or a slug that doesn't match the file name
- `bland: true` with a final price ≥ $300
- A final price above the safe-money limit (research R4)
- Fewer than 12 active shirts, missing either style, fewer than 2 bland shirts, or no T.C. Tugger
  shirt. These are seed-catalog checks for FR-007, and `catalog:check` reports them only as
  warnings in non-seed use.

---

## Database (SQLite via Drizzle)

### `users`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `email` | text | Unique, stored lowercased and trimmed. |
| `password_hash` | text | bcrypt, cost 12. |
| `display_name` | text | Optional. Used in hype copy ("Looking complicated, Greg."). |
| `created_at` | text | |

### `sessions`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `user_id` | integer FK → users | Cascade on delete. |
| `token_hash` | text | Unique. SHA-256 of the cookie token. The raw token is never stored. |
| `expires_at` | text | Created at +30 days. |

### `carts`

| Column | Type | Rules |
|---|---|---|
| `id` | text PK | Random UUID. For guests, this is held in the `df_cart` cookie. |
| `user_id` | integer FK → users, nullable | Null means a guest cart. Unique when not null (one cart per user). |
| `updated_at` | text | |

### `cart_items`

| Column | Type | Rules |
|---|---|---|
| `cart_id` | text FK → carts | Cascade on delete. |
| `shirt_slug` | text | Must reference an active catalog shirt when added. |
| `size` | text | `S \| M \| L \| XL \| XXL` |
| `quantity` | integer | 1–99 |
| PK | (`cart_id`, `shirt_slug`, `size`) | Identical shirt+size pairs share a row, which makes the merge additive. |

There is **no price column**. Cart prices are always resolved live from the catalog (FR-024).

### `orders`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | Shown as a number like `DF-000042`. |
| `user_id` | integer FK → users | Required, because of the checkout gate. Nullable only when `checkoutGate` is off (guest card checkout). |
| `checkout_token` | text | **Unique.** Makes a double submit idempotent (R10). |
| `total_cents` | integer | Equals the sum of `order_items.final_price_cents × quantity`. |
| `payment_method` | text | `card \| flash_credit` |
| `card_brand` | text, nullable | Only when `payment_method = card`. |
| `card_last4` | text, nullable | Only when `payment_method = card`. Exactly 4 digits. |
| `created_at` | text | |

### `order_items`

| Column | Type | Rules |
|---|---|---|
| `order_id` | integer FK → orders | |
| `shirt_slug` | text | |
| `shirt_name` | text | Snapshot, so history survives catalog edits. |
| `complexity` | integer | Snapshot. |
| `size` | text | |
| `quantity` | integer | |
| `final_price_cents` | integer | Snapshot at checkout. |
| `msrp_cents` | integer | Snapshot at checkout (FR-024). |

### `flash_credit_entries`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `user_id` | integer FK → users | |
| `amount_cents` | integer | Top-up > 0, spend < 0, never 0. |
| `kind` | text | `top_up \| spend` |
| `order_id` | integer FK → orders, nullable | Required when `kind = spend`. |
| `card_brand`, `card_last4` | text, nullable | Required when `kind = top_up`. |
| `created_at` | text | |

**Invariant** (constitution, SC-005): for every user, `SUM(amount_cents) ≥ 0` after every committed
transaction. The balance is never stored; it is always derived.

---

## Relationships

```text
users 1─* sessions
users 1─0..1 carts (guest carts have user_id NULL)
carts 1─* cart_items ─→ catalog shirt (by slug)
users 1─* orders 1─* order_items ─→ catalog shirt snapshot
users 1─* flash_credit_entries ─0..1→ orders
```

## State transitions

**Cart**: guest cart (cookie) → signed in → merged into the user's cart (guest row deleted) →
checkout succeeds → items cleared.

**Checkout**: cart → re-resolve prices → validate (non-empty, all shirts active, total ≤ safe limit,
price-changed notice acknowledged) → pay:

- card: valid → order created
- flash_credit: balance ≥ total → order created and spend entry written; otherwise refused, nothing
  written

Then the cart is cleared and the confirmation is shown. Any failure leaves the cart intact and writes
nothing.

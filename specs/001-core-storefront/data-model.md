# Data Model: Core Storefront (001)

**Date**: 2026-10-12, revised 2026-10-13 (catalog in the database; exact-dollar money; bland = lowest
tier) | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

All data lives in **one SQLite database** (`data/danflashes.db`), defined in Drizzle
(`src/lib/db/schema.ts`). Only image *files* live outside it, in `public/media/` (research R18).

## Conventions

- **Money** is US dollars to the cent, stored as **exact two-decimal text** in `*_usd` columns: `"200.18"`,
  `"-1450.00"`, `"0.00"`.
  - Every value matches `^-?\d+\.\d{2}$`, enforced by the data layer and a CHECK constraint.
  - All arithmetic goes through `src/lib/money.ts`, which uses big.js exact decimals. Binary floats
    are never used (constitution "Exact money", research R4).
  - There is no upper limit.
- **Timestamps** are ISO-8601 UTC text (e.g., `2026-10-13T14:05:22.000Z`).
- **Booleans** are SQLite integers 0/1.

## Terms (see the spec Glossary)

- **MSRP** is the *calculated* price: the algorithm applied to the score, rounded to the cent.
- **Final price** is the owner's price when one is set, otherwise the MSRP.
- **Complexity score** is owner-only and is never rendered to shoppers.
- **Tier** is the shopper-facing band of scores. The **lowest tier is BLAND**.

---

## Catalog tables (owner-managed)

Until the Admin Console (ROADMAP 008) exists, the owner manages these with Drizzle Studio
(`npm run db:studio`). The demo data comes from `npm run db:seed`.

### `media`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `key` | text | Required. Unique. Relative path under the media root, e.g. `shirts/geo-riot.svg`. MUST NOT start with `/` or contain `..` or a drive letter. |
| `alt` | text | Required, 1–200 chars. Describes the pattern; the pattern is the product. |
| `kind` | text | `shirt \| placeholder` |
| `created_at` | text | |

The URL is `resolveMediaUrl(key)` = `store_settings.media_base_url` (or `/media` when empty) + `/` +
key.

### `shirts`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `slug` | text | Required. Unique. `^[a-z0-9-]+$`. Used in URLs. |
| `name` | text | Required, 1–80 chars. |
| `style` | text | `polo \| button-down` |
| `complexity` | integer | Required, ≥ 0, no upper bound. **Never shown to shoppers.** It determines the tier and the MSRP. |
| `final_price_usd` | text (money), nullable | ≥ `0.01`. **NULL means the final price is the MSRP**, which is computed live, so retuning the MSRP settings moves every un-overridden shirt. |
| `description` | text | Required. Hype copy. |
| `status` | text | `active \| inactive`, default `active`. **Never deleted** (enforced by the `order_items` FK). |
| `featured` | integer (boolean) | Default 0. When any are set, they replace the default home pick. |
| `created_at`, `updated_at` | text | |

There is no `bland` column. Bland means being in the lowest tier.

### `shirt_images`

| Column | Type | Rules |
|---|---|---|
| `shirt_id` | integer FK → shirts | Cascade on delete (which can only happen for never-ordered shirts). |
| `media_id` | integer FK → media | Restrict on delete. |
| `position` | integer | 0 = primary. |
| PK | (`shirt_id`, `position`) | |

### `complexity_tiers`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | Stable identifier, used in listing filter URLs (`?tier=4`), so renaming or restyling a tier is safe. |
| `name` | text | Required, unique. The badge text, e.g. "Dangerously Complicated". |
| `tagline` | text | Optional hype phrase shown with the badge where space allows, e.g. "Most men couldn't handle this." |
| `min_score` | integer | Required, unique, ≥ 0. **A row with `min_score = 0` MUST exist.** It is the BLAND tier. |
| `badge_bg_color` | text | `#RRGGBB` |
| `badge_text_color` | text | `#RRGGBB` |

**How tiers work**:
- A shirt's tier is **looked up from its score**: the tier with the highest `min_score` ≤ the score.
  Shirts don't store a tier id, so changing a tier's range re-buckets every shirt automatically with
  no drift.
- Each tier spans from its `min_score` up to the next tier's `min_score − 1`, and the last tier is
  open-ended.
- The tier with `min_score = 0` (the lowest) **is the BLAND tier** (constitution III).

Seed defaults:

| id | name | min_score | Note |
|---|---|---|---|
| 1 | BLAND | 0 | Lowest tier. With the default MSRP settings, its prices fall under $300. |
| 2 | Complicated | 10 | |
| 3 | Very Complicated | 25 | |
| 4 | Seriously Complicated | 45 | |
| 5 | Dangerously Complicated | 70 | |
| 6 | Too Complicated for Most Men | 100 | |

### `store_settings` (single row, `id = 1`)

| Column | Type | Default |
|---|---|---|
| `msrp_start_price_usd` | text (money) ≥ 0.01 | `300.00` |
| `msrp_anchor_score` | integer ≥ 0 | 10 |
| `msrp_doubling_interval` | integer ≥ 1 | 10 |
| `checkout_gate` | integer (boolean) | 1 |
| `flash_credit_presets_usd` | text (JSON array of money strings) | `["500.00","1000.00","5000.00"]` |
| `media_base_url` | text | `''` (same site, `/media`) |
| `placeholder_media_id` | integer FK → media | the seeded placeholder |

### Derived values (computed in `src/lib`, never stored)

- `msrpUsd(score)` = start × 2^((score − anchor) / interval), **rounded half-up to the cent**.
  Examples: score 0 → `150.00`, 10 → `300.00`, 15 → `424.26`, 20 → `600.00`, 50 → `4800.00`.
- `finalPriceUsd(shirt)` = `final_price_usd ?? msrpUsd(complexity)`
- `tierOf(score)` = the tier with the highest `min_score` ≤ score
- `isBland(shirt)` = `tierOf(complexity).min_score == 0`
- `orderWarnings(shirts)` = the pricing outlier alarm (R6)

### Catalog rules

The data layer enforces these on save, and `npm run catalog:audit` re-checks them.

These are errors:
- a bland-tier shirt with a final price ≥ the MSRP start price ($300 by default)
- an invalid money format
- no tier at `min_score = 0`
- invalid badge colors
- an invalid media `key`
- an active shirt with no images

These are warnings:
- the pricing outlier alarm (R6)
- the FR-007 seed checks: ≥ 12 active shirts, both styles, ≥ 2 in BLAND, every tier populated, a
  T.C. Tugger shirt

---

## Shopper tables

### `users`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `email` | text | Unique, stored lowercased and trimmed. |
| `password_hash` | text | bcrypt, cost 12. |
| `display_name` | text | Optional. Used in hype copy. |
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
| `shirt_id` | integer FK → shirts | Must be **active** when added. Inactive lines are deleted by the cart audit (R16). |
| `size` | text | `S \| M \| L \| XL \| XXL` |
| `quantity` | integer | 1–99 |
| `added_at` | text | Set on first add. Kept when quantity changes or carts merge (the earlier time wins). |
| PK | (`cart_id`, `shirt_id`, `size`) | Makes the merge additive. |

**Display order**: most recently added first (`added_at DESC`). Drag-to-reorder is out of scope (R8).

There is **no price column**. Cart prices are always resolved live (FR-029).

### `orders`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | Shown as a number like `DF-000042`. |
| `user_id` | integer FK → users, nullable | **This ties the order to the shopper's account.** Purchase history = `WHERE user_id = :me ORDER BY created_at DESC`. NULL only for a guest card checkout with the gate off, and such orders appear in no one's history. |
| `checkout_token` | text | **Unique.** Makes a double submit idempotent (R10). |
| `subtotal_usd` | text (money) | Σ `order_items.final_price_usd × quantity`. |
| `shipping_usd` | text (money) | Always `0.00` in 001. |
| `tax_usd` | text (money) | Always `0.00` in 001. |
| `total_usd` | text (money) | subtotal + shipping + tax. |
| `payment_method` | text | `card \| flash_credit` |
| `card_brand` | text, nullable | Only when `payment_method = card`. |
| `card_last4` | text, nullable | Only when `payment_method = card`. Exactly 4 digits. |
| `created_at` | text | |

### `order_items`: the immutable snapshot

| Column | Type | Rules |
|---|---|---|
| `order_id` | integer FK → orders | |
| `shirt_id` | integer FK → shirts | **`ON DELETE RESTRICT`**, so an ordered shirt can't be deleted (FR-009). |
| `shirt_name` | text | Snapshot. |
| `tier_name` | text | Snapshot of the badge text at checkout (e.g. "BLAND"). |
| `complexity` | integer | Snapshot. Owner analytics only. |
| `size` | text | |
| `quantity` | integer | |
| `final_price_usd` | text (money) | Snapshot at checkout. |
| `msrp_usd` | text (money) | Snapshot at checkout. |

### `flash_credit_entries`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK | |
| `user_id` | integer FK → users | |
| `amount_usd` | text (money) | Signed: top-up > 0, spend < 0, never `0.00`. |
| `kind` | text | `top_up \| spend` |
| `order_id` | integer FK → orders, nullable | Required when `kind = spend`. |
| `card_brand`, `card_last4` | text, nullable | Required when `kind = top_up`. |
| `created_at` | text | |

**Balance** = the exact decimal sum of the user's `amount_usd` values, computed in `src/lib/money.ts`
(not SQL `SUM`, which would convert to floats).

**Invariant** (constitution, SC-005): balance ≥ `0.00` after every committed transaction. The
balance is always derived, never stored.

---

## Relationships

```text
media 1─* shirt_images *─1 shirts
store_settings ─→ media (placeholder)
complexity_tiers ··· shirts (looked up by score range; the lowest tier is BLAND)
users 1─* sessions
users 1─0..1 carts (guest carts have user_id NULL)
carts 1─* cart_items *─1 shirts (active only)
users 1─* orders 1─* order_items *─1 shirts (RESTRICT delete) + snapshot
users 1─* flash_credit_entries ─0..1→ orders
```

## State transitions

**Shirt**: `active` ⇄ `inactive`. There is no delete once ordered.

**Cart lifecycle**:
1. A guest adds a shirt: a `carts` row is created (with `user_id` NULL) and its id goes in the
   `df_cart` cookie.
2. He signs in or up: the guest cart's lines merge into his account cart, and the guest cart row is
   deleted.
3. On every load, the cart audit removes inactive lines.
4. **At checkout, in one transaction:**
   - an `orders` row is written
   - each cart line is **copied into `order_items` as a snapshot** (shirt, tier, size, qty, and the
     prices at that moment)
   - the cart's lines are **deleted**

   The `carts` row stays as his now-empty cart, so the next page shows the empty-cart "You sure about
   that?" pitch. The order never changes afterward, even if prices or tiers change.

**Checkout**: cart → audit → re-resolve prices → validate → pay:

- card: valid → order created
- flash_credit: balance ≥ total → order created and spend entry written

Failures write nothing, except audit removals, which persist.

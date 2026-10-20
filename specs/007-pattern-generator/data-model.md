# Data Model: Pattern Generator

One migration, `0012_pattern_generator`. Generated shirts are ordinary catalog shirts with three new
columns. Their art is an 008 upload.

## Changed: `shirts` (rebuilt for the new CHECKs; every row copied)

| Column | Type | Rule |
|---|---|---|
| `origin` | text | NOT NULL, DEFAULT `'catalog'`. One of `catalog` (hand-made), `owner` (Dan's generator), `dial` (a shopper's dial). Existing shirts become `catalog`. |
| `recipe` | text | NULL for `catalog`, required for `owner` and `dial`. UNIQUE. The canonical key `v1:<style>:<score>:<seed>`, server-side only (R3). |
| `listed` | integer (boolean) | NOT NULL, DEFAULT 1. Only a `dial` shirt may be 0. It's created 0, and the owner can list it (1) or unlist it (0). |

**CHECKs**:
- `(origin = 'catalog') = (recipe IS NULL)`
- `origin = 'dial' OR listed = 1`
- `origin IN ('catalog', 'owner', 'dial')`

**Unchanged for generated shirts**: name 1–80 characters, the slug pattern, the score ≥ 0, a final
price that's optional (NULL = MSRP), the status, featured, `updated_at`. The score starts at the
recipe's counted score, and the owner may change it (constitution v4.2.0). The recipe never changes,
so the shirt is still found by it.

## Changed: `store_settings`

| Column | Type | Rule |
|---|---|---|
| `pattern_generator` | integer (boolean) | NOT NULL, DEFAULT true. The store's dial (R9). |

## Unchanged, used as before

- **`media`**: a generated shirt's art is a row with `kind = 'shirt'`, key `uploads/<uuid>.svg`,
  and alt "<name>: a generated pattern". The file is in the uploads folder (008 R8).
- **`shirt_images`**: the art at position 0. The owner can attach more in the editor.
- **`cart_items`**: unchanged. A generated shirt goes in a cart like any other, and its surcharge
  is worked out live, never stored.
- **`orders`, `order_items`**: unchanged by 0012. Migration 0013 adds the surcharge columns (see
  the owner review section below).

## Derived, never stored

- **Recipe**: `{ version: 1, style, score, seed }`. Its link code is the opaque base-36 form (R3).
- **Pattern**: `generate(recipe, { bland })` gives `{ svg, count }`, where `count === score`.
  `bland` comes from the store's current tiers.
- **Dial step**: `{ code, tierName, tierBg, tierText, tagline, priceUsd | null, isBland, made? }`
  for steps 0–101. `scoreAtStep` stays on the server.
- **maxDial**: `min(maxPriceableScore(msrp), ART_MAX_SCORE)`.

## Lifecycles

- **Dial shirt**:
  - created on "Make it mine": active, unlisted
  - then listed ⇄ unlisted, by the owner
  - then active ⇄ resting, by the owner
  - never deleted
- **Owner-generated shirt**: created resting and listed. Then it's an ordinary shirt.
- **A recipe → shirt**: at most one (UNIQUE). A second request returns the first.

## Owner review: migration `0013_made_to_order`

### Changed: `shirts` (rebuilt for the new CHECK; every row copied)

| Column | Type | Rule |
|---|---|---|
| `maker_user_id` | integer | NULL, FK `users.id`. Only a `dial` shirt may have one (CHECK `origin = 'dial' OR maker_user_id IS NULL`). Set by Make it mine (R14). Backfilled from each dial shirt's earliest order. |

**One of a kind** (derived): `origin = 'dial' AND listed = 0`. Only `maker_user_id` may buy it.
**Mass-produced** (derived): `origin = 'dial' AND listed = 1`, an ordinary shirt for everyone.

### Changed: `store_settings`

| Column | Type | Rule |
|---|---|---|
| `uniquity_surcharge` | integer (boolean) | NOT NULL, DEFAULT true. The surcharge's switch (R15). |
| `uniquity_surcharge_usd` | text | NOT NULL, DEFAULT `'499.99'`. A USD string, `0.00` or more. |

### Changed: `orders` and `order_items`

| Column | Type | Rule |
|---|---|---|
| `orders.surcharge_usd` | text | NOT NULL, DEFAULT `'0.00'`. Every surcharge on the order, in all. Total = subtotal + surcharge + add-ons + shipping + tax. |
| `order_items.surcharge_usd` | text | NOT NULL, DEFAULT `'0.00'`. The surcharge per shirt on this line, as charged. |

Existing orders get `0.00`: nothing was charged.

### Lifecycles (amended)

- **Dial shirt**:
  - created on "Make it mine": active, one of a kind, with its maker
  - then mass-produced ⇄ one of a kind, by the owner
  - then active ⇄ resting, by the owner
  - never deleted

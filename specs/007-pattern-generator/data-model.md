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
- **`cart_items`, `orders`, `order_items`**: unchanged. A generated shirt is bought like any other.

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

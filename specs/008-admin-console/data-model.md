# Data Model: Admin Console

One migration, `0011_admin_console`. Everything else the console touches already exists (001–009).

## Changed: `users`

| Column | Type | Rule |
|---|---|---|
| `is_admin` | integer (boolean) | NOT NULL, DEFAULT false. Existing accounts start with it off. Set and cleared only by `scripts/admin.ts` (`setAdmin`). Read with the session (`SessionUser.isAdmin`). |

## Changed: `flash_credit_entries`

| Column | Type | Rule |
|---|---|---|
| `kind` | text | Adds `grant` to `top_up`, `spend` and `stream`. |
| `grant_token` | text | NULL for every other kind. UNIQUE. Required for `grant`. |

The `flash_credit_kind` CHECK gains this branch (SQLite rebuilds the table; rows are copied as-is):

```sql
OR (kind = 'grant' AND amount_usd NOT GLOB '-*' AND grant_token IS NOT NULL
    AND order_id IS NULL AND card_brand IS NULL AND card_last4 IS NULL
    AND stream_id IS NULL AND stream_payment_no IS NULL)
```

The existing branches gain `AND grant_token IS NULL`.

The other checks still apply:
- `flash_credit_amount`: exact two decimals
- `flash_credit_nonzero`
- the balance is the exact sum of a user's entries and never goes below zero; a grant only adds

**Invariants**:
- A grant is created only by `grantCredit` (R13).
- It's never edited or removed.
- A repeated `grant_token` is a no-op.

## Unchanged tables, with new rules enforced by the console

| Entity | Console rule (where) |
|---|---|
| `shirts` | The slug is fixed after creation. No delete. Active needs ≥ 1 image. BLAND tier < MSRP start price. The MSRP must be computable (R7). All of these go through `validateShirt` and `checkCatalog` (R10). |
| `shirt_images` | `position` 0 is the main image. Reordering rewrites the positions in one transaction. An active shirt keeps ≥ 1 image. |
| `media` | Uploads get `kind = 'shirt'` and the key `uploads/<uuid>.<ext>` (R8). Alt is 1–200 characters. Removable only when no `shirt_images` row uses it and it isn't `store_settings.placeholder_media_id` (the FKs already RESTRICT). Removing an `uploads/` row also removes its file. |
| `complexity_tiers` | Saved as a set (R9). Exactly one tier starts at 0. That tier is named `BLAND`, and its name and start never change. Unique starts and names (case-insensitive). Name 1–40 characters, tagline ≤ 120, colors `#RRGGBB`. |
| `store_settings` | Each form saves only its own columns (R11): one switch, the MSRP tuning (start ≥ $0.01, anchor ≥ 0, interval ≥ 1), the presets (positive amounts, no duplicates, at least one, so the account page's top-up always has something to offer), the media base URL (blank or `http(s)://`) and the placeholder (never null). |
| `add_ons` | Create, edit, retire (`active = 0`), restore and reorder (`position`). Name 1–60 characters and unique, pitch 1–160, decline line 1–160, price ≥ $0.01 (existing CHECKs). No delete. |
| `orders`, `order_items`, `order_add_ons`, `order_drains`, `revenue_streams` | Read-only in the console (FR-036a). The console never settles stream payments (R14). |

## Derived, never stored

- **Inverted pair**: two active shirts `(simpler, more complex)`, where `simpler.complexity <
  complex.complexity` and `simpler.finalPrice > complex.finalPrice`. The gap is
  `simpler.finalPrice − complex.finalPrice`.
- **Override distance**: for a shirt with `final_price_usd` set, `final − msrp` in dollars and
  `percentDiff(final, msrp)` (exact, one decimal), marked above or below.
- **Tier change**: a shirt whose `tierOf(score)` under the proposed tiers differs from its current
  tier.
- **Customer totals**: the order count, the lifetime spend (the exact sum of `orders.total_usd`)
  and the balance (the exact sum of the entries).
- **Poster**: an index into `copy.console.posters`, never the same as the browser's last one
  (`df-poster` cookie, R5).

## State transitions

- **Shirt**: inactive ⇄ active. Activating needs ≥ 1 image and a valid catalog. There's no
  terminal state, because shirts are never deleted.
- **Add-on**: active ⇄ retired.
- **Admin flag**: off ⇄ on, from the command line only.
- **Grant**: created once, and immutable after that.

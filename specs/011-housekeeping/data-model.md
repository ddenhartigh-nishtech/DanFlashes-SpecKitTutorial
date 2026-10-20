# Data Model: Housekeeping

Migration `0015_owner_changed`.

## shirts (changed)

| Column | Type | Default | Rule |
|---|---|---|---|
| `owner_changed_at` | text | NULL | NEW. An ISO-8601 time, or NULL. When Dan last changed the shirt in his office (R2). |

- **Backfill**: dial shirts with `updated_at <> created_at`, a final price, `status = 'inactive'`,
  or `listed = 1` take `owner_changed_at = updated_at`. Every other row stays NULL.
- **Stamped by**: `updateShirtCore`, `setShirtStatusCore`, `setShirtListedCore`, `attachImageCore`,
  `moveImageCore`, `detachImageCore`. Never by a store action.

## Rows the sweep deletes (R4)

| Table | What goes |
|---|---|
| `shirts` | each abandoned creation (R3) |
| `shirt_images` | its picture rows |
| `media` | its pictures, unless another shirt uses them or it's the placeholder |

## Derived (not stored)

| Value | Defined as |
|---|---|
| Abandoned creation | `origin = 'dial' AND listed = 0 AND owner_changed_at IS NULL AND created_at < now − 30 days`, with no `order_items` row and no `cart_items` row |
| Stray file | a file in the uploads folder that `isUploadFile` accepts and that no `media.key` names |

## Unchanged

Orders and their lines, carts, every other shirt, users, the media library's other entries, and
settings.

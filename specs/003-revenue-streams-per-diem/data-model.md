# Data Model: Revenue Streams & Per Diem Drain (003)

**Date**: 2026-10-14 | **Plan**: [plan.md](./plan.md) | Base models:
[001](../001-core-storefront/data-model.md), [002](../002-brand-pages-and-shaming/data-model.md)

All changes ship in one migration, `drizzle/0002_*.sql`. `npm run db:migrate` backs up first, and
`getDb()` refuses to serve a database that hasn't applied it (002 R8).

## New table: `revenue_streams`

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK, autoincrement | |
| `user_id` | integer, NOT NULL | FK → `users.id`, ON DELETE RESTRICT |
| `preset` | text, nullable | one of `per_diem`, `expense_report`, `college_fund`, `garage_sale`, `second_mortgage` |
| `custom_name` | text, nullable | 1–40 characters after trimming |
| `amount_usd` | text, NOT NULL | exact money format (001's `money` CHECK), positive, not `0.00`; no upper limit (owner) |
| `schedule` | text, NOT NULL | one of `recurring`, `one_time`, `whenever` |
| `interval_minutes` | integer, nullable | a recurring top-off's own interval (migration 0003); CHECK "recurring → NOT NULL and ≥ 1; otherwise NULL" |
| `starts_at` | text, NOT NULL | ISO-8601 UTC; never in the past when created |
| `ends_at` | text, nullable | ISO-8601 UTC; NULL means ongoing; CHECK `ends_at IS NULL OR ends_at > starts_at` |
| `next_due_at` | text, nullable | the next scheduled payment (recurring or one time); NULL when finished or `whenever` |
| `payments_made` | integer, NOT NULL, default 0 | CHECK `>= 0` |
| `disconnected_at` | text, nullable | set once; never cleared |
| `created_at` | text, NOT NULL | 001's `timestamps` |

Constraints and indexes:
- CHECK: **exactly one** of `preset` and `custom_name` is set.
- Unique partial index `revenue_streams_one_per_diem` on (`user_id`), WHERE
  `preset = 'per_diem' AND disconnected_at IS NULL`. This means one connected per diem per shopper
  (FR-010). Connecting a new per diem first disconnects an **ended** one; a running one blocks it with
  `PER_DIEM_EXISTS`.
- Index on (`user_id`, `next_due_at`) for settlement's "anything due?" read.

**Derived (never stored)**:
- Is it the per diem? `preset = 'per_diem'`.
- Display name: `copy.streams.presets[preset]` or `custom_name`.
- Ended? `ends_at` is set and `ends_at <= now`.
- Connected? `disconnected_at IS NULL`.

**Lifecycle**:
1. **Connected.** Recurring and one-time streams start with `next_due_at = starts_at`; whenever streams
   start with `next_due_at = NULL`.
2. **Paying.** Settlement advances `next_due_at` by the stream's own `interval_minutes` and increments
   `payments_made`.
3. **Finished** (`next_due_at = NULL`): one time after its payment; recurring once the next tick would
   pass `ends_at`.
4. **Disconnected** (any time): no more payments. Past payments stay.

## Changed: `flash_credit_entries`

| Change | Rules |
|---|---|
| `kind` adds `stream` | CHECK, per kind: `stream` rows have a positive amount, `stream_id` NOT NULL, `stream_payment_no >= 1`, and NULL `order_id`, `card_brand` and `card_last4`. 001's `top_up` and `spend` rules are unchanged. |
| `stream_id` integer, nullable | FK → `revenue_streams.id`, ON DELETE RESTRICT |
| `stream_payment_no` integer, nullable | the stream's 1-based payment number |
| unique index (`stream_id`, `stream_payment_no`) | a payment is credited exactly once (SC-003); a double "Cash in" is a no-op |

`created_at` for a scheduled payment is its **due time**, not the time it was settled.

The balance is still the exact decimal sum of the entries (001), and stream entries are always
positive, so it can never go negative.

## Changed: `orders`

| Column | Type | Rules |
|---|---|---|
| `payment_method` | adds `split` | one of `card`, `flash_credit`, `split` |
| `flash_credit_usd` | text, NOT NULL, default `0.00` | the Flash Credit applied; the `money` CHECK |
| `per_diem_drained` | integer (boolean), NOT NULL, default 0 | set at placement when the drain is on and this order took the meter from above $0 to $0 (R5) |

The payment CHECK, per method (it replaces 001's `orders_card_fields`):
- `card`: `flash_credit_usd = '0.00'`, with card brand and last four set
- `flash_credit`: `flash_credit_usd = total_usd`, with no card fields
- `split`: `flash_credit_usd` not `0.00`, with card brand and last four set. "Less than the total"
  is enforced in `placeOrder`, where exact money comparison is available.

The card portion is derived as `total_usd − flash_credit_usd`. A split order has exactly one spend
entry, for `−flash_credit_usd`. Changing the CHECK rebuilds `orders` in 0002, and the migration test
must show every existing order unchanged.

## Changed: `store_settings`

| Column | Type | Default | Rules |
|---|---|---|---|
| `per_diem_drain` | integer (boolean) | 1 | the constitution IV switch |

`StoreSettings` gains `perDiemDrain: boolean`. (A store-wide `stream_pay_period_minutes` shipped in 0002 and
was removed by 0003, which copied its value into each existing recurring stream's interval.) It is
validated by `validateSettings` and seeded.

## New table: `order_drains` (migration 0004)

| Column | Type | Rules |
|---|---|---|
| `order_id` | integer, NOT NULL | FK → `orders.id`, ON DELETE RESTRICT |
| `stream_id` | integer, NOT NULL | FK → `revenue_streams.id`, ON DELETE RESTRICT |

PRIMARY KEY (`order_id`, `stream_id`). There is one row for each stream **other than the current
per diem** that the order took from above $0 to $0, written at placement while the drain is on. The
current per diem's drain stays `orders.per_diem_drained`.

## Derived: what's left of each stream (R12)

Replay all of his stream payments (lots) and his orders in time order. Each order consumes the current
per diem's lots first, then all other lots oldest first; anything beyond is other money. A stream's
"left" is what remains of its lots.

## Derived: the per diem meter

```
perDiemLeft = replay, in time order, the connected per diem's payments (+) and his orders since
              starts_at (−), floored at 0 after every step (a top-off at the same instant as an
              order lands first). Spending past $0 is not carried as debt into the next top-off.
```

- The meter is null when there's no connected per diem, or when the drain is off.
- It's shown while the per diem runs and after it has ended, until he disconnects it or a new per diem
  replaces it.

## Brand copy additions (`src/lib/copy.ts`, not data)

- `copy.streams`:
  - presets: five names
  - schedule names: "Recurring top-off", "Just once", "Whenever I want", each with a hint, and
    interval units (minutes, hours, days, weeks)
  - form labels, the Cash in button, history wording, the empty state, and the sign-in prompt
- `copy.meter`: the label, the achievement state, and the account line
- `copy.celebration`: the $0 achievement on the order confirmation
- `copy.shame.labels.disconnect`: shamed "Disconnect (and settle for less)", neutral "Disconnect"
- `copy.checkout` gains: apply "Apply my Flash Credit ($X available)", remove "Remove Flash Credit",
  the breakdown lines, the confirmation "Put the remaining $Y on my card", and the $0-balance prompt.
  `copy.order.paidSplit` covers the confirmation's payment line.
- `copy.codes` gains `SPLIT_CONFIRMATION_REQUIRED` and `CREDIT_CHANGED` (and retires
  `INSUFFICIENT_FLASH_CREDIT`), plus `INVALID_STREAM_NAME`, `INVALID_STREAM_AMOUNT`, `INVALID_WINDOW`,
  `PER_DIEM_EXISTS`, `STREAM_NOT_FOUND` and `NOT_CASHABLE`

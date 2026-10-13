# Data Model: Brand Pages & Bland-Shirt Shaming (002)

**Date**: 2026-10-13 | **Plan**: [plan.md](./plan.md) | Base model:
[001 data-model.md](../001-core-storefront/data-model.md)

## Changes to existing tables

### `store_settings` (single row, from 001): two new columns

| Column | Type | Default | Meaning |
|---|---|---|---|
| `bland_shaming` | integer (boolean) | 1 | When on, BLAND-tier shirts can't be added to carts (and bland lines can't grow). Adding one opens the endless "You sure about that?" loop. |
| `confirmshaming` | integer (boolean) | 1 | When on, the loop's insist button, cart Remove, and Sign out use shaming labels. |

The migration is `drizzle/0001_*.sql` (`ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT 1`). Existing
databases get both switches **on**. `npm run db:migrate` backs up first (001 R17).

No other tables change. Cart, order, and ledger rows are untouched.

## Derived values (computed, never stored)

- `isBlandShirt(shirt)`: `tierOf(shirt.complexity).minScore === 0`, evaluated at the moment of an
  add, a quantity raise, a guest-cart merge, or a cart audit (data layer).
- `RemovedLine` (001's cart audit result) gains `reason: "retired" | "bland"`. Bland lines are
  removed only while shaming is on.
- `ladder`: active non-bland shirts in ascending complexity order, in shopper shape (no score).
- `recommendationFor(round)`: rounds count from 1, so round *n* recommends
  `ladder[min(n − 1, ladder.length − 1)]`. It returns `null` when the ladder is empty, and the
  escape then goes to `/shirts`.
- `shameFor({ isBland, blandShaming, confirmshaming }, ladder)`: what the shirt page hands to Add to
  Cart. It is `null` (a normal add) unless the shirt is bland and shaming is on. Otherwise it is
  `{ ladder, insistLabel }`.

## Brand copy additions (`src/lib/copy.ts`, not data)

- `copy.about`: the bio sections and the Exhibit A heading
- `copy.shame.lines`: ≥ 8 disparaging lines
- `copy.shame.labels`: `{ insist, remove, signOut }`, each with a `{ shamed, neutral }` pair
- `copy.shame.relent`, `copy.shame.takeIt`, `copy.shame.title` ("You sure about that?")
- `copy.shame.nothingBetter`: the escape label when there's no shirt to recommend (links to
  `/shirts`)
- `copy.nav.about`: the header link
- `copy.codes.BLAND_REFUSED`: the store-side refusal message
- `copy.cart.blandRemovedNotice`: the notice above bland lines pulled from a cart
- `copy.codes.CART_AUDITED`: reworded to cover both retired and bland removals
- `copy.cart.remove` and `copy.auth.signOut` are removed. Their text moves to the neutral labels.

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

- `isBlandShirt(shirt)`: `tierOf(shirt.complexity).minScore === 0`, evaluated at the moment of an add
  or a quantity raise (data layer).
- `ladder`: active non-bland shirts in ascending complexity order, in shopper shape (no score).
- `recommendationFor(round)`: `ladder[min(round, ladder.length − 1)]`, or `null` when the ladder is
  empty (the escape then goes to `/shirts`).

## Brand copy additions (`src/lib/copy.ts`, not data)

- `copy.about`: the bio sections and the Exhibit A heading
- `copy.shame.lines`: ≥ 8 disparaging lines
- `copy.shame.labels`: `{ insist, remove, signOut }`, each with a `{ shamed, neutral }` pair
- `copy.shame.relent`, `copy.shame.takeIt`, `copy.shame.title` ("You sure about that?")
- `copy.codes.BLAND_REFUSED`: the store-side refusal message

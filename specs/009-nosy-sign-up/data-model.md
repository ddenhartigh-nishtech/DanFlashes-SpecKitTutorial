# Data Model: Nosy Sign-Up (009)

There's one migration, `0010_nosy_sign_up`. No money changes, and nothing he types is stored anywhere.

## `store_settings` (from 001), one new switch

| Column | Type | Meaning |
|---|---|---|
| `nosy_sign_up` | integer (boolean), NOT NULL, default 1 | The nosy fields on the sign-up page, Dan's "you skipped a few" line, and the `**` marks with their legend (US1). While off, sign-up is exactly as after 006. |

- It's carried through `StoreSettings` (`nosySignUp`), `settingsSchema`, `getSettings`/`saveSettings`,
  `scripts/seed-data.ts`, `tests/fixtures/catalog.ts` and `setSwitches`.

## What he types into a nosy field

**Nothing is stored.** There's no table, no column, no cookie and no browser storage for it.
- **It exists only** as the value of an unnamed input, outside any form, on his screen.
- **It's cleared** when he leaves the page (research R5).
- **The page reads it only** to know whether a field is empty (research R6). That check never leaves
  his browser.

## Brand copy additions (`src/lib/copy.ts`, not data)

`copy.nosy`:
- `heading`: the section heading over the nosy fields
- `required`: the "Required" mark
- `fields`: the list, in order, each `{ label, masked }`. The starting ten are in the spec's
  Assumptions; `masked` is true for the Social Security Number and mother's maiden name only.
- `skipped`: "Dan noticed you skipped a few. He'll allow it."
- `legend`: "** Actually required."

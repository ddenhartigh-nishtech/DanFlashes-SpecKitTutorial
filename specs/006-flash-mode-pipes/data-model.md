# Data Model: Flash Mode & Pipes Background (006)

There's one migration, `0009_extreme_awesomeness`. No money changes, and no catalog data moves.

## `store_settings` (from 001), two new switches

| Column | Type | Meaning |
|---|---|---|
| `flash_mode` | integer (boolean), NOT NULL, default 1 | The strobe (US1). While off, Extreme Awesomeness turns on only the pipes, if those are on. |
| `pipes_background` | integer (boolean), NOT NULL, default 1 | The pipes (US2). While off, Extreme Awesomeness turns on only the strobe, if that's on. |

- With both off, the Extreme Awesomeness button is hidden (spec FR-002).
- They're carried through `StoreSettings` (`flashMode`, `pipesBackground`), `settingsSchema`,
  `getSettings`/`saveSettings`, `scripts/seed-data.ts`, `tests/fixtures/catalog.ts` and `setSwitches`.

## `users` (from 001), one new column

| Column | Type | Meaning |
|---|---|---|
| `extreme_awesomeness` | integer (boolean), NOT NULL, default 0 | His saved choice (spec FR-009): it's off until he turns it on. |

- **Written**:
  - by `saveExtremeAwesomeness` while he's signed in
  - at sign-up, from the guest cookie
- **Read**:
  - at sign-in, to set the cookie
  - by the layout island, to catch up a device whose cookie is behind (research R2, R4)

## The browser's copy (not in SQLite)

| Name | Where | Value | Lifetime |
|---|---|---|---|
| `df_awesome` | cookie (`path=/`, `SameSite=Lax`, not `httpOnly`, `Secure` in production) | `1` on, `0` off; missing means off | 1 year |

- **Read**:
  - by the inline `<head>` script (first paint)
  - by `ExtremeAwesomeness` (its initial state)
  - by `signUpCore` (a new account keeps the guest's choice)
- **Written**:
  - by the button, at once
  - by `saveExtremeAwesomeness`
  - by `signInCore` (the account's choice takes over)
- **Left alone**: sign-out leaves it.

## Attributes on `<html>` (runtime, not stored)

| Attribute | Set by | Meaning |
|---|---|---|
| `data-awesome="on"` | the inline script (first paint), the button | He has Extreme Awesomeness on. |
| `data-strobe="off"` | `AwesomeState` | The owner's `flash_mode` switch is off. |
| `data-pipes="off"` | `AwesomeState` | The owner's `pipes_background` switch is off. |

- **The strobe** shows under `:root[data-awesome="on"]:not([data-strobe="off"])`.
- **The black field and the pipes** show under `:root[data-awesome="on"]:not([data-pipes="off"])`.

## The pipes engine (in memory only)

The pure engine (`src/lib/pipes/`) carries state that's never stored:
- a grid of occupied cells
- the live pipes: head cell, direction, color
- a seeded random source

Each step returns the drawing commands for that step, which are tube segments, joints, teapots or
"clear".

## Brand copy additions (`src/lib/copy.ts`, not data)

`copy.awesome`:
- `label`: "Extreme Awesomeness"
- the on and off state lines
- the short two-line phone forms of the label

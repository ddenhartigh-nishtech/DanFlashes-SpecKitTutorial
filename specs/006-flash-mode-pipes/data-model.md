# Data Model: Flash Mode & Pipes Background (006)

There's one migration, `0009_awesome_switches`. No money changes, no catalog data moves, and nothing
about the shopper is stored by the store.

## `store_settings` (from 001), two new switches

| Column | Type | Meaning |
|---|---|---|
| `flash_mode` | integer (boolean), NOT NULL, default 1 | The strobe (US1). While off, Extreme Awesomeness turns on only the pipes, if those are on. |
| `pipes_background` | integer (boolean), NOT NULL, default 1 | The pipes (US2). While off, Extreme Awesomeness turns on only the strobe, if that's on. |

- With both off, the Extreme Awesomeness button is hidden (spec FR-002).
- They're carried through `StoreSettings` (`flashMode`, `pipesBackground`), `settingsSchema`,
  `getSettings`/`saveSettings`, `scripts/seed-data.ts`, `tests/fixtures/catalog.ts` and `setSwitches`.

## His choice (in his browser, not in SQLite)

| Key | Where | Value | Lifetime |
|---|---|---|---|
| `df-awesome` | `localStorage` | `"1"` on; missing or `"0"` off | until he changes it, or clears his browser |

- **Read**:
  - by the inline `<head>` script (first paint)
  - by `ExtremeAwesomeness` (after hydration)
  - by other open tabs, through the `storage` event
- **Written**: by the button, at once.
- **Never** sent to the store, or saved to an account (spec FR-009).

## Runtime markers (not stored)

| Marker | Set by | Meaning |
|---|---|---|
| `data-awesome="on"` on `<html>` | the inline script (first paint), the button | He has Extreme Awesomeness on. The strobe and the black field show under `:root[data-awesome="on"]`. |
| the switch-off `<style>` | the layout island, from `switchOffCss(settings)` | Undoes whichever feature the owner has off (research R4). It's absent while both are on. |
| `data-strobe-step="0"…"4"` on `<html>` | the inline script (step 0), `StrobeClock` | The strobe's current step: `strobeCss()` maps it to colors (research R7). |
| `data-steady` on an element | markup | Its subtree never strobes (research R7). |

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

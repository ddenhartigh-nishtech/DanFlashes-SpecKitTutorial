# Data Model: Urgency Engine (004)

There are no new tables. Everything urgent is copy, or computed from the shirt and the clock.

## Changed: `store_settings` (migration 0007)

| Column | Type | Rules |
|---|---|---|
| `fake_scarcity` | integer (boolean), NOT NULL, default 1 | "Only 1 left!" on shirt cards, the detail page, cart lines; "found another one" on adds and raises (US1) |
| `countdown_timers` | integer (boolean), NOT NULL, default 1 | the shared deal and hold countdown (US2) |
| `social_proof` | integer (boolean), NOT NULL, default 1 | "looking right now", "just bought this pattern", and the purchase pop-ups (US3) |

All three map to `StoreSettings` as `fakeScarcity`, `countdownTimers` and `socialProof`. They're
validated as booleans like 001–003's switches, and seeded on (`scripts/seed-data.ts`).

## Derived (never stored on the server)

- **Stock line** (R2): `stockLine({ isBland, active }, fakeScarcity)` → `"scarce"`, `"plenty"` or
  `null`. Off, or retired, means `null`.
- **Countdown** (R4): `remainingMs(now, anchor) = COUNTDOWN_MS − ((now − anchor) mod COUNTDOWN_MS)`,
  where `COUNTDOWN_MS = 600_000`. It's shown as `MM:SS.mmm`, from `10:00.000` down to `00:00.001`, and
  never negative.
- **Looking right now** (R5): `lookingNow(shirtId, now)` is an integer from 3 to 40, never 0. It's a
  per-shirt base plus a slow drift. A bland shirt shows 0.
- **Just bought this pattern** (R5): `buyerFor(shirtId, now)` is a member of the fake cast, stable
  for 10 minutes.
- **Purchase pop-up** (R6): a random member of the cast, and a random active non-bland shirt (name and
  slug) from `loadPopCandidates()`. The candidates are empty while `social_proof` is off.

## Browser storage (timestamps only)

| Key | Where | Holds | Used by |
|---|---|---|---|
| `df-countdown-anchor` | `localStorage` | epoch ms of the first countdown in this browser | `Countdown` (every tab and page) |
| `df-pop-next` | `sessionStorage` | epoch ms the next pop-up is due | `PurchasePops`, so the rhythm survives a full reload |

Both are read inside `try/catch`. If storage is unavailable, each falls back to an in-memory value
for the page.

## Brand copy additions (`src/lib/copy.ts`, not data)

`copy.urgency`:
- `scarce`, `plenty`
- `foundAnother`
- `deal`, `hold`
- `looking(n)`, `nobodyLooking`
- `boughtThis(name, department)`, `bought(name, department, shirt)`
- `dismissPop`
- `cast`: at least 8 `{ name, department }`

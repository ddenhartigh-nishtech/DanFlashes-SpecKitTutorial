# Contract changes (003)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md), and
[002 changes.md](../../002-brand-pages-and-shaming/contracts/changes.md).

## Changed pages

| Route | Change | Spec |
|---|---|---|
| *every page* | Signed-in shoppers with a connected per diem, while the drain is on, get a floating **per diem gauge** (fixed, bottom-left; it shifts no layout): "Per diem left $X.XX", or the achievement state at $0. It links to `/account#revenue-streams`. It settles due payments first. Above it, every non-per-diem stream that has paid in and is at $0 gets a "[Stream]: GONE" pop. The gauge's GONE state and every pop have an (x) (`dismissDrain`). | US2, FR-013, US4, FR-029, FR-030 |
| `/account` | A new **Revenue Streams** section (`#revenue-streams`): the connect form, then each stream with its name, amount, schedule, window (local time), and next payment or a **Cash in** button, plus a **Disconnect** button labeled by confirmshaming. The Flash Credit history names stream payments. The meter's value sits beside the balance. While the drain is on, each stream shows how much is left, or GONE. It settles first. | US1, FR-001–FR-011, FR-013, US4, FR-025 |
| `/checkout` | Settles due payments before showing the Flash Credit balance. The card / Flash Credit radios give way to **Apply my Flash Credit**: covering the total pays by credit alone; otherwise it shows the split (credit applied, remainder on the card) with a required **"Put the remaining $Y on my card"** confirmation and the card fields. **Remove Flash Credit** undoes it before placing. | FR-006, FR-007, US3, FR-018–FR-023 |
| `/orders/[id]` | When the order has `per_diem_drained` and the drain is on, a loud **per diem achievement** celebration tops the confirmation. A split order's payment line shows both parts. Every stream the order drained adds its own achievement card, stacked. | US2, FR-014, FR-022, US4, FR-026, FR-027 |

Guests see no meter. `/account` already redirects guests to sign in (001), which satisfies FR-011.

## New actions

| Action | Input | Success | Errors |
|---|---|---|---|
| `connectStream` | `preset` (a preset key) **or** `customName` (1–40 chars); `amountUsd` (> `0.00`, no upper limit, dollars and cents); `schedule` (`recurring` \| `one_time` \| `whenever`); for `recurring`, `intervalCount` (1–1,000) and `intervalUnit` (`minutes` \| `hours` \| `days` \| `weeks`); `startsAt` (ISO UTC, or empty for now); `endsAt` (ISO UTC) **or** `ongoing=on` | The stream is created and settled at once (a start of now pays its first recurring or one-time payment); `refresh()` | `SIGN_IN_REQUIRED`, `INVALID_STREAM_NAME`, `INVALID_STREAM_AMOUNT`, `INVALID_INTERVAL`, `INVALID_WINDOW` (start in the past, end ≤ start, or neither an end nor ongoing), `PER_DIEM_EXISTS` (a running per diem is still connected) |
| `dismissDrain` | `streamId`, `paymentNo` (the payment count the page rendered) | Clears that drain's GONE pop: `dismissed_drain_payment_no` becomes `paymentNo` if it's higher; `refresh()` | `SIGN_IN_REQUIRED`, `STREAM_NOT_FOUND` (not his, or a `paymentNo` it hasn't made) |
| `disconnectStream` | `streamId` | `disconnected_at` is set; past payments stay; `refresh()` | `SIGN_IN_REQUIRED`, `STREAM_NOT_FOUND` (not his, already disconnected, or one-time, which can't be disconnected) |
| `cashIn` | `streamId`, `paymentNo` (as rendered) | One `stream` entry for exactly `amount_usd`; a repeated `paymentNo` is a no-op success; `refresh()` | `SIGN_IN_REQUIRED`, `STREAM_NOT_FOUND`, `NOT_CASHABLE` (not "whenever", disconnected, or outside the window) |

Every message comes from `copy.codes`, in brand voice.

## Changed actions

| Action | Change |
|---|---|
| `placeOrder` | **Inputs**: `method` is replaced by `useFlashCredit` (`on` or absent), `expectedCreditUsd` (the credit he was shown) and `confirmSplit` (`on` when splitting). Card fields are required whenever a card portion remains. **Inside its existing transaction** it settles his streams, recomputes the split from the live balance, and records `flash_credit_usd`, the method (`card`, `flash_credit` or `split`), `per_diem_drained`, and an `order_drains` row for every other stream it drained (drain on). **New errors**: `CREDIT_CHANGED` (returns the new `creditUsd`/`cardUsd`) and `SPLIT_CONFIRMATION_REQUIRED`. **Retired**: `INSUFFICIENT_FLASH_CREDIT`. Any refusal writes nothing. |
| `topUpFlashCredit` | Unchanged, but the history now interleaves stream payments. |

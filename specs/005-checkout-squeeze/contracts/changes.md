# Contract changes (005)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md), and the 002–004 changes.

## Changed pages

| Route | Change | Spec |
|---|---|---|
| `/checkout` | While `pre_checked_add_ons` is on, an **Add-ons** section lists every offered add-on with its name, pitch and price, already ticked (`data-testid="add-on"`), every time the page opens. Unticking one shows its decline line while confirmshaming is on. The **Total** (`data-testid="total"`) is live: the shirts plus the ticked add-ons. The Flash Credit split (003) uses that total. | US1, FR-004, FR-005, FR-008 |
| `/orders/[id]`, `/account` (purchase history) | Each add-on bought is its own row, between the subtotal and shipping (`data-testid="add-on-line"`): its name and the price paid. | US1, FR-007 |
| `/cart` | While `roach_motel` is on, **Remove**, and **Update** when it lowers the quantity, open "Are you sure?" and then "Are you sure sure?". Each has a keep button, which is the default, and a yes button labelled by confirmshaming. Only the second yes submits. Adding, and raising a quantity, never ask. | US2, FR-009–FR-011 |

## Changed actions

| Action | Change | Spec |
|---|---|---|
| `placeOrder` | **New input**: `addOnId`, repeated, once per ticked add-on, de-duplicated (a repeated id counts once). `expectedTotalUsd` now includes them. **Inside the existing transaction**: while `pre_checked_add_ons` is on, it re-resolves the ticked add-ons from `add_ons`. If any isn't offered, or the recomputed total differs, it returns `PRICE_CHANGED` with the new total and nothing is charged. While off, it ignores add-ons. On success it inserts `order_add_ons` (the name and price snapshot) and charges the total (shirts plus add-ons) by card, Flash Credit, or a split. A replay returns the same order. | US1, FR-006–FR-008 |
| `removeCartItem`, `updateCartItem` | Unchanged on the server. The roach motel is a gate in front of them in the browser (research R5). | US2 |

No new actions.

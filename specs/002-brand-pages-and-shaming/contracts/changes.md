# Contract changes (002)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md) and
[001 actions.md](../../001-core-storefront/contracts/actions.md).

## New page

| Route | Access | Must show | Spec |
|---|---|---|---|
| `/about` | anyone | Dan's bio (copy), plus **Exhibit A**: the most expensive active shirt with its badge and price, linked. Linked from the header on every page (desktop nav and phone menu). | US3, FR-001–FR-004 |

## Changed pages

| Route | Change | Spec |
|---|---|---|
| `/shirts/[slug]` | For a BLAND-tier shirt with shaming on, Add to Cart opens the "You sure about that?" dialog instead of adding. It has three actions: take the recommendation (link), relent (close), and insist (next round, endless). | US1, FR-006–FR-009 |
| `/cart` | Each line's Remove label follows confirmshaming. | US2, FR-013 |
| `/account` | The Sign out label follows confirmshaming. | US2, FR-013 |
| *header* | Adds an "About" link. | FR-001 |

## Changed actions

| Action | Change |
|---|---|
| `addToCart` | New error code **`BLAND_REFUSED`**, returned when the shirt is BLAND-tier and shaming is on. Nothing is written. |
| `updateCartItem` | Returns **`BLAND_REFUSED`** when a BLAND-tier line's quantity would increase while shaming is on. Decreases (including 0, which removes the line) still work. |

No other contracts change.

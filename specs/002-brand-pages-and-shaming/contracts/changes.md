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
| `/cart` | Each line's Remove label follows confirmshaming. While shaming is on, bland lines are pulled from the cart and listed in a brand-voice notice, next to 001's retired-shirt notice. | US2, FR-013, US1-8, FR-010 |
| `/checkout` | The cart audit also pulls bland lines while shaming is on. Checkout then refuses with 001's `CART_AUDITED`, whose copy now covers both reasons. | US1-8, FR-010 |
| `/account` | The Sign out label follows confirmshaming. | US2, FR-013 |
| *header* | Reads About, Shirts, Account, then a neon cart icon with the item count (the link is named "Cart"). Home is dropped, since the logo links home. On phones the cart icon stays in the bar beside Menu. | FR-001, owner request (T045) |

## Changed actions

| Action | Change |
|---|---|
| `addToCart` | New error code **`BLAND_REFUSED`**, returned when the shirt is BLAND-tier and shaming is on. No cart line is written. As with any refused add, the shopper's (empty) cart and guest cookie may already exist. |
| `updateCartItem` | Returns **`BLAND_REFUSED`** when a BLAND-tier line's quantity would increase while shaming is on. Decreases (including 0, which removes the line) still work. |

| `signIn` / `signUp` (guest cart merge) | While shaming is on, bland lines in the guest cart are not carried into the account's cart. |
| `placeOrder` | Unchanged signature. Its existing audit step now also removes bland lines while shaming is on, so it returns `CART_AUDITED` and writes no order. |

No other contracts change.

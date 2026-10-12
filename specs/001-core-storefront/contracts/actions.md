# Contract: Server Actions (mutations)

Every mutation is a Next.js Server Action. Inputs are validated with Zod on the server. **No action
accepts a price or a total from the client** (FR-024). Each action returns
`{ ok: true, ... } | { ok: false, code, message }`. The `message` is brand-voice copy safe to show to
the shopper, and `code` is stable for tests.

## Cart

| Action | Input | Success | Error codes |
|---|---|---|---|
| `addToCart` | `slug`, `size` | `{ itemCount }`. Creates a guest cart and cookie if none exists. | `SIZE_REQUIRED`, `SHIRT_NOT_FOUND`, `SHIRT_REMOVED` |
| `updateCartItem` | `slug`, `size`, `quantity` (0–99; 0 removes) | `{ itemCount }` | `NOT_IN_CART`, `INVALID_QUANTITY` |
| `removeCartItem` | `slug`, `size` | `{ itemCount }` | `NOT_IN_CART` |

## Auth

| Action | Input | Success | Error codes |
|---|---|---|---|
| `signUp` | `email`, `password` (≥ 8 chars), `displayName?`, `next?` | Creates the user, starts a session, **merges the guest cart**, and redirects to `next` or `/account`. | `EMAIL_TAKEN`, `INVALID_EMAIL`, `WEAK_PASSWORD` |
| `signIn` | `email`, `password`, `next?` | Starts a session, **merges the guest cart**, and redirects. | `BAD_CREDENTIALS` (the same code for an unknown email and a wrong password) |
| `signOut` | — | Deletes the session row and clears the cookie. | — |

## Checkout

| Action | Input | Success | Error codes |
|---|---|---|---|
| `placeOrder` | `checkoutToken`, `expectedTotalCents` (used **only** to detect a price change, never to charge), `method: "card" \| "flash_credit"`, and for card: `cardNumber`, `expiry` (MM/YY), `cvc` | Redirect to `/orders/[id]` | `GATE_SIGN_IN_REQUIRED`, `CART_EMPTY`, `SHIRT_REMOVED`, `PRICE_CHANGED` (returns the new total, and the shopper resubmits), `TOO_COMPLICATED` (total above the safe limit), `CARD_INVALID_NUMBER`, `CARD_EXPIRED`, `CARD_INVALID_CVC`, `INSUFFICIENT_FLASH_CREDIT` |

**Guarantees:**
- A replayed `checkoutToken` returns the original order and never creates a second one.
- Any error writes nothing and leaves the cart intact.
- The card number and CVC are never logged, persisted, or echoed back.

## Flash Credit

| Action | Input | Success | Error codes |
|---|---|---|---|
| `topUpFlashCredit` | `amountDollars` (a preset or a custom integer ≥ 1), `cardNumber`, `expiry`, `cvc` | `{ balanceCents }` and a new `top_up` entry | `SIGN_IN_REQUIRED`, `INVALID_AMOUNT`, `TOO_COMPLICATED`, `CARD_*` (as above) |

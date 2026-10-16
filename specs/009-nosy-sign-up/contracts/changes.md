# Contract changes (009)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md), and the 002–006 changes.

## Changed pages

| Route | Change | Spec |
|---|---|---|
| `/sign-up` (including `?next=/checkout`) | While `nosy_sign_up` is on, after the real fields comes one long scroll of nosy fields (`data-testid="nosy-field"`), each marked "Required". They're unnamed inputs **outside the sign-up `<form>`**, with autofill, spellcheck and password managers off; SSN and mother's maiden name are masked. Email and password are marked `**`, and "** Actually required." sits above Sign up, which comes last. With any nosy field blank, the first press shows "Dan noticed you skipped a few. He'll allow it." (`data-testid="nosy-skipped"`), and the next press signs up. | US1, FR-003–FR-010 |
| `/sign-in`, `/account`, `/checkout` | Unchanged (FR-011). | — |

## Actions

| Action | Change | Spec |
|---|---|---|
| `signUp` | **Unchanged.** It reads `displayName`, `email`, `password` and `next`, as before. The nosy fields can't reach it: they have no names, and they're outside the form. | FR-004, FR-008 |

No new actions. Nothing touches a price, a total, the cart or an order.

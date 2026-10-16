# Contract changes (006)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md), and the 002–005 changes.

## Changed pages

| Route | Change | Spec |
|---|---|---|
| Every page under the root layout, including 404 and 500 | **The header** has the Extreme Awesomeness button (`data-testid="extreme-awesomeness"`, a `<button aria-pressed>`) beside the cart, at every size, while either switch is on. **`<html>`** carries `data-awesome="on"` from first paint while he has it on. **The strobe**: backgrounds, borders and headings cycle, while prices, tier badges, Add to Cart, dialogs, the corner, pop-ups and countdowns hold steady (`data-steady`). **The pipes**: a fixed `<canvas data-testid="pipes">` grows behind everything on a black field. | US1, US2, FR-006–FR-018 |
| `/teapot` (418), the `global-error` screen | Unchanged. They stand alone, without the header (research R9). | — |

## New action

| Action | Input | Result | Spec |
|---|---|---|---|
| `saveExtremeAwesomeness` | `on` (boolean) | Sets `df_awesome` (1 year, readable by the page) and, while he's signed in, saves `users.extreme_awesomeness`. Returns nothing a page needs: the button has already flipped. Never fails for a guest. | US1 AC6–AC7, FR-009 |

## Changed actions

| Action | Change | Spec |
|---|---|---|
| `signUp` | A new account is saved with the guest's `df_awesome` choice (missing means off). | US1 AC7, FR-009 |
| `signIn` | After the session starts, `df_awesome` is set to the account's choice. The account takes over. | US1 AC7, FR-009 |
| `signOut` | Unchanged: `df_awesome` stays. | Edge Cases |

No other action changes. Nothing touches a price, a total, the cart or an order (FR-004).

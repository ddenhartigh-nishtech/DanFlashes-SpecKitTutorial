# Contract changes (006)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md), and the 002–005 changes.

## Changed pages

| Route | Change | Spec |
|---|---|---|
| Every page under the root layout, including 404 and 500 | **The header** has the Extreme Awesomeness button (`data-testid="extreme-awesomeness"`, a `<button aria-pressed>`) beside the cart, at every size, while either switch is on. **`<html>`** carries `data-awesome="on"` from first paint while his browser has it on. **The strobe**: backgrounds and borders cycle, while prices, tier badges, Add to Cart, dialogs, the corner, pop-ups and countdowns hold steady (`data-steady`). **The pipes**: a fixed `<canvas data-testid="pipes">` grows behind everything on a black field. **While a switch is off**, the page carries a `<style>` that undoes that feature. | US1, US2, FR-006–FR-018 |
| `/teapot` (418), the `global-error` screen | Unchanged. They stand alone, without the header (research R9). | — |

## Actions

None. There's no new or changed Server Action. His choice never leaves his browser (research R2), and
nothing touches a price, a total, the cart, an order or an account (FR-004).

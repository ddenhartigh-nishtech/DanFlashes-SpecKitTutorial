# Contract: Pages (UI routes)

The URLs and what each page MUST show. Copy on every page uses the Dan Flashes voice (FR-034).
Every page is responsive from 360px phones to desktop (FR-036). Every shirt appearance shows exactly one **badge**, either its tier name or BLAND (FR-012). **No
page ever renders a complexity score** (FR-002, SC-003).

| Route | Access | Must show | Spec |
|---|---|---|---|
| `/` | anyone | Hype headline. Featured active shirts: `featured: true`, or else the top 4 by complexity. A link to `/shirts`. | US1-1, FR-010 |
| `/shirts` | anyone | Grid of active shirts: image, name, style, badge, price. Filters and sort come from the query string. | US1-2…7, FR-011/012 |
| `/shirts/[slug]` (active) | anyone | Zoom/enhance viewer with the badge overlaid, name, style, price, description, sizes S–XXL, and Add to Cart. | US2-1…4, FR-013 |
| `/shirts/[slug]` (inactive) | anyone with the link (linked only from order history) | Images, name, style, badge, description, and a "Retired from the floor" banner. No price, no Add to Cart. | US3-7, FR-014 |
| `/shirts/[slug]` (unknown) | — | 404 | |
| `/cart` | anyone | Runs the cart audit first, and shows a notice listing any removed lines. Lines show image, name, badge, size, qty controls, remove, and final price, plus a running total and a Checkout button. **Empty**: "You sure about that?" with a spotlight on the most expensive active shirt and a link to `/shirts?tier=<top tier id>&sort=price-desc`. | US2-6/7, FR-015…018 |
| `/checkout` | signed in (when `checkout_gate` is on) | Runs the cart audit first, and redirects to `/cart` if the cart is now empty. Shows re-resolved lines with badges, Subtotal, Shipping $0.00, Tax $0.00, and Total, a price-changed notice when applicable, and the payment method choice (Faux Card / Flash Credit with the balance). | US3, US4, FR-021…031 |
| `/orders/[id]` | owner of the order | Confirmation and receipt: lines (snapshot name, badge, size, qty, price, linked to the shirt page), Subtotal/Shipping/Tax/Total, payment (brand ••••last4, or Flash Credit). | US3-4, FR-030/031 |
| `/account` | signed in | Purchase history (newest first, same line detail as the receipt) and the Flash Credit balance, entry history, and top-up form (presets plus a custom amount). | US3-6, US4, FR-024, FR-032/033 |
| `/sign-in`, `/sign-up` | guests | Email/password forms. Accept `?next=` (only relative paths are honored) and redirect there after success. | FR-020/021 |
| *any unknown URL* | anyone | Branded 404 page (`not-found.tsx`) with a link back to the shirts. | FR-037 |
| *any server error* | anyone | Branded 500 page (`error.tsx`, with `global-error.tsx` as the last resort) and a "try again" button. | FR-037 |
| `/teapot` | anyone | **HTTP 418 I'm a teapot.** A branded HTML page explaining that Dan Flashes does not sell teapots. Served by a route handler. | FR-037 |

## `/shirts` query string

| Param | Values | Default |
|---|---|---|
| `tier` | `complexity_tiers.id`. Repeatable (`?tier=4&tier=5`). | all tiers |
| `minPrice`, `maxPrice` | dollars, cents optional (e.g. `299.99`) | unbounded |
| `sort` | `complexity-desc` (Most Complicated), `complexity-asc`, `price-desc`, `price-asc` | `complexity-desc` |
| `style` | `polo`, `button-down` | both |

Invalid values are ignored rather than causing an error. Every active filter is ANDed (US1-3). BLAND
is just the lowest tier, so `?tier=1` shows only bland shirts, and leaving it out of a tier selection
hides them.

## Checkout gate behavior

When `store_settings.checkout_gate = true`, a guest requesting `/checkout` is redirected to
`/sign-in?next=/checkout` with gate copy that makes it sound like a privilege (US3-1). When it is
`false`, guests reach `/checkout`, and only Faux Card is offered.

## Shared image behavior

Every shirt image renders through one component (`ShirtImage`). It resolves the URL from the media
key and `store_settings.media_base_url`, and it falls back to the configured placeholder media when
the shirt has no image or the image fails to load (FR-019, FR-035).

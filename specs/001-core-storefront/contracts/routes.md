# Contract: Pages (UI routes)

The URLs and what each page MUST show. Copy on every page uses the Dan Flashes voice (FR-029).
Every price shown is paired with its complexity score (FR-010).

| Route | Access | Must show | Spec |
|---|---|---|---|
| `/` | anyone | Hype headline. Featured shirts: `featured: true`, or else the top 4 by complexity. A link to `/shirts`. | US1-1, FR-008 |
| `/shirts` | anyone | Grid of active shirts: image, name, style, complexity, price, and a BLAND badge when bland. Filters and sort come from the query string. | US1-2…6, FR-009, FR-011 |
| `/shirts/[slug]` | anyone | Zoom/enhance viewer, name, style, complexity, price, description, sizes S–XXL, and Add to Cart. Returns 404 for unknown or removed shirts. | US2, FR-012 |
| `/cart` | anyone | Items (shirt, size, qty, score, final price), qty change and remove, running total, and a Checkout button. Empty state links back to `/shirts`. | US2-5, FR-013/014 |
| `/checkout` | signed in (when `checkoutGate` is on) | Re-resolved line items and total, a price-changed notice when applicable, and the payment method choice (Faux Card / Flash Credit, with the balance shown). | US3, US4, FR-020…026 |
| `/orders/[id]` | owner of the order | Confirmation and receipt: items, total, payment (card brand ••••last4, or Flash Credit). | US3-3, FR-026 |
| `/account` | signed in | Purchase history (newest first) and the Flash Credit balance, entry history, and top-up form (presets plus a custom amount). | US3-5, US4, FR-019, FR-027/028 |
| `/sign-in`, `/sign-up` | guests | Email/password forms. Accept `?next=` (only relative paths are honored) and redirect there after success. | FR-015/016 |

## `/shirts` query string

| Param | Values | Default |
|---|---|---|
| `minScore`, `maxScore` | integers ≥ 0 | unbounded |
| `minPrice`, `maxPrice` | whole dollars | unbounded |
| `sort` | `complexity-desc`, `complexity-asc`, `price-desc`, `price-asc` | `complexity-desc` |
| `style` | `polo`, `button-down` | both |

Invalid values are ignored rather than causing an error. Every active filter is ANDed (US1-3).

## Checkout gate behavior

When `tactics.checkoutGate = true`, a guest requesting `/checkout` is redirected to
`/sign-in?next=/checkout` with gate copy that makes it sound like a privilege (US3-1). When it is
`false`, guests reach `/checkout`, and only Faux Card is offered.

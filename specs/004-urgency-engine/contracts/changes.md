# Contract changes (004)

These are deltas to [001 routes.md](../../001-core-storefront/contracts/routes.md),
[001 actions.md](../../001-core-storefront/contracts/actions.md),
[002 changes.md](../../002-brand-pages-and-shaming/contracts/changes.md), and
[003 changes.md](../../003-revenue-streams-per-diem/contracts/changes.md).

Every change below appears only while its switch is on: `fake_scarcity`, `countdown_timers`, or
`social_proof`. None of them changes a price, a total, the cart, or checkout's behavior.

## Changed pages

| Route | Change | Spec |
|---|---|---|
| *every page* | **Purchase pop-ups** (social proof), one at a time, every 20–40 s: "[Name] from [Department] just bought [shirt]", linking to the shirt. At `md` and up they're fixed bottom-right. Below `md` they're a full-width banner just under the sticky header. Each slides away after about 6 s and has an (x). They never cover the header or the bottom-left drain corner. | US3, FR-006, FR-015 |
| `/`, `/shirts`, `/about` | Every shirt card carries its stock line: "Only 1 left!", or "Plenty left. Nobody wants these." on a bland shirt (scarcity). | US1, FR-007, FR-010 |
| `/shirts/[slug]` | Beside the price, and never replacing it: the stock line (scarcity), and the deal countdown "This price won't last." `MM:SS.mmm` (countdown). Below Add to Cart: "N people are looking at this shirt right now" and "[Name] from [Department] just bought this pattern" (social proof). A bland shirt says "0 people are looking at this shirt right now" and names no buyer. A retired shirt shows none of it. | US1–US3, FR-007, FR-011, FR-014 |
| `/cart` | Each line's stock line (scarcity). While the cart has lines, "Your shirts are reserved for `MM:SS.mmm`" (countdown), on the same clock as the deal. | US1, US2, FR-007, FR-011 |
| `/checkout` | The same hold countdown. | US2, FR-011 |

The order confirmation, account, sign-in and sign-up pages get only the pop-ups.

## Changed actions

| Action | Change | Spec |
|---|---|---|
| `addToCart` | On success, with scarcity on and a non-bland shirt, the message is "It's in the cart. Excellent decision. Oh wait, we found another one!" Errors are unchanged. | US1 AC4, FR-009 |
| `updateCartItem` | On success, with scarcity on, a non-bland shirt, and a **higher** quantity than before, the state carries the message "Oh wait, we found another one!", which `CartQuantityForm` now shows. Lowering, or an unchanged quantity, has no message. Errors are unchanged. | US1 AC4, FR-009 |

There are no new actions. `placeOrder` is untouched.

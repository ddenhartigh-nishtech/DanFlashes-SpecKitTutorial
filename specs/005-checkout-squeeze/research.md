# Research: Checkout Squeeze (005)

Decisions that turn the spec into a buildable design. The stack is 001's (Next.js 16.4 with Cache
Components, SQLite via Drizzle, Vitest and Playwright). There are no new packages.

## R1. Storage: two tables, two switches, one migration

- **Decision**: migration `0008` adds:
  - **`add_ons`**, owner data:
    - `name` (unique, 1–60 characters)
    - `pitch` and `decline_line` (each 1–160 characters)
    - `price_usd` (exact money, greater than `0.00`, no ceiling)
    - `active` (boolean, default on) and `position`
  - **`order_add_ons`**, one row per add-on bought: `order_id` and `add_on_id` (both FK, ON DELETE
    RESTRICT, primary key together), plus the `name` and `price_usd` paid, snapshotted.
  - **`store_settings`**: `pre_checked_add_ons` and `roach_motel`, booleans, NOT NULL, default 1.
- **Seeding**: the starting four go in the seed fixture (`scripts/seed-data.ts`), and `seedCatalog`
  inserts them idempotently (`onConflictDoNothing` on `name`). After pulling, `npm run db:migrate`
  then `npm run db:seed` adds them to an existing database without touching anything else.
- **Rationale**:
  - Add-ons are product data, which lives in SQLite (CLAUDE.md, constitution), so the owner edits
    them in Studio.
  - The snapshot keeps history true when the owner renames or reprices one, like `order_items` (001).
  - Add-ons are retired, never deleted (FK RESTRICT), like shirts.
- **Alternatives**: add-ons in `copy.ts` were rejected: the spec requires them to be owner-adjustable
  without code. A JSON column on `orders` was rejected: it can't be constrained, and it's unlike
  `order_items`.

## R2. Totals are one pure function

- **Decision**: a new `src/lib/checkout/totals.ts` holds `orderTotals({ subtotalUsd, addOnPrices,
  shippingUsd, taxUsd })` → `{ addOnsUsd, totalUsd }`. It's exact (`money.ts`), so 0.10 + 0.20 is
  0.30. Checkout's live total, `placeOrder`, and every test use it.
- **Rationale**: one place for the sum (constitution VI). Every order satisfies "total = shirts +
  add-ons" by construction.

## R3. The server re-resolves every add-on at placement

- **Decision**:
  - **Input**: `placeOrder` takes `addOnIds` (the ticked boxes, parsed from repeated `addOnId` form
    fields), alongside the existing `expectedTotalUsd`, which now includes the ticked add-ons. The
    ids are de-duplicated first, so a tampered form that names one twice is charged once, and the
    (`order_id`, `add_on_id`) key never throws (analysis U1).
  - **Re-resolution**: inside the existing transaction, and only while `pre_checked_add_ons` is on,
    it loads those add-ons from `add_ons`.
  - **Refusal**: if any id isn't offered (unknown or inactive), or the recomputed total differs from
    `expectedTotalUsd`, it returns 001's existing `PRICE_CHANGED` with the new total. Nothing is
    charged.
  - **Switch off**: the ids are ignored and no add-ons are charged (FR-002). A stale page that
    still showed them gets `PRICE_CHANGED`.
  - **Recording**: on success it inserts one `order_add_ons` row per add-on, with its name and price
    at that moment. The split (003) and the drains (003 R12) use the full total, so they include the
    add-ons with no extra code.
- **Rationale**: server-authoritative pricing (constitution). Reusing `PRICE_CHANGED` keeps checkout's
  one "the total moved" path.

## R4. Checkout: ticked by default, every time

- **Decision**:
  - **The page** (server) passes `CheckoutForm` the offered add-ons (`id`, `name`, `pitch`,
    `declineLine`, `priceUsd`, when the switch is on), the shirts' subtotal, and the confirmshaming
    switch.
  - **The form** (client) keeps a `ticked` set that starts as every add-on (Q3: nothing is
    remembered, because a fresh page mounts a fresh form).
  - **The live total** is `orderTotals(…)` from the ticked prices. The split box (003) uses that live
    total.
  - **Decline lines**: an unticked add-on shows its `declineLine` only while confirmshaming is on.
  - **Hidden fields**: one `addOnId` per ticked add-on, and `expectedTotalUsd` set to the live total.
  - **Display**: `OrderSummary` at checkout shows the lines, the subtotal, shipping and tax. The
    add-on rows and the **Total** (`data-testid="total"`) belong to the form, because they change as
    he ticks.
  - **After a refusal**: `placeOrderAction` already refreshes the page on any failure. The form is
    keyed by the add-on list's ids *and* prices (e.g. `1:49.99,2:89.99`), so a retired, added or
    repriced add-on remounts it with everything ticked again (analysis I1).
- **Rationale**: the total has to react to clicks, so it lives in the client. The server still decides
  what's charged (R3).
- **Alternatives**: remembering unticks in a cookie was rejected (the owner said Q3 A).

## R5. The roach motel is a client gate in front of two existing forms

- **Decision**:
  - **The gate**: a client component, `ConfirmTwice`, wraps a form. While `roach_motel` is on and its
    `when(form)` says so, it cancels the submit and opens a native `<dialog>`: "Are you sure?" →
    "Are you sure sure?". Only the second yes submits the form for real, with `requestSubmit` and a
    ref that lets that one submit through. The keep button is the default, focused first, and Escape
    or a backdrop click keeps the line.
  - **Remove** (`src/app/cart/page.tsx`): `when` is always true.
  - **CartQuantityForm**: `when` is true when the new quantity is lower than the current one. Raises
    pass straight through, and still "find another one" (004).
  - **Labels**: the yes buttons use 002's `labelFor` (`removeYes`, `lowerYes`), shamed or neutral.
    The questions are the same either way.
  - **Store removals**: the cart audit's removals (retired or bland lines) never pass through the gate
    (FR-012).
  - **Strict Mode**: the dialog closes in its effect's cleanup, the 002 lesson (R7 there).
- **Rationale**: it's pure friction, not a rule. The server's update and remove stay exactly as they
  are, and a direct request still works, which is fine for a UI tactic. That keeps 001's cart
  behavior and tests intact.
- **Alternatives**: a server-side two-step token was rejected. It's much more code for a joke, and
  the spec asks for friction, not enforcement.

## R6. Confirmation and history show the add-ons

- **Decision**: `OrderView` gains `addOns: { name, priceUsd }[]`, from `order_add_ons` in position
  order. `OrderSummary` renders them as rows between the subtotal and shipping, with
  `data-testid="add-on-line"`, on the confirmation and in the account's purchase history.
- **Rationale**: FR-007. The snapshot is what he paid, whatever the owner changes later.

## R7. Off means gone, and e2e never toggles switches

- **Decision**: with `pre_checked_add_ons` off, the page passes no add-ons and `placeOrder` charges
  none. With `roach_motel` off, `ConfirmTwice` passes every submit through. "Off renders nothing" is
  proven in integration tests and the page loader's unit test. e2e keeps the defaults (002 R7).
- **Accepted (analysis C3)**: the roach motel's page wiring (`settings.roachMotel` → `ConfirmTwice`)
  has no automated off-test, only the pure `needsConfirm(…, off)`. Quickstart scenario 14 covers
  it by hand.
- **By construction (analysis C2)**: store-made removals (001's cart audit, 002's bland audit) run on
  the server when the cart loads. They never go through `ConfirmTwice`, so they never ask (FR-012).
  Quickstart scenario 15 shows it.

## R8. Existing journeys, and new defaults

- **Decision**: with add-ons ticked by default, every checkout costs more. Journeys that aren't about
  add-ons untick them first, through a new e2e helper `untickAddOns(page)`, which `buyByCard` also
  calls. That's a careful shopper, and it keeps 003's per diem and drain numbers. The exception
  is flash-credit-checkout: it keeps every add-on ticked, since it only asserts that the balance
  drops by exactly the total. So Flash Credit pays add-ons end to end, the card does in the split
  journey, and card-checkout stays the plain baseline (analysis C1). Journeys that
  remove a line or lower a quantity click through both questions, through a helper `confirmTwice`.
  The add-ons journey is the one that pays for them.
- **Rationale**: it changes no existing assertion's meaning, and the new journeys own the new
  behavior.

## R9. Copy and starting data

- **Decision**:
  - **`copy.roachMotel`**: the two questions, the keep label, and the shamed and neutral yes labels
    (in `copy.shame.labels`, via `labelFor`).
  - **The four starting add-ons**, flat per order, owner-editable:

    | Add-on | Price | Pitch | Decline line |
    |---|---|---|---|
    | Pattern Protection Plan™ | $49.99 | "Every shape covered. Even the small ones." | "No thanks, I'd rather my patterns go unprotected." |
    | Complexity Insurance | $89.99 | "If it ever gets simpler, we make it right." | "No thanks, I'll take my chances with complexity." |
    | Extended Vibrancy Warranty | $29.99 | "Fading is for other shirts." | "No thanks, I like my colors fading." |
    | Priority Compliments Package | $19.99 | "Strangers notice first. Guaranteed." | "No thanks, I'll wait my turn to be noticed." |

## R10. Testing

- **Unit**:
  - `orderTotals`: exact sums, no add-ons, many add-ons, cents edges
  - add-on validation, if it lives in `catalog/validate.ts`
- **Integration**:
  - migration 0008: the tables, the CHECKs, FK RESTRICT, the switches on
  - `listOfferedAddOns` and `resolveAddOns`
  - `placeOrder` with add-ons, by card, Flash Credit and split: exact totals, the snapshot rows
    (renamed and repriced later, the order is unchanged), a refusal on a retired or repriced add-on,
    and nothing charged with the switch off
  - a replayed checkout is charged once
  - the drains count the full total
  - `placeOrderCore` parses `addOnId`
  - the read model's `addOns`
  - `seedCatalog` is idempotent for add-ons
- **e2e** (desktop and phone, production build):
  - **Add-ons**: everything ticked; untick and re-tick move the total; decline lines show
    (confirmshaming on); paying a split includes the add-ons; the confirmation and the history list
    them; reloading re-ticks everything
  - **Roach motel**: Remove → keep at step 1, keep at step 2, then yes twice removes it; lowering
    3 → 2 asks twice; raising and adding ask nothing; it fits at 360px
- **Coverage**: `src/lib` stays ≥ 90%.

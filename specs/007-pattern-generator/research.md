# Research: Pattern Generator

Each decision gives what was chosen, why, and what was rejected. R-numbers are referenced from
plan.md, data-model.md, contracts/generator.md and tasks.md.

## R1 — The generator, and what "complicated" counts

- **Decision**: `generate({ score, style, seed }, { bland })` is pure. It returns `{ svg, count }`,
  and `count` is always exactly `score`.
  - **The count** (`countPattern`): the sum of every shape's points, plus 5 for each color beyond the
    first, plus 10 for each layer beyond the first. Shape points are what each shape is drawn with:
    a circle or ellipse 1, a triangle 3, a rectangle 4, a zigzag or wave its vertices. Adding a
    shape, a color or a layer never lowers it.
  - **Building to a target T**:
    - `L = 1 + min(20, ⌊T/60⌋)` layers
    - `rem = T − 10(L−1)`
    - `C = 1 + min(P−1, ⌊rem/25⌋)` colors, where P is the palette size: 16 loud or 5 bland
    - the shapes' points come to exactly `rem − 5(C−1)`. The last shape is a zigzag that takes the
      remainder.

    The first C−1 shapes each carry a distinct new color (color 1 is the fabric), so all C colors
    are really present. Layers shrink their shapes (`scale = 1/(1 + 0.45·layer)`). At the highest
    levels the shapes stop being shapes.
  - **Determinism**: `mulberry32(seed)` drives every choice. Every number is rounded to one decimal,
    and the same recipe gives byte-identical SVG (SC-001).
  - **The palette** follows the store's tiers: a BLAND-tier score uses the muted palette, and
    anything above uses the loud one (FR-005). So the caller passes `bland: isBlandTier(tierOf(...))`.
  - **What the SVG contains**: the 800×800 viewBox, the shirt body's clip path, the fabric, the
    layers, the outline and the collar. There's no metadata, title or comment, so nothing in the
    file states the score (FR-008).
- **Rationale**: the count is literal, the target is exact, so the dial is monotonic by
  construction (R2), and it can be property-tested.
- **Alternatives**:
  - One unit per shape: about 10,000 shapes at the top, and extreme tunings can't fit the budget.
  - Measuring the SVG's size or entropy: not something the owner can reason about.

- **Amended after the owner's review (Q8)**: the count is `⌊points ÷ 10⌋ + 5(C−1) + 10(L−1)`,
  and the builder spends exactly `10 × (rem − 5(C−1))` points.
  - **Why**: the hand-drawn seed shirts carry about 600 shapes at score 130, and the old rule could
    afford about 40. So a generated shirt looked emptier than a hand-drawn one at the same score.
    Ten drawn points per score point matches the seed shirts from 12 to 130. The scratch
    comparison, 2026-10-19, set the seed shirts' art beside the generator's at the same scores.
  - **Shapes**: seed-shirt shapes and sizes at the low end (dots, ellipses, triangles, waves,
    rectangles, short zigzags), and layers shrink gently (`1/(1 + 0.12·layer)`) at nearly full
    opacity.
  - **Top end**: zigzags take over and get long. They wander (a turning random walk with a stride
    that grows with the score), drawn as medium-width strokes, and some short ones are filled.
    Big filled tangles and faint layers were tried and rejected: they washed the shirt into one
    color or grey.

## R2 — How far the dial goes, and its steps

- **Decision**:
  - `maxPriceableScore(msrp)` binary-searches for the largest whole score `msrpUsd` can price
    (10,249 at the default tuning).
  - The dial's top is `maxDial = min(maxPriceableScore, ART_MAX_SCORE)`, where `ART_MAX_SCORE` is
    24,000. It was 120,000 before the owner review's denser art (R1, R13 as amended). Above that,
    the art would pass 2 MB (R13). Only an extreme tuning can reach it.
  - `DIAL_STEPS = 102`, numbered 0–101. `scoreAtStep(step, maxDial)`:
    - steps 0–80 are linear, `round(2.5·step)` (scores 0–200, every seeded tier's band)
    - steps 81–100 are exponential from 200 up to `maxDial`
    - step 101 is "beyond": too complicated to price, and can't be made

    The function is non-decreasing (SC-002).
- **Rationale**: the tiers people care about get fine steps, and the absurd end comes quickly. The
  last real step is exactly the most the store can price (FR-007).
- **Edge**: if `maxDial` is under 200 (an odd tuning), steps clamp at `maxDial` and stay monotonic.

## R3 — Recipe codes that don't give the score away

- **Decision**: the canonical recipe key, stored in `shirts.recipe` and server-side only, is
  `v1:<style>:<score>:<seed>`.
  - Links carry an **opaque code**: `(version, style, score, seed)` packed into one 64-bit number
    (score up to 2^20, seed 32 bits), passed through a fixed invertible mix (multiply by an odd
    constant, xor, mod 2^64), and written in base 36 (about 13 characters).
  - Decoding reverses the mix and checks every field. Anything else is "not a recipe".
- **Rationale**: shoppers see letters, never a number (FR-008, FR-011), and a link survives a
  retuning because it holds the score, not the step. It isn't encryption: the constitution forbids
  showing the score, and nothing on the page does.
- **Alternative**: the step in the URL. Rejected because a retuning would change which shirt a
  shared link opens.

## R4 — The dial page: scores stay on the server

- **Decision**: `/how-complicated` is a store page. Its server loader (`loadDial`):
  - reads `?r=<code>`, plus optional `seed` and `style` overrides, and returns the 404 while the
    switch is off
  - picks the seed and style, and computes all 102 steps: `{ code, tier name and colors, tagline,
    price (or null at "beyond"), isBland, made?: { slug, name, price } }`
  - finds made shirts in one `WHERE recipe IN (…)` query
  - if a code's score falls between steps, snaps to the nearest step, with that exact recipe as the
    current step's shirt

  The client `Dial` holds only that list:
  - the slider is `0–101` with `aria-valuetext` set to the tier name, never a score
  - the badge and price change instantly as it moves
  - when it settles (about 150 ms), the preview `<img>` becomes `/how-complicated/art/<code>`, and
    the URL is replaced with `?r=<code>`, so the address bar is always the share link (FR-011)
  - Shuffle and the style toggle navigate with `seed` or `style`, and the server sends the new step
    list

  The price, badge and Make it mine carry `data-steady` (006).
- **Rationale**: the browser never holds a score, and the art is drawn by the same server code that
  will store it.
- **Alternative**: generating in the browser. Rejected: scores in client memory and links.

## R5 — "Make it mine" goes to the shirt's own page

- **Decision**: `makeItMine(code)` materializes the recipe (R6) and redirects to `/shirts/<slug>`.
  There the existing page applies unchanged: the size picker, Add to Cart, the bland loop, scarcity,
  the countdown, social proof and zoom.
  - The spec's FR-014 and US2 were refined to match (2026-10-19).
  - "Beyond" can't be made.
- **Rationale**: one Add to Cart and one shaming loop. A BLAND dial shirt gets the 002 loop for free.
- **Cost**: a shirt can be made and never bought. It's unlisted (R7), so nobody but the owner ever
  sees it.

## R6 — Materializing a recipe

- **Decision**: `materialize(db, recipe, { origin })` in `src/lib/pattern/materialize.ts`:
  1. Find a shirt with `recipe = key`. If it exists, return it (FR-015).
  2. Refuse a score past `maxDial`, or one `msrpUsd` can't price.
  3. Generate the SVG with `bland` from the current tiers.
  4. Name it (R10). The slug is the name in kebab case plus a 5-character code fragment.
  5. Describe it from the tier, in Dan's voice.
  6. Check `validateShirt` (the bland rule, active needs an image) against the live tuning. If it
     would break a rule, refuse (FR-017).
  7. `writeUpload(svg, "svg")` (008), then in one transaction insert the shirt (`origin`,
     `listed = origin !== "dial"`, `status = origin === "dial" ? "active" : "inactive"`), the media
     row and `shirt_images` at position 0. If the transaction fails, remove the file.
  8. A racing insert of the same recipe hits `UNIQUE(recipe)`: catch it and return the winner.
- **Rationale**: it's the only way a generated shirt comes to exist, so every rule lives once. The
  catalog check stays at zero (SC-006).

## R7 — One of a kind: `listed`

- **Decision**: `shirts.listed` (default 1).
  - Dial shirts are created with 0.
  - `listCatalogShirts` returns listed shirts only, unless asked for the unlisted too. That covers
    the listing and the home page (`loadStorefront`), the shaming ladder (`buildLadder` input) and
    the pop-up candidates (`listPopCandidates`): FR-018.
  - `getShirtBySlug`, carts, checkout and orders ignore `listed` (the shirt's own page works).
  - The console reads every shirt.
  - A CHECK keeps `listed = 0` to dial shirts only.
- **Rationale**: one column, one default read path changed, and no fork of the catalog.

## R8 — Dan's generator, and the console changes

- **Decision**: `/admin/shirts/generate?score=&style=&seed=` (GET via `next/form`, behind
  `requireAdmin`).
  - It shows the preview from `/admin/generator/art/<code>` (an admin-checked route handler, which
    works with the switch off), plus the counted score, tier and MSRP.
  - Shuffle is a link with a new seed.
  - "Save as a shirt" posts `saveGeneratedShirt` with a name (prefilled from R10, editable). It
    materializes with `origin = "owner"`: resting, listed. Then it redirects to the shirt's editor.
  - The shirts list shows an origin mark ("Generated by you" or "Made by a shopper") and gets an
    origin filter.
  - A shopper-made shirt's editor gets `ListedControl`, which runs `setShirtListed` to list or
    unlist it.
  - The score is edited in the existing ShirtForm (FR-003, constitution v4.2.0).
- **Calm**: a static image, no animation (FR-022).

## R9 — The switch

- **Decision**: `store_settings.pattern_generator` (default on) becomes the 14th entry in
  `SWITCH_KEYS`, with copy on the switchboard. While it's off:
  - `/how-complicated` and its art route give the store's 404
  - the CTAs are hidden
  - `makeItMine` is refused
  - shirts already made, Dan's generator and the admin art route are unaffected

  008's switchboard test (13) becomes 14, and the README table gains a row.

## R10 — Names in Dan's voice

- **Decision**: `nameFor(recipe, bland)` picks deterministically from word banks in
  `copy.dial.names`:
  - **loud**: an adjective, a noun and an optional suffix, such as "Hyperdimensional Paisley
    Situation" or "Load-Bearing Kaleidoscope Supreme"
  - **bland**: "Khaki Compromise", "Oatmeal Surrender" and so on

  A taken name gets a Roman numeral: II, III and so on. Names never contain digits, so they can't
  carry the score (FR-008).
- **Rationale**: comedy first, and still unique.

## R11 — Constitution v4.2.0

- **Decision**: II's first bullet gains: "A **generated shirt** (one the pattern generator draws)
  starts at the score counted from its own pattern, and the owner can change it like any other."
  - It's MINOR, because guidance is added and no MUST is removed.
  - It's drafted on this branch, and merging the PR ratifies it, as 008 did.

## R12 — e2e

- **Decision**:
  - **The dial journeys** go in `tests/e2e/dial.spec.ts`, in the shopper projects:
    - step up through the dial
    - sample monotonic prices
    - look for score-like text on the page and in its links
    - Shuffle, the shared link and the beyond step
    - Make it mine, then buy by card, then order history
    - the shirt stays out of `/shirts`

    Dial shirts are unlisted, so other shopper journeys never see them.
  - **The console generator**, and listing a shopper-made shirt (which changes the shared listing),
    go in `tests/e2e/admin/generator.spec.ts` (the admin projects, which run last).
- **Rationale**: it keeps 008 R15's determinism.

## R13 — The art budget and speed

- **Decision**:
  - A unit test checks that the SVG at `ART_MAX_SCORE` is under 2 MB, and at the default
    `maxPriceableScore` under 1 MB.
  - **Owner review (R1 amended)**: ten drawn points per score point makes the art about 10 times
    heavier per score. At the default top (10,249) it's about 785 KB, so that budget rises from
    300 KB to 1 MB. `ART_MAX_SCORE` drops from 120,000 to 24,000 (about 1.9 MB), which is still
    above the default top. SC-005's 2 MB and 2 s are unchanged.
  - The e2e times the top step's preview, from the request to a decoded `<img>`, at under 2 s.
  - Polish runs Lighthouse on `/how-complicated`.
- **Rationale**: SC-005, and constitution VII.

## R14 — Made to order: the maker (owner review, Q4)

- **Decision**: `shirts.maker_user_id`, set for dial shirts only (a CHECK).
  - **Make it mine** needs a signed-in shopper. A guest gets
    `/sign-in?next=/how-complicated?r=<code>`, so he comes back to the same setting. Nothing is made
    for a guest.
  - **Making a recipe that's already a shirt**:
    - with no maker: the shopper claims it
    - his own: it lands on it
    - someone else's: it lands on that shirt's page, which says it's someone else's
  - **May this account buy it?** `canBuy(shirt, userId)`: true for anything but a one-of-a-kind
    shirt (dial, unlisted). For a one-of-a-kind shirt, true only for its maker.
  - **Where it's enforced, on the server**:
    - `addItem`: the cart's own `user_id` (a guest cart is nobody's maker)
    - `updateItem`, on a raise
    - `auditCart`: a new removal reason, `unique`, takes out lines the cart's owner can't buy. That
      covers a sign-in merge, and a shirt Dan made one of a kind again.
    - `placeOrder`: it runs the audit first, so `CART_AUDITED` refuses the checkout
  - **Backfill** (migration 0013): a dial shirt's maker is the account on its earliest order. With
    no orders, it stays NULL and the next signed-in maker claims it.
- **Rationale**: one rule, `canBuy`, in one place, checked wherever a line can enter or leave. The
  page hides the controls, but the server decides.
- **Alternatives**: tying a shirt to the guest's cart (lost on a new browser, and the checkout gate
  needs an account anyway); selling it once (rejected by the owner, Q4).

## R15 — The Uniquity Surcharge's money (owner review, Q5)

- **Decision**:
  - **Settings**: `store_settings.uniquity_surcharge` (switch, on) and
    `store_settings.uniquity_surcharge_usd` (a USD string, `499.99`).
  - **Per line**: the surcharge is the amount × quantity, for each line whose shirt is one of a
    kind while the switch is on. It's worked out live in `getCartView` and `loadCheckoutLines`, like
    prices (carts never store money).
  - **Totals**: `orderTotals` takes a `surchargeUsd`: total = shirts + surcharges + add-ons +
    shipping + tax.
  - **Checkout**: the form's expected total includes it. `placeOrder` recomputes it inside its
    transaction, and a mismatch is `PRICE_CHANGED` (FR-027).
  - **The order keeps it**: `order_items.surcharge_usd` (per shirt, `0.00` when none) and
    `orders.surcharge_usd` (in all). The receipt and history show one line, "Uniquity Surcharge™
    × N".
  - **Money math**: big.js through `src/lib/money.ts` (`mul`, `sum`, `add`), test-first
    (constitution VI). Property: total = subtotal + surcharge + add-ons, to the cent, for every
    payment method.
  - **Console**: the amount is edited on Settings (`saveSurchargeCore`, in the door sweep). The
    switch is the 15th row on the switchboard.
- **Rationale**: it's a fee, not part of a shirt's price (constitution II's MSRP and final price
  are untouched), shown and charged like add-ons, which already set the pattern for extra lines.
- **Alternatives**:
  - Folding it into the shirt's price: rejected by the owner (Q5), and it would bend the one MSRP.
  - Once per order: the owner said per shirt.

## R16 — Urgency on a one-of-a-kind shirt (owner review, Q7)

- **Decision**:
  - `socialProofFor` returns null for a one-of-a-kind shirt.
  - `stockLine` gets a `made` kind, and `cartStockLine` gets `madeMany`.
  - The add message uses "make another" instead of "found another" when the shirt is one of a
    kind.
  - Countdowns are unchanged. The switches still govern each tactic: off is off.
  - The shirt page passes a `madeToOrder` flag (one of a kind). A mass-produced shirt is ordinary
    again.
- **Rationale**: there's nobody else to look at it, and nothing to run out of. The joke becomes
  "made to order" instead.

## R17 — The dial's link and the console slider (owner review, Q9)

- **Decision**:
  - **The dial's link**: on `/shirts`, `DialCta` moves into the listing's left column, under the
    filter drawer. On a phone that column stacks above the results, so the link sits under the
    filter toggle. The home page is unchanged.
  - **The console slider**: `ScoreField`, a client component, holds the number box (named `score`)
    and an unnamed range of 0–100 steps mapped through `scoreAtStep(step, maxDial)`. Moving one
    moves the other: a typed score snaps the slider to the nearest step.
- **Rationale**: the same spacing as the dial, so 0–150 isn't a sliver of 10,249.

## R18 — Mass production (owner review, Q6)

- **Decision**:
  - **It's `listed`**: R7's switch, renamed in the console. "Put it into mass production" sets
    listed, and "Make it one of a kind again" clears it.
  - **The review queue**: Dan finds shopper creations at `/admin/shirts?origin=dial`, with a
    "Review shopper creations" link on the shirts list.
  - **The editor**: shows the maker, linked to `/admin/customers/<id>`.
  - **The list**: marks a mass-produced shirt as "Made by a shopper · mass-produced".
- **Rationale**: no new state. The joke (pay to be unique, then Dan mass-produces it) needs only
  what's there.

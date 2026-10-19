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

## R2 — How far the dial goes, and its steps

- **Decision**:
  - `maxPriceableScore(msrp)` binary-searches for the largest whole score `msrpUsd` can price
    (10,249 at the default tuning).
  - The dial's top is `maxDial = min(maxPriceableScore, ART_MAX_SCORE)`, where `ART_MAX_SCORE` is
    150,000. Above that, the art would pass 2 MB (R13). Only an extreme tuning can reach it.
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
    `maxPriceableScore` under 300 KB.
  - The e2e times the top step's preview, from the request to a decoded `<img>`, at under 2 s.
  - Polish runs Lighthouse on `/how-complicated`.
- **Rationale**: SC-005, and constitution VII.

# Feature Specification: Pattern Generator

**Feature Branch**: `007-pattern-generator`

**Created**: 2026-10-19

**Status**: Draft (Q1–Q3 open)

**Input**: User description: "Pattern Generator (ROADMAP 007). Procedurally generated shirts whose complexity is derived from the generated pattern itself — the more shapes, colors and layers, the more complicated — answering "how complicated can it get?" literally: the pattern can keep getting more complicated until the store's one exponential MSRP can no longer price it. Generated patterns are crisp vector art (high-resolution and zoomable, like every shirt), loud and vibrant at every level above the bottom, with the bottom of the range producing bland foils. A pattern is reproducible: the same recipe always gives the same shirt. Generated shirts are real catalog shirts (data in SQLite, art stored like uploads), priced by the existing MSRP algorithm, tier-badged, addable to carts, buyable by every payment method, and kept in order history; shoppers never see the score, only the tier badge and the price climbing. The feature has its own owner on/off switch (constitution IV/V gimmick pattern). Works from a 360px phone up; loud in the store, calm in Dan's Office (constitution v4.1.0). Builds on 001 (catalog, pricing, tiers, media) and 008 (the console, uploads, shirt editor). No money paths change beyond buying shirts the normal way."

**Builds on**:
- 001-core-storefront: the catalog, the one MSRP algorithm, tiers and badges, the zoom viewer, carts, checkout, order history
- 002-brand-pages-and-shaming: bland shirts can't sit in a cart while bland shaming is on
- 006-flash-mode-pipes: the sale stays readable under Extreme Awesomeness
- 008-admin-console: Dan's Office, the shirt editor, uploaded art, the switchboard, the catalog check

## User Scenarios & Testing *(mandatory)*

### User Story 1 - How Complicated Can It Get? (Priority: P1)

He finds a dial on the shirts page: **How complicated can it get?** He turns it up. The shirt on the
screen fills with shapes, then colors, then layers on top of layers. The badge climbs: Complicated,
Very Complicated, Dangerously Complicated. The price climbs faster. He keeps going. Past Too
Complicated for Most Men, the shapes stop being shapes. At the very end of the dial the price just
says: "That's too complicated to price, even for Dan."

He turns it back to something he can almost afford, hits Shuffle until the pattern feels right, and
sends the link to Craig. Craig opens the exact same shirt.

**Why this priority**: it's the whole joke. The roadmap promises to answer "how complicated can it
get?" literally, and this is the answer.

**Independent Test**: with the switch on:
- open the dial page and step from the bottom to the top
- confirm the badge and price never go down on the way up, and the score never shows
- confirm a shared link reopens exactly the same shirt
- confirm the top step says it can't be priced

**Acceptance Scenarios**:

1. **Given** the switch is on, **When** he opens the shirts page or the home page, **Then** there's
   a way to the dial.
2. **Given** the dial, **When** he turns it up one step, **Then** the pattern gets more complicated,
   and the tier badge and price stay the same or go up. They never go down.
3. **Given** the bottom of the dial, **When** he looks, **Then** the shirt is BLAND: muted, earth
   toned, and disparaged in Dan's voice. Every step above BLAND is loud.
4. **Given** any setting, **When** he presses Shuffle, **Then** he gets a different pattern at the
   same level of complicated.
5. **Given** any setting, **When** he copies its link and someone opens it, **Then** they see the
   exact same shirt: the same art, badge and price.
6. **Given** the very top of the dial, **When** he turns it there, **Then** the price says "That's
   too complicated to price, even for Dan." and the shirt can't be bought.
7. **Given** any dial page, **When** he looks anywhere (the dial, its labels, the link, the page),
   **Then** no complexity score appears.

---

### User Story 2 - Buy the Monster (Priority: P2)

He settles on a Dangerously Complicated button-down that nobody else has. He picks XL and adds it to
his cart. It's a real shirt now, with its own name and its own page. He checks out with his Flash
Credit, and it's in his order history next to everything else he regrets.

**Why this priority**: a shirt he can't buy doesn't make him buy another shirt (constitution I).

**Independent Test**: from the dial, add a generated shirt to the cart, check out by card and by
Flash Credit, and find it in order history with its art. Confirm that adding the same shirt twice
uses one shirt, not two.

**Acceptance Scenarios**:

1. **Given** a dial setting he likes, **When** he picks a size and adds it to the cart, **Then** the
   pattern becomes a real shirt with its own name and page. The cart line behaves like any other.
2. **Given** a generated shirt in his cart, **When** he checks out by card, by Flash Credit, or
   split, **Then** the order is placed at the shirt's price, and order history shows it with its
   art.
3. **Given** the same setting added twice, by him or by someone else, **When** it's added again,
   **Then** it's the same shirt, not a copy.
4. **Given** the bottom of the dial with bland shaming on, **When** he tries to add the BLAND shirt,
   **Then** he gets the store's usual "You sure about that?" loop, and it never reaches his cart.
5. **Given** a generated shirt he bought, **When** he opens it later from order history, **Then** its
   page is still there, with the same art.

---

### User Story 3 - Dan's Generator (Priority: P3)

Dan doesn't want to draw shirts anymore. In his office he opens the generator, asks for a
Seriously Complicated polo, and shuffles until he likes one. The count says 48, so the MSRP follows.
He names it "Spreadsheet Rapture", saves it, and puts it on the floor. The pattern did all the work.
Dan takes the credit.

**Why this priority**: it helps the owner, but the shopper's dial is the joke.

**Independent Test**: in the console, generate a shirt at a target level, save it, and put it on the
floor. Confirm it appears in the store with its art, badge and price. Confirm the shirts list can
show which shirts came from the generator.

**Acceptance Scenarios**:

1. **Given** Dan's Office, **When** the owner asks for a pattern at a target level and style,
   **Then** the console previews the art with its counted score, tier and MSRP.
2. **Given** a preview, **When** the owner saves it, **Then** it's a new catalog shirt, resting
   until the owner puts it on the floor, with its art in the media library.
3. **Given** the shirts list, **When** the owner filters to generated shirts, **Then** both the
   owner's and the shoppers' generated shirts are listed, each marked with where it came from.
4. **Given** a generated shirt, **When** the owner edits it, **Then** everything a shirt editor
   offers is there, with the score handled as decided in FR-003.

---

### Edge Cases

- **Past the end of pricing.** The MSRP can only count so high under the current tuning. The dial
  stops one step past the last priceable level, and that step can't be bought.
- **Retuned mid-cart.** If the owner retunes the MSRP, generated shirts reprice like every shirt.
  Carts follow on the next page load, and placed orders never change.
- **Tiers moved.** A generated shirt's badge follows its score under the current tier bands, like
  every shirt.
- **A bland rule broken by tuning.** If the tuning makes a BLAND pattern cost at or above the start
  price, that setting can't be bought. The catalog never holds a shirt that breaks a rule.
- **The switch turned off.** The dial page shows the store's ordinary 404 and its links disappear.
  Generated shirts already made stay real shirts: in carts, in orders, and on their own pages.
- **The same recipe, two shoppers at once.** One shirt, never two.
- **Names.** Every generated shirt gets a unique name and URL name in Dan's voice. Neither contains
  its score.
- **A heavy pattern on a phone.** The most complicated patterns stay small enough to draw quickly on
  a phone (SC-005).
- **An old shared link.** If the generator ever changes, a shirt already made keeps its stored art,
  and its link opens that shirt. A setting nobody made yet may draw differently.
- **Extreme Awesomeness.** The dial page is a store page, so it strobes. The price, the tier badge
  and Add to Cart stay steady and readable (constitution V).

## Requirements *(mandatory)*

### Functional Requirements

**Scope**

- **FR-001**: Where the generator lives: [NEEDS CLARIFICATION: Is it a shopper-facing dial in the
  store (US1, US2), an owner tool in Dan's Office (US3), or both?]

**The generator**

- **FR-002**: A pattern MUST come from a recipe: a level of complicated, a style (polo or
  button-down), and a shuffle. The same recipe MUST always give the same art and the same counted
  score.
- **FR-003**: A pattern's complexity score MUST be counted from the pattern itself: its shapes, its
  distinct colors and its layers. Adding a shape, a color or a layer never lowers the count. Who has
  the last word on a generated shirt's score: [NEEDS CLARIFICATION: Is the counted score final, or
  can the owner change it afterwards like any shirt's? Either needs a constitution II wording change,
  because II says the owner assigns every score.]
- **FR-004**: For any shuffle, a higher level MUST never produce a lower counted score. So turning
  the dial up never lowers the price.
- **FR-005**: Every pattern above the BLAND tier MUST be loud: only the store's bright colors.
  Patterns in the BLAND tier MUST use only muted, earth-tone colors (constitution III).
- **FR-006**: Every pattern MUST be vector art that stays crisp in the store's zoom viewer, with each
  motif distinguishable at maximum zoom (constitution III). Once a pattern becomes a shirt, its art
  is stored with the store's other images.
- **FR-007**: The range MUST run from the bottom of BLAND up to the highest score the MSRP can price
  under the current tuning. One step beyond that shows "That's too complicated to price, even for
  Dan." and can't be bought.
- **FR-008**: The score MUST NEVER reach shoppers (constitution II): not on the page, not on the
  dial, not in its labels or accessible names, not in a recipe link, not in a generated shirt's
  name, and not inside the art file.

**The dial (US1)**

- **FR-009**: While the switch is on, the store MUST offer a dial page, "How complicated can it
  get?", reachable from the shirts page and the home page.
- **FR-010**: The dial MUST show the pattern on the shirt, its tier badge and tagline, and its price
  (exact, to the cent), and update them as the dial moves. Shuffle gives a new pattern at the same
  level, and the style can be switched.
- **FR-011**: Every dial setting MUST have a link that reopens exactly that shirt.
- **FR-012**: The dial page MUST speak in Dan's voice as it climbs, and disparage the BLAND end like
  every bland shirt (002). It never explains the joke.
- **FR-013**: The dial page is a store page: it works under Extreme Awesomeness, and the price, the
  tier badge and Add to Cart stay readable (constitution V).

**Buying (US2)**

- **FR-014**: Picking a size and adding a dial setting to the cart MUST make it a real catalog shirt
  at that moment:
  - a unique name in Dan's voice
  - its art
  - its counted score
  - priced at its MSRP

  The cart line then behaves like any other, with every tactic that applies to cart lines.
- **FR-015**: The same recipe MUST always become the same shirt. Adding it again, by anyone, uses the
  shirt that exists.
- **FR-016**: A generated shirt MUST be buyable by every payment method at the price the store
  resolves at checkout (server-authoritative), MUST appear in order history with its art, and its
  page MUST stay viewable for as long as the order exists (constitution II).
- **FR-017**: Generated shirts MUST follow every catalog rule. A BLAND one is refused while bland
  shaming is on, through the usual loop. A setting whose price would break the bland rule can't be
  added. The catalog check stays at zero errors.
- **FR-018**: Whether a shopper-made shirt joins the store's listing: [NEEDS CLARIFICATION: Is each
  dial shirt one of a kind (it has its own page and lives in his orders, but never shows in the
  listing unless the owner puts it there), does it join the listing like any shirt, or does it go to
  a "recently generated" gallery?]

**Dan's Office (US3)**

- **FR-019**: The owner MUST be able to generate a pattern in the console by target level, style and
  shuffle, and see the art, counted score, tier and MSRP before saving.
- **FR-020**: The owner MUST be able to save a pattern as a new catalog shirt. It rests until the
  owner puts it on the floor, its art joins the media library, and its name is editable.
- **FR-021**: The console's shirts list MUST mark generated shirts, made by the owner or by a
  shopper, and filter to them. The owner edits them like any shirt; the score as FR-003 decides.
- **FR-022**: The generator in the console MUST stay calm, like the rest of the office (constitution
  V, "The back office is calm"): no animation, and the preview is still art.

**The switch**

- **FR-023**: The pattern generator MUST have its own store switch, on by default, listed on the
  console's switchboard with one plain line.
  - While it's off, the dial page and its links are gone (the dial address shows the store's
    ordinary 404).
  - Shirts already generated are unaffected.
  - The owner's generator in the console still works.

**Everywhere**

- **FR-024**: The dial page, and the console's generator, MUST work from a 360px-wide phone up, with
  no sideways scrolling (constitution V).
- **FR-025**: Every price MUST be exact to the cent and come from the store's one MSRP algorithm
  (constitution II, commerce constraints).

### Key Entities *(include if feature involves data)*

- **Recipe**: a level of complicated, a style and a shuffle. Fully determines a pattern. Shareable
  as a link that doesn't reveal the score.
- **Pattern**: the art a recipe makes, and the complexity score counted from its shapes, colors and
  layers.
- **Generated shirt**: a catalog shirt made from a recipe, with its stored art, its counted score,
  its recipe (so the same recipe finds it again) and where it came from (the dial or the owner).
- **Pattern generator switch**: a store setting, on by default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The same recipe gives byte-identical art and the same score every time, across a sample
  of at least 1,000 recipes.
- **SC-002**: Across the whole dial, for every shuffle sampled, the price never goes down from one
  step to the next.
- **SC-003**: Zero complexity scores appear anywhere a shopper can reach: dial pages, recipe links,
  generated shirt names, pages and art files.
- **SC-004**: A shopper can go from opening the dial to a placed order for a generated shirt in under
  2 minutes.
- **SC-005**: The most complicated priceable pattern draws in under 2 seconds on a mid-range phone,
  and its art file is under 2 MB.
- **SC-006**: After any number of generated shirts are made, the catalog check reports zero errors.
- **SC-007**: The dial page has no sideways scrolling at 360px wide, with Extreme Awesomeness on or
  off, and the price, badge and Add to Cart stay readable throughout.

## Assumptions

- Generated shirts come in the store's two styles, polo and button-down, and its sizes, S–XXL.
- A shopper-made shirt sells at its MSRP until the owner sets a final price. The dial never offers
  an owner price.
- No uploading or hand-editing of patterns: the generator draws, and the shuffle is the only
  control besides level and style.
- The checkout gate, add-ons, roach motel, scarcity and countdowns apply to generated shirts exactly
  as to any shirt. The dial itself adds no new tactic.
- Generated names come from word banks in Dan's voice, unique per shirt.
- Changing the generator later may change settings nobody has made yet. Shirts already made keep
  their stored art.
- **Constitution note.** II says "The store owner assigns each shirt's complexity score... The
  owner's judgment ... is final." A score counted by the generator needs II to say how generated
  shirts get theirs. That's an amendment either way FR-003 goes, drafted with the plan and ratified
  by merging this feature's PR, as 008 did.

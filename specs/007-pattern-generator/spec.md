# Feature Specification: Pattern Generator

**Feature Branch**: `007-pattern-generator`

**Created**: 2026-10-19

**Status**: Draft (Q1–Q3 resolved 2026-10-19; amended after the owner's review, Q4–Q9, 2026-10-19)

**Input**: User description: "Pattern Generator (ROADMAP 007). Procedurally generated shirts whose complexity is derived from the generated pattern itself — the more shapes, colors and layers, the more complicated — answering "how complicated can it get?" literally: the pattern can keep getting more complicated until the store's one exponential MSRP can no longer price it. Generated patterns are crisp vector art (high-resolution and zoomable, like every shirt), loud and vibrant at every level above the bottom, with the bottom of the range producing bland foils. A pattern is reproducible: the same recipe always gives the same shirt. Generated shirts are real catalog shirts (data in SQLite, art stored like uploads), priced by the existing MSRP algorithm, tier-badged, addable to carts, buyable by every payment method, and kept in order history; shoppers never see the score, only the tier badge and the price climbing. The feature has its own owner on/off switch (constitution IV/V gimmick pattern). Works from a 360px phone up; loud in the store, calm in Dan's Office (constitution v4.1.0). Builds on 001 (catalog, pricing, tiers, media) and 008 (the console, uploads, shirt editor). No money paths change beyond buying shirts the normal way."

**Builds on**:
- 001-core-storefront: the catalog, the one MSRP algorithm, tiers and badges, the zoom viewer, carts, checkout, order history
- 002-brand-pages-and-shaming: bland shirts can't sit in a cart while bland shaming is on
- 006-flash-mode-pipes: the sale stays readable under Extreme Awesomeness
- 008-admin-console: Dan's Office, the shirt editor, uploaded art, the switchboard, the catalog check

## Clarifications

### Session 2026-10-19

- Q1: Where does the generator live? → A: **Both.** Shoppers get the dial in the store (US1, US2).
  Dan gets a generator in his office (US3), using the same generator.
- Q2: Who has the last word on a generated shirt's score? → A: **The count starts it, and Dan can
  change it.**
  - A generated shirt starts at the score counted from its pattern.
  - The owner can change it afterwards in the console, like any shirt's. The art stays as drawn.
  - Constitution II gets a wording amendment to say so.
- Q3: Does a shopper-made shirt join the store's listing? → A: **One of a kind.**
  - It has its own page and lives in the shopper's orders.
  - It never appears in the listing, on the home page, in the fake purchase pop-ups, or among the
    store's suggestions, unless Dan lists it from his office.

### Session 2026-10-19 (the owner's review of the built feature)

The owner made a shirt at the dial and bought it. These answers amend the feature before its PR.
They also change one line of the original description: a money path does change, because the
Uniquity Surcharge is a new charge.

- Q4: Who can buy a one-of-a-kind shirt? → A: **Its maker, as many as he likes.**
  - It's made to order, for the account that made it. Nobody else can buy it, and it never sells
    out.
  - "Make it mine" needs an account, so a guest signs in first and comes back to the same setting.
  - Anyone with the link can still see it. The page says whose it is in general terms (never a
    name), and offers no way to buy it.
- Q5: How is the Uniquity Surcharge charged? → A: **A flat fee, on its own line.**
  - It's charged once for every one-of-a-kind shirt in an order (per shirt, so two of them pay it
    twice).
  - It's its own line on the cart, at checkout and on the order. The amount is set in Dan's Office,
    and it has its own on/off switch.
- Q6: Can Dan take a shopper's creation for the store? → A: **Yes: he reviews them and puts them
  into mass production.**
  - Mass production turns it into an ordinary shirt in the listing: anyone can buy it, every tactic
    applies, and there's no surcharge. Dan can make it one of a kind again.
- Q7: What about the urgency tactics on a one-of-a-kind shirt? → A: **They fit made to order.**
  - No fake crowd ("N people are looking") and no "just bought it" on its page.
  - The fake-scarcity lines ("Only 1 left!", "we found another one!") become made-to-order lines.
  - The countdown stays.
- Q8: How busy should a generated shirt be? → A: **As busy as the hand-drawn seed shirts at the same
  score.**
  - The count changes so each point of score buys more drawing: one point of score for every 10
    points drawn, plus 5 for each extra color and 10 for each extra layer (FR-003).
  - The most complicated patterns are dense, loud tangles, never a blank shirt or grey static.
- Q9: Where do the dial's link and the console's level control go? → A: **Into the sidebar, and a
  slider too.**
  - On the shirts page, the dial's link sits under the filters (the desktop sidebar, and under the
    filter toggle on a phone), not above the listing.
  - The console's generator gets a slider beside the score box, spaced like the dial.
- Pricing curve (noted, not in this feature): the owner wants a gentler, near-linear MSRP. That's
  ROADMAP 010, with its own constitution II amendment.
- Q10: How long does a console confirmation stay? → A: **A few seconds.** "Saved. That was a good
  decision, Dan." and its kin go away by themselves, so the next save shows one again. A refusal
  stays until it's fixed (FR-028).

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
   a way to the dial. On the shirts page it sits under the filters.
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

He settles on a Dangerously Complicated button-down that nobody else has. He presses Make it mine,
and it's his: a real shirt with its own name and page, made to order for him alone. He picks XL and
adds two, because nobody else can. The cart adds a Uniquity Surcharge™ for each, because being
unique costs extra. He checks out with his Flash Credit, and it's in his order history next to
everything else he regrets. Craig opens the link, loves it, and can't buy it.

**Why this priority**: a shirt he can't buy doesn't make him buy another shirt (constitution I).

**Independent Test**: signed in, make a shirt at the dial, add it to the cart, check out by card and
by Flash Credit, and find it in order history with its art and its surcharge line. Confirm that the
same setting is one shirt, not two, and that another account can see it but not buy it.

**Acceptance Scenarios**:

1. **Given** a dial setting he likes and he's signed in, **When** he presses "Make it mine",
   **Then** the pattern becomes a real shirt with its own name and page, made for him, and he lands
   on that page. **When** he picks a size and adds it, **Then** the cart line behaves like any
   other, in any quantity.
2. **Given** he's signed out, **When** he presses "Make it mine", **Then** he's asked to sign in
   first, and he comes back to the same setting.
3. **Given** a generated shirt in his cart, **When** he checks out by card, by Flash Credit, or
   split, **Then** the order is placed at the shirt's price plus the Uniquity Surcharge for each
   one-of-a-kind shirt, and order history shows it with its art and the surcharge line.
4. **Given** the same setting made twice, **When** it's made again, **Then** it's the same shirt,
   not a copy. **Given** someone else made it, **When** he opens it, **Then** he sees it, and it
   says it's somebody else's, with no way to buy it.
5. **Given** the bottom of the dial with bland shaming on, **When** he makes the BLAND shirt his and
   tries to add it, **Then** he gets the store's usual "You sure about that?" loop on its page, and
   it never reaches his cart.
6. **Given** a generated shirt he bought, **When** he opens it later from order history, **Then** its
   page is still there, with the same art.
7. **Given** his one-of-a-kind shirt's page, **When** he looks, **Then** there's no fake crowd and no
   "just bought it", and the stock line says it's made to order.

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
   offers is there, the score included. Changing the score reprices the shirt, and the art stays as
   drawn.
5. **Given** the shopper creations (the shirts list filtered to shopper-made shirts), **When** the
   owner reviews one, **Then** he sees who made it. **When** he puts it into mass production,
   **Then** it's an ordinary shirt in the store's listing: anyone can buy it, every tactic applies,
   and there's no surcharge. **When** he makes it one of a kind again, **Then** only its maker can
   buy it.
6. **Given** the generator, **When** the owner drags its slider, **Then** the score box follows,
   spaced like the dial (fine steps where the tiers are). Typing a score moves the slider.

---

### Edge Cases

- **Past the end of pricing.** The dial stops one step past its fixed top, 10,249, and that step
  can't be bought (010).
- **Retuned mid-cart.** If the owner retunes the MSRP, generated shirts reprice like every shirt.
  Carts follow on the next page load, and placed orders never change.
- **Tiers moved.** A generated shirt's badge follows its score under the current tier bands, like
  every shirt.
- **A bland rule broken by tuning.** If a BLAND pattern ever cost at or above a real shirt's start,
  that setting couldn't be bought. On the straight line (010) a BLAND pattern at its MSRP never
  does, but the rule stands: the catalog never holds a shirt that breaks one.
- **The switch turned off.** The dial page shows the store's ordinary 404 and its links disappear.
  Generated shirts already made stay real shirts: in carts, in orders, and on their own pages.
- **The same recipe, two shoppers at once.** One shirt, never two.
- **A setting that's already a shirt.** The dial shows the real shirt, priced as it is now. If Dan
  re-scored it, that's his call. The dial's never-goes-down promise is about the counts, and Dan's
  judgment is final (constitution II).
- **Mass-produced, then one of a kind again.** Orders that hold it are unaffected. Its maker's cart
  lines stay. Anyone else's cart lines for it are taken out at their next look, with a line saying
  why, the same way a retired shirt leaves a cart.
- **Somebody else's shirt.** A shopper who opens a one-of-a-kind shirt he didn't make sees it, with
  a line saying it's someone else's, and no size picker or Add to Cart. A store action that tries
  anyway is refused, and so is a checkout that holds it.
- **The maker, signed out.** His own shirt looks like anyone's until he signs in.
- **Shirts made before makers were kept.** A shopper-made shirt with no maker takes the account that
  first bought it. With no orders, the next signed-in shopper to make that setting gets it.
- **The surcharge changed mid-cart.** If Dan changes the amount, or switches the surcharge off,
  checkout shows the new total and asks him to look again, like any price change. Placed orders
  keep what they were charged.
- **More than one.** A one-of-a-kind shirt in quantity 3 pays the surcharge 3 times, as its own line.
- **One of a kind, but resting.** If the owner rests a shopper-made shirt, it's off the floor like
  any resting shirt. Its page says retired, and order history keeps it.
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

- **FR-001**: The generator MUST live in two places, both drawing with the same generator:
  - the shoppers' dial in the store (US1, US2)
  - the owner's generator in Dan's Office (US3)

**The generator**

- **FR-002**: A pattern MUST come from a recipe: a level of complicated, a style (polo or
  button-down), and a shuffle. The same recipe MUST always give the same art and the same counted
  score.
- **FR-003**: A pattern's complexity score MUST be counted from the pattern itself: its shapes, its
  distinct colors and its layers. Adding a shape, a color or a layer never lowers the count.
  - The count is one point for every 10 points the shapes are drawn with, rounded down, plus 5 for
    each distinct color beyond the first, plus 10 for each layer beyond the first. A dot counts 1,
    a triangle 3, a rectangle 4, and a zigzag one per corner (owner review, Q8).
  - At the same score, a generated shirt MUST look about as busy as the store's hand-drawn seed
    shirts. Above the seed shirts' range, the shapes become dense tangles that stay loud.
  - A generated shirt MUST start at its counted score.
  - The owner MAY change that score afterwards in the console, like any shirt's (constitution II, as
    amended for 007). The art stays as drawn, and the shirt is still found by its recipe.
- **FR-004**: For any shuffle, a higher level MUST never produce a lower counted score. So turning
  the dial up never lowers the price.
- **FR-005**: Every pattern above the BLAND tier MUST be loud: only the store's bright colors.
  Patterns in the BLAND tier MUST use only muted, earth-tone colors (constitution III).
- **FR-006**: Every pattern MUST be vector art that stays crisp in the store's zoom viewer, with each
  motif distinguishable at maximum zoom (constitution III). Once a pattern becomes a shirt, its art
  is stored with the store's other images.
- **FR-007**: The range MUST run from the bottom of BLAND up to a fixed score of 10,249, under any
  tuning (010 FR-011). That's where the exponential MSRP ran out of numbers at its default tuning;
  the straight line that replaced it never runs out, so the top stayed where it was. One step
  beyond shows "That's too complicated to price, even for Dan." and can't be bought (analysis I1).
- **FR-008**: The score MUST NEVER reach shoppers (constitution II): not on the page, not on the
  dial, not in its labels or accessible names, not in a recipe link, not in a generated shirt's
  name, and not inside the art file.

**The dial (US1)**

- **FR-009**: While the switch is on, the store MUST offer a dial page, "How complicated can it
  get?", reachable from the shirts page and the home page. On the shirts page its link sits under
  the filters: in the sidebar on wider screens, and under the filter toggle on a phone (Q9).
- **FR-010**: The dial MUST show the pattern on the shirt, its tier badge and tagline, and its price
  (exact, to the cent), and update them as the dial moves. Shuffle gives a new pattern at the same
  level, and the style can be switched.
- **FR-011**: Every dial setting MUST have a link that reopens exactly that shirt.
- **FR-012**: The dial page MUST speak in Dan's voice as it climbs, and disparage the BLAND end like
  every bland shirt (002). It never explains the joke.
- **FR-013**: The dial page is a store page: it works under Extreme Awesomeness, and the price, the
  tier badge and Add to Cart stay readable (constitution V).

**Buying (US2)**

- **FR-014**: Pressing "Make it mine" on a dial setting MUST make it a real catalog shirt at that
  moment, with:
  - a unique name in Dan's voice
  - its art
  - its counted score
  - its MSRP as its price
  - its maker: the signed-in shopper who pressed it (Q4)

  It then takes him to the shirt's own page. There he picks a size and adds it to the cart like any
  shirt, with every tactic that applies (plan refinement: one Add to Cart, one shaming loop). A
  signed-out shopper is sent to sign in first and comes back to the same setting. Nothing is made
  until he's signed in.
- **FR-015**: The same recipe MUST always become the same shirt. Making it again, by anyone, lands
  on the shirt that exists. If someone else made it, it stays theirs.
- **FR-016**: A generated shirt MUST be buyable by every payment method at the price the store
  resolves at checkout (server-authoritative), by whoever may buy it (FR-018). It MUST appear in
  order history with its art, and its page MUST stay viewable for as long as the order exists
  (constitution II).
- **FR-017**: Generated shirts MUST follow every catalog rule. A BLAND one is refused while bland
  shaming is on, through the usual loop. A setting whose price would break the bland rule can't be
  added. The catalog check stays at zero errors.
- **FR-018**: A shopper-made shirt MUST be one of a kind: made to order for its maker (Q4).
  - Only its maker can add it to a cart or buy it, in any quantity and in any number of orders. It
    never sells out.
  - Anyone can open its page. To anyone but its maker it says it's someone else's (no name), with
    no size picker and no Add to Cart. A guest also gets a way to sign in, in case it's his.
  - The store refuses every other way in: an add, a quantity raise, a sign-in merge, and a checkout.
    The cart audit takes out such a line, with a line saying why.
  - It MUST NOT appear in:
    - the shirts listing or its filters
    - the home page
    - the fake purchase pop-ups
    - the store's suggestions (such as the shaming loop's better pick)

  That lasts until the owner puts it into mass production (FR-021). After that it's an ordinary
  shirt on the floor, for everyone. The owner can make it one of a kind again. Shirts the owner
  generates are ordinary shirts from the start.

**Dan's Office (US3)**

- **FR-019**: The owner MUST be able to generate a pattern in the console by target level, style and
  shuffle, and see the art, counted score, tier and MSRP before saving. The level is a score box
  with a slider beside it (Q9). The slider is spaced like the dial (fine steps up to 200, then
  faster), and the two follow each other.
- **FR-020**: The owner MUST be able to save a pattern as a new catalog shirt. It rests until the
  owner puts it on the floor, its art joins the media library, and its name is editable.
- **FR-021**: The console's shirts list MUST mark generated shirts, made by the owner or by a
  shopper, and filter to them.
  - The owner edits them like any shirt, the score included (FR-003).
  - The shopper creations (the list filtered to shopper-made shirts) are Dan's review queue. Each
    shirt's editor shows its maker, linked to that customer in the console.
  - For a shopper-made shirt, the owner can put it into mass production: listed, for everyone,
    every tactic, no surcharge. He can also make it one of a kind again (FR-018). The list marks a
    mass-produced one.
- **FR-022**: The generator in the console MUST stay calm, like the rest of the office (constitution
  V, "The back office is calm"): no animation, and the preview is still art.

**The switch**

- **FR-023**: The pattern generator MUST have its own store switch, on by default, listed on the
  console's switchboard with one plain line.
  - While it's off, the dial page and its links are gone (the dial address shows the store's
    ordinary 404).
  - Shirts already generated are unaffected.
  - The owner's generator in the console still works.

**Made to order (owner review)**

- **FR-026**: On a one-of-a-kind shirt, the urgency tactics MUST fit made to order (Q7):
  - Its page shows no fake crowd ("N people are looking") and no "just bought this pattern".
  - While fake scarcity is on, its stock lines say it's made to order:
    - on its page and its cart line, instead of "Only 1 left!"
    - when he adds one, instead of "we found another one!"
    - on a cart line holding more than one, instead of "we found a few more"
  - The countdown and every other tactic apply as usual.
- **FR-027**: The **Uniquity Surcharge™** MUST be a flat fee on every one-of-a-kind shirt (Q5):
  - It's charged per shirt: a quantity of 3 pays it 3 times.
  - The amount is a store setting the owner edits in Dan's Office: dollars and cents, $0.00 or more,
    $499.99 by default. It has its own switch on the switchboard, on by default (constitution IV).
  - It shows as its own line wherever the money shows: noted on the shirt's page beside the price,
    and as its own line on the cart, at checkout, on the receipt and in order history. Every
    payment method pays it as part of the total.
  - The order keeps the amount it was charged. Changing the setting later never changes a placed
    order.
  - The server works it out at checkout. A total the shopper didn't see (the amount changed, or the
    switch flipped) is refused like any price change.
  - Mass-produced and ordinary shirts never pay it. While the switch is off, nothing does.

**Dan's Office, everywhere (owner review)**

- **FR-028**: A console confirmation MUST go away by itself after a few seconds (4), in place, with
  no fade or slide (constitution V, the back office is calm). The next action shows it again, even
  with the same words. A refusal stays: it says what to fix.

**Everywhere**

- **FR-024**: The dial page, and the console's generator, MUST work from a 360px-wide phone up, with
  no sideways scrolling (constitution V).
- **FR-025**: Every shirt price MUST be exact to the cent and come from the store's one MSRP
  algorithm (constitution II, commerce constraints). The Uniquity Surcharge is an owner-set fee,
  exact to the cent, and never part of a shirt's price. An order's total MUST equal its shirts, plus
  its surcharges, plus its add-ons, to the cent.

### Key Entities *(include if feature involves data)*

- **Recipe**: a level of complicated, a style and a shuffle. Fully determines a pattern. Shareable
  as a link that doesn't reveal the score.
- **Pattern**: the art a recipe makes, and the complexity score counted from its shapes, colors and
  layers.
- **Generated shirt**: a catalog shirt made from a recipe. It has:
  - its stored art
  - a score that starts at the count and that Dan can change
  - its recipe, so the same recipe finds it again
  - where it came from (the dial or the owner)
  - for a shopper-made shirt, whether Dan has put it into mass production, and its maker (the only
    account that can buy it while it's one of a kind)
- **Pattern generator switch**: a store setting, on by default.
- **Uniquity Surcharge**: a store setting (an amount and a switch, on by default). Each order keeps
  what it charged: per shirt on each order line, and in all on the order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The same recipe gives byte-identical art and the same score every time, across a sample
  of at least 1,000 recipes.
- **SC-002**: Across the whole dial, for every shuffle sampled, the counted price never goes down
  from one step to the next.
- **SC-008**: Zero shopper-made shirts appear in the listing, on the home page, in the pop-ups or in
  the store's suggestions until the owner lists one.
- **SC-003**: Zero complexity scores appear anywhere a shopper can reach: dial pages, recipe links,
  generated shirt names, pages and art files.
- **SC-004**: A shopper can go from opening the dial to a placed order for a generated shirt in under
  2 minutes.
- **SC-005**: The most complicated priceable pattern draws in under 2 seconds on a mid-range phone,
  and its art file is under 2 MB.
- **SC-006**: After any number of generated shirts are made, the catalog check reports zero errors.
- **SC-007**: The dial page has no sideways scrolling at 360px wide, with Extreme Awesomeness on or
  off, and the price, badge and Add to Cart stay readable throughout.
- **SC-009**: Zero orders hold a one-of-a-kind shirt bought by anyone but its maker.
- **SC-010**: Every order's total equals its shirts, plus its surcharges, plus its add-ons, to the
  cent, across every payment method.

## Assumptions

- Generated shirts come in the store's two styles, polo and button-down, and its sizes, S–XXL.
- A shopper-made shirt sells at its MSRP until the owner sets a final price. The dial never offers
  an owner price.
- No uploading or hand-editing of patterns: the generator draws, and the shuffle is the only
  control besides level and style.
- The checkout gate, add-ons, roach motel and countdowns apply to generated shirts exactly as to any
  shirt. One-of-a-kind shirts add one new tactic, the Uniquity Surcharge (FR-027), and swap fake
  scarcity's and social proof's lines for made-to-order ones (FR-026).
- Generated names come from word banks in Dan's voice, unique per shirt.
- Changing the generator later may change settings nobody has made yet. Shirts already made keep
  their stored art.
- Stored art never redraws. FR-005's palettes apply when a pattern is drawn. If Dan re-scores a
  generated shirt into BLAND, or moves BLAND's band, the art stays as drawn, the same as hand-drawn
  shirts (analysis U2).
- **Constitution note.** II says "The store owner assigns each shirt's complexity score... The
  owner's judgment ... is final."
  - Per Q2, a generated shirt starts at its counted score, and the owner can change it.
  - II gets a wording amendment saying so, drafted with the plan and ratified by merging this
    feature's PR, as 008 did.

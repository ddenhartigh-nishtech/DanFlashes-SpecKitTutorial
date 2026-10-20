# Feature Specification: Gentler Pricing Curve

**Feature Branch**: `010-gentler-pricing-curve`

**Created**: 2026-10-20

**Status**: Draft (Q1–Q3 resolved 2026-10-20)

**Input**: User description: "Gentler Pricing Curve (ROADMAP 010). Replace the exponential MSRP with a straight line: MSRP = base price + price per point × complexity score, both owner-tunable in Settings, deterministic, strictly increasing, in one place, no ceiling. Defaults: base $50.00, $25.00 a point (a real shirt still starts at $300 at score 10; a score of 9,000 is $225,050). Retroactive: the existing store's tuning becomes the new defaults, and every shirt reprices to the new line at once — including the four shirts Dan priced himself, whose final prices are cleared (owner decision: "Clear them"; the seed's Hawaiian Tax Return $1,040 goes too). Past orders keep what was paid. The shopper dial keeps its current top, a fixed score of 10,249 (where the old exponential ran out of numbers), and step 101 keeps "That's too complicated to price, even for Dan."; the console generator stops there too. The console's tuning form, its live before/after preview, and the pricing chart (now a linear price axis, the MSRP a straight line) follow the new formula. BLAND shirts must still cost less than a real shirt. Needs constitution II amended ("exponential" → straight line; MAJOR, 4.2.0 → 5.0.0). Builds on 001 (pricing), 007 (the dial's top), 008 (Settings, pricing analysis)."

**Builds on**:
- 001-core-storefront: the one MSRP algorithm, final-price resolution (Dan's price, else the MSRP),
  tiers and the BLAND rule, carts, checkout's re-pricing, order history
- 007-pattern-generator: the dial, its top step, the console generator, shopper-made shirts
- 008-admin-console: the MSRP dials in Settings and their live preview, the pricing analysis and its
  chart, the shirt editor's price preview, the catalog check

## Clarifications

### Session 2026-10-20

The owner raised this while trying 007's generator: a score of 9,000 priced at a 274-digit number.

- Q1: How steep should the default line be? → A: **$25 a point, from a base of $50.**
  - A real shirt still starts at $300 (score 10), and BLAND barely changes ($100 and $200 for the
    two seed BLAND shirts).
  - The top of the store gets cheap: Dan's Masterpiece (130) goes from $1,228,800 to $3,300.
  - A score of 9,000 is $225,050.00.
- Q2: What happens to the prices Dan set himself? → A: **Clear them.**
  - Every shirt follows the new line. That covers the four owner prices in the owner's store
    (Hawaiian Tax Return's $1,040 and three generated shirts at $10,000, $27,000 and $1,300,000)
    and any other store's.
  - The seed's $1,040 on Hawaiian Tax Return goes too, so a freshly reset store matches.
- Q3: Where does the dial's top sit, now that the price never runs out of numbers? → A: **Keep
  10,249.**
  - That's today's top: the score where the old exponential ran out of numbers at the default
    tuning. It's now a fixed score that doesn't move with the tuning.
  - Step 101 still says "That's too complicated to price, even for Dan."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The Reprice (Priority: P1)

Dan updates the store. Every shirt reprices at once on the new line. Beige Regret drops to $100.
Dan's Masterpiece, once $1,228,800, is now $3,300, which the guy can almost afford if he skips a few
meals. The shirts Dan priced by hand follow the line like everything else. The guy's order history
still shows exactly what he paid, because all sales are final.

**Why this priority**: it's the feature. Prices nobody can read don't make him buy another shirt
(constitution I).

**Independent Test**: upgrade a store that has owner prices, a cart and past orders. Then confirm:
- every shirt's price is base + price per point × score, to the cent
- no owner prices remain
- every past order is unchanged to the cent
- the open cart shows the new prices

**Acceptance Scenarios**:

1. **Given** a store on the old curve, **When** it's upgraded, **Then** every shirt sells at $50.00
   + $25.00 × its score: catalog, generated and shopper-made shirts, on the floor or resting.
2. **Given** shirts Dan priced himself, **When** the store is upgraded, **Then** their prices are
   cleared and they sell at their new MSRP.
3. **Given** past orders, **When** the store is upgraded, **Then** every line price, MSRP, surcharge
   and total in order history is exactly what it was.
4. **Given** a shirt in a cart, **When** the guy looks at his cart after the upgrade, **Then** it
   shows the new price. **Given** he was mid-checkout, **When** he places the order, **Then**
   checkout refuses the old total and shows him the new one, like any price change.
5. **Given** the shopper pages, **When** he looks anywhere, **Then** he still sees prices and tier
   badges, never a score.

---

### User Story 2 - The Dial Still Climbs (Priority: P2)

He turns the dial all the way up. The price climbs steadily the whole way: hundreds, then thousands,
then a quarter of a million at the very top. One step past the top, it still says "That's too
complicated to price, even for Dan." Dan doesn't explain why.

**Why this priority**: the dial is 007's joke, and it has to survive the new math.

**Independent Test**: step the dial from 0 to 101 and confirm:
- the prices never go down
- step 100 is a score of 10,249, priced $256,275.00 by default
- step 101 can't be bought
- links made before the upgrade still open the same shirts

**Acceptance Scenarios**:

1. **Given** the dial, **When** he steps it up, **Then** the price stays the same or goes up, and
   every price is the new line's.
2. **Given** step 100, **When** he looks, **Then** it's the score-10,249 shirt, whatever the tuning.
3. **Given** step 101, **When** he turns there, **Then** it says "That's too complicated to price,
   even for Dan." and can't be bought.
4. **Given** a dial link or a shopper-made shirt from before the upgrade, **When** he opens it,
   **Then** it's the same shirt with the same art, at its new price.
5. **Given** Dan's generator in the console, **When** he asks for a score above 10,249, **Then** it
   refuses with the same line.

---

### User Story 3 - Dan Tunes the Line (Priority: P3)

Dan opens Settings. Two dials: a base price and a price per point. He types $40 a point and watches
every shirt's price now and after, side by side, before he saves. The line on his pricing chart is
straight. The guy doesn't need a number, and neither does Dan, but he's got two.

**Why this priority**: the constitution says the tuning is Dan's (II). The defaults have to be right
first.

**Independent Test**: in the console:
- change the price per point, and check the preview against the formula for every active shirt
- save it, and confirm the store reprices on its next page load
- confirm a zero, negative or malformed dial is refused, and nothing is saved
- confirm the pricing chart draws the MSRP as a straight line on a linear price axis, with every
  shirt at its MSRP on it

**Acceptance Scenarios**:

1. **Given** Settings, **When** Dan opens the MSRP dials, **Then** there are two, the base price and
   the price per point, with the formula in words and what a real shirt starts at.
2. **Given** Dan types new dials, **When** he looks before saving, **Then** every active shirt shows
   its MSRP now and after, worked out by the store's own formula.
3. **Given** valid dials, **When** he saves, **Then** the store reprices on its next page load, and
   he sees the console's usual short-lived confirmation.
4. **Given** a base price or price per point that's blank, zero, negative or not a dollar amount,
   **When** he saves, **Then** it's refused with a message that stays, and nothing changes.
5. **Given** the pricing page, **When** he looks at the chart, **Then** the price axis is linear, the
   MSRP is a straight line, and every shirt at its MSRP sits on it.
6. **Given** the shirt editor, **When** he types any whole score, **Then** the price preview shows
   its MSRP. No score is too complicated to price there.

---

### Edge Cases

- **A huge score by hand.** Dan can score a shirt 1,000,000 in the editor. It prices at
  $25,000,050.00. There's no ceiling (constitution II), and the price shows in full without
  scrolling sideways on a phone.
- **Retuned mid-cart.** As today: carts follow on their next look. A checkout that started at the
  old prices is refused and shows the new total. Placed orders never change.
- **Tiers moved.** "What a real shirt starts at" is the MSRP at the lowest score of the first tier
  above BLAND, so it moves when Dan moves that tier. If a BLAND shirt Dan priced himself would sit at
  or above it, the save is refused, and the catalog check flags it, like today.
- **No tier above BLAND.** If BLAND is the only tier, there's no real shirt to undercut, and the
  BLAND price rule has nothing to check.
- **Tiny dials.** $0.01 a point and a $0.01 base are allowed. Prices barely climb, but they still
  climb, and no shirt is free.
- **Big dials.** A huge price per point gives huge prices, exact to the cent and shown in full.
- **Dan prices a shirt again.** After the reprice, Dan can set his own price on any shirt, as today.
- **One of a kind.** A shopper-made shirt reprices like any shirt. The Uniquity Surcharge is a fee,
  not a price, so it doesn't change.
- **Money that isn't a price.** Flash Credit balances, the per diem, the Flash Credit presets,
  add-on prices and the Uniquity Surcharge amount don't change.
- **Pricing inversions.** With Dan's prices cleared, every shirt sits on the line, and the pricing
  page lists no inversions until he sets prices again.
- **The bland rule at the dial.** 007 refused a BLAND dial step priced at or above a real shirt's
  start. On a climbing line that can't happen, but the rule still stands.

## Requirements *(mandatory)*

### Functional Requirements

**The curve**

- **FR-001**: The MSRP MUST be a straight line in the complexity score: **MSRP = base price + price
  per point × score**, exact to the cent. It MUST live in one place, be deterministic, and be
  documented where Dan tunes it (constitution II, as amended).
- **FR-002**: The MSRP MUST be strictly increasing: each extra point adds exactly the price per
  point. Every whole score from 0 up MUST have an MSRP. There is no ceiling, and nothing in the store
  or the console refuses a score as too complicated to price, except the dial and the generator at
  their fixed top (FR-011).
- **FR-003**: The owner MUST be able to tune two dials in Settings:
  - the **base price**: the MSRP at score 0, at least $0.01
  - the **price per point**: at least $0.01

  Both are exact dollar amounts to the cent. The formula itself isn't a setting.
- **FR-004**: The defaults MUST be a base price of $50.00 and $25.00 a point (Q1).
- **FR-005**: A shirt's final price is still Dan's price if he set one, otherwise its MSRP (001).
  What the store displays and charges doesn't change in any other way.

**The BLAND rule**

- **FR-006**: "What a real shirt starts at" MUST be the MSRP at the lowest score of the first tier
  above BLAND ($300.00 by default, at score 10). A BLAND shirt's final price MUST be less than that
  (constitution III).
  - On a climbing line, a BLAND shirt at its MSRP always is.
  - A BLAND shirt Dan priced himself is still checked.
  - With no tier above BLAND, the rule has nothing to check.

**The reprice**

- **FR-007**: Upgrading a store MUST:
  - replace its MSRP tuning with the defaults (FR-004): the old exponential's dials have no
    straight-line equivalent
  - clear every owner-set final price on every shirt, whatever its origin or status (Q2)

  So every shirt sells at its new MSRP at once.
- **FR-008**: Past orders MUST keep exactly what they charged: every line price, MSRP, surcharge,
  add-on and total, to the cent.
- **FR-009**: Carts MUST follow at once. A cart shows the new prices on its next look. A checkout
  begun at the old prices is refused and shows the new total, through the store's existing
  price-changed check.
- **FR-010**: The seed catalog MUST hold no owner prices, so a freshly reset store sells every shirt
  at its MSRP (Q2).

**The dial and the generator (007)**

- **FR-011**: The dial's top MUST be a fixed score of 10,249 under any tuning (Q3):
  - Step 100 is that score, and the steps below keep their spacing.
  - Step 101 shows "That's too complicated to price, even for Dan." and can't be bought.
  - The console generator's range ends at the same score and refuses anything above it with the
    same line.
- **FR-012**: Recipe links and shopper-made shirts from before the upgrade MUST keep opening the
  same shirts, with the same art, at their new prices.

**Dan's Office (008)**

- **FR-013**: The Settings MSRP form MUST:
  - offer the two dials (FR-003), with the formula in words and what a real shirt starts at under
    the dials as typed
  - show every active shirt's MSRP now and after, as Dan types, worked out by the store's own
    formula
  - refuse a blank, zero, negative or malformed dial with a message that stays, saving nothing
- **FR-014**: The pricing chart MUST use a linear price axis, so the MSRP is a straight line. Every
  shirt at its MSRP sits on that line, and every amount shown is exact.
- **FR-015**: The shirt editor's price preview MUST show the MSRP for any whole score typed.
- **FR-016**: The catalog check MUST hold the catalog to the new curve and report 0 errors on an
  upgraded store and on a freshly reset one.

**The constitution and the record**

- **FR-017**: The constitution MUST be amended to v5.0.0, ratified by merging this feature:
  - II: the MSRP is a straight line (a base price plus a price per point), replacing "exponential",
    with those two dials named as the owner's
  - III: "the starting price of a real Dan Flashes shirt" is defined as in FR-006
- **FR-018**: The specs and README that describe the exponential MSRP or its dials (001, 007, 008)
  MUST be brought in line, as living specs.

### Key Entities *(include if feature involves data)*

- **MSRP tuning** (part of the store's settings): a **base price** and a **price per point**, both
  exact dollar amounts. They replace the start price, anchor score and doubling interval.
- **Shirt**: its complexity score and its optional owner-set final price. The upgrade clears every
  final price. Nothing else about a shirt changes.
- **Order line**: what it charged and the MSRP it snapshotted. Untouched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the upgrade, every shirt's displayed price equals $50.00 + $25.00 × its score to
  the cent, and no owner-set price remains.
- **SC-002**: After the upgrade, every past order's lines, surcharges, add-ons and total are
  identical to the cent.
- **SC-003**: By default, a score of 9,000 prices at $225,050.00 and the dial's top (10,249) at
  $256,275.00. Every price in the store fits a 360px phone without sideways scrolling.
- **SC-004**: Under every valid tuning, prices climb by exactly the price per point for each point
  of score, and no BLAND shirt at its MSRP costs as much as a real shirt's start.
- **SC-005**: Before saving new dials, Dan sees the after price of 100% of active shirts. After
  saving, the next store page shows them.
- **SC-006**: On the pricing chart, every shirt at its MSRP sits on the straight MSRP line.
- **SC-007**: The catalog check reports 0 errors on an upgraded store and on a freshly reset one.

## Assumptions

- **The old dials don't carry over.** Today's tuning ($300.00 at score 10, doubling every 10) has no
  straight-line equivalent, so every store takes the defaults when it's upgraded. Dan retunes in
  Settings if he likes.
- **"Clear them" means every store.** The upgrade clears every owner-set price wherever it runs,
  not just the four in the owner's store.
- **The dial's top is a number now.** 10,249 is where the old exponential ran out at the default
  tuning. It no longer moves with the tuning, and the art at that score already draws fast on a
  phone (007 SC-005).
- **Not a gimmick.** The curve has no on/off switch. It's the store's one MSRP.
- **Stacked on 007.** This branch starts from 007's, because 007 (PR #9, constitution v4.2.0) isn't
  merged yet. Its pull request goes to `main` once 007 is in, and its amendment takes the
  constitution from 4.2.0 to 5.0.0: MAJOR, because it redefines a principle's MUST.
- **Shoppers still never see a score** (constitution II). Nothing in this feature shows one.

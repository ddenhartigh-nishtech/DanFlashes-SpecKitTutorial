# Feature Specification: Brand Pages & Bland-Shirt Shaming

**Feature Branch**: `002-brand-pages-and-shaming`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Brand pages and bland-shirt shaming. (1) An About Us page: an egocentric bio of Dan Flashes himself that tries far too hard to justify the inflated prices — the superior quality and complexity of his wild polos and button-downs — reachable from the site navigation. (2) Bland-shirt shaming: when the shopper tries to add a BLAND-tier shirt to his cart, the store repeatedly asks "You sure about that?", each time disparaging the type of person who would wear such basic attire and steering him toward something more complicated; he can push through and buy it anyway, but only after enduring the whole loop. (3) Confirmshaming: the buttons for backing out or choosing the bland option are worded to make him feel bad ("No thanks, I'd rather blend in"). Per the constitution, bland-shirt shaming and confirmshaming are manipulation tactics, so each needs its own owner on/off switch."

**Builds on**: 001-core-storefront (catalog, tiers with BLAND as the lowest, the cart, accounts, and
store settings).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - "You Sure About That?" (Priority: P1)

The guy finds Beige Regret and, for reasons known only to him, hits Add to Cart. The store stops
him: "You sure about that?" A line about the kind of man who wears beige, and right next to it a
shirt that's actually complicated. He insists. "You sure about that?" again, meaner this time, with an
even more complicated shirt. He insists again. Only after he has endured every round does the bland
shirt go in his cart, with one last parting shot.

**Why this priority**: this is the core gag of the feature and the constitution's "bland-shirt
shaming" tactic. It's the piece that changes shopping behavior.

**Independent Test**: on a BLAND-tier shirt's page, add it to the cart. Confirm that the loop runs
for the configured number of rounds, each with a new line and a more complicated recommendation.
Bailing out at any round adds nothing, and the shirt reaches the cart only after the final round.

**Acceptance Scenarios**:

1. **Given** bland-shirt shaming is on, **When** the shopper adds a BLAND-tier shirt with a size
   picked, **Then** nothing is added yet. The first "You sure about that?" round appears, with a
   disparaging line and a recommended, more complicated shirt.
2. **Given** round *n* of the loop, **When** he chooses to continue with the bland shirt, **Then**
   round *n + 1* appears with a different disparaging line and a recommendation more complicated
   than the last.
3. **Given** any round, **When** he takes the escape (the recommended shirt), **Then** he lands on
   that shirt's page and nothing is added to his cart.
4. **Given** the final round, **When** he continues, **Then** the bland shirt is added in the chosen
   size and a final disparaging confirmation is shown.
5. **Given** he abandons the loop part-way (navigates away or closes it), **When** he tries again,
   **Then** the loop starts over at round 1.
6. **Given** a shirt that is *not* in the BLAND tier, **When** he adds it, **Then** it goes straight
   into the cart exactly as in 001, with no extra steps.

---

### User Story 2 - Confirmshaming (Priority: P2)

Every time the guy backs away from something the store wants, the button makes him feel it. Choosing
the bland shirt reads "Yes, I'd rather blend in." Removing a shirt from the cart and signing out get
the same treatment.

**Why this priority**: it amplifies P1 and the rest of the store, but P1 works on neutral buttons
too.

**Independent Test**: with confirmshaming on, check every covered decline choice for its shaming
label. Switch it off and confirm the same choices show neutral labels and still work identically.

**Acceptance Scenarios**:

1. **Given** confirmshaming is on, **When** a covered decline choice is shown, **Then** it carries
   its shaming label (e.g. "No thanks, I'd rather blend in").
2. **Given** confirmshaming is off, **When** the same choice is shown, **Then** it carries a plain,
   neutral label.
3. **Given** either setting, **When** he uses a covered choice, **Then** the outcome is identical.
   Only the wording changes.

---

### User Story 3 - About Dan (Priority: P3)

The guy clicks "About" and meets Dan Flashes: a man who believes, completely and loudly, that his
shirts are the most important garments ever produced. The bio walks through his genius, his method
(complexity, always more complexity), and an increasingly desperate case for why the prices are not
only fair but generous, ending with Exhibit A: the store's most complicated shirt and its price.

**Why this priority**: it's pure brand. It's delightful, but nothing else depends on it.

**Independent Test**: from any page, on desktop and phone, reach the About page in one click, read
the bio, and follow Exhibit A to the most expensive active shirt.

**Acceptance Scenarios**:

1. **Given** any page, **When** he opens the site navigation (desktop or phone), **Then** an "About"
   link is there and opens the About page.
2. **Given** the About page, **When** it loads, **Then** it presents Dan's bio in his own
   self-important voice, covering who he is, his method, and why the prices are justified, and it
   never explains the joke.
3. **Given** the About page, **When** it loads, **Then** "Exhibit A" shows the current most expensive
   active shirt, with its tier badge and price, linking to its page.

---

### Edge Cases

- **Switch flipped mid-loop**: the store applies the setting in effect when the shirt would actually
  be added. If shaming is turned off mid-loop, the next confirmation adds the shirt. If it is turned
  on, an unconfirmed bland add is refused and the loop starts.
- **A shirt re-tiered mid-loop** (the owner moves BLAND's range): whether a shirt is bland is decided
  at the moment it would be added.
- **Nothing more complicated to recommend** (e.g. a catalog with no active non-bland shirts): the
  round still runs, and the escape goes to the shirt listing instead of a specific shirt.
- **Bypass attempts**: a bland shirt cannot be added by skipping the loop. The store refuses an
  unconfirmed bland add while shaming is on.
- **Bland quantity changes in the cart**: changing the quantity of a bland line already in the cart
  does not restart the loop. He already committed.
- **The Exhibit A shirt is deactivated**: Exhibit A shows the next most expensive active shirt. If
  there is none, the section is omitted.

## Requirements *(mandatory)*

### Functional Requirements

**About page**

- **FR-001**: The store MUST have an About page, linked from the site navigation on every page, in
  both the desktop navigation and the phone menu.
- **FR-002**: The About page MUST present Dan Flashes' bio in his own egocentric voice, covering who
  he is, his method (pattern complexity), and an overreaching justification of the prices. It MUST
  never explain the joke (constitution I).
- **FR-003**: The About page MUST feature "Exhibit A": the current most expensive active shirt, with
  its tier badge and price, linking to that shirt's page.
- **FR-004**: The About page content MUST be [NEEDS CLARIFICATION: written into the store's copy
  (code change to edit), or owner-editable in the store data like the catalog? See Q3].

**Bland-shirt shaming**

- **FR-005**: Bland-shirt shaming MUST be an owner on/off setting, on by default (constitution IV).
- **FR-006**: While it is on, adding a BLAND-tier shirt from its page MUST start the "You sure about
  that?" loop instead of adding the shirt.
- **FR-007**: The loop MUST run for [NEEDS CLARIFICATION: how many rounds — fixed, owner-configurable,
  or random? See Q1].
- **FR-008**: Each round MUST show "You sure about that?" with a disparaging line not used earlier in
  the same loop, and recommend an active shirt more complicated than the previous round's
  recommendation.
- **FR-009**: Each round MUST offer an escape (go to the recommended shirt; nothing is added) and a
  continue choice.
- **FR-010**: The bland shirt MUST be added only after the shopper continues through every round. The
  store MUST refuse to add a BLAND-tier shirt whose loop wasn't completed, while shaming is on.
- **FR-011**: Completing the loop MUST add the shirt in the chosen size and show a final disparaging
  confirmation.
- **FR-012**: Shirts outside the BLAND tier, and all shirts while shaming is off, MUST be added
  exactly as in 001.

**Confirmshaming**

- **FR-013**: Confirmshaming MUST be an owner on/off setting, on by default and independent of
  bland-shirt shaming (constitution IV).
- **FR-014**: While it is on, the covered decline choices MUST use shaming labels. While it is off,
  they MUST use neutral labels. The covered choices are [NEEDS CLARIFICATION: which decline moments
  are covered? See Q2].
- **FR-015**: Changing a label MUST NOT change what the choice does.

**Voice**

- **FR-016**: All new copy (the bio, the shaming lines, the shaming labels, the final confirmation)
  MUST use the Dan Flashes voice from constitution I.

### Key Entities

- **Store Settings** (from 001) gains switches for bland-shirt shaming and for confirmshaming, plus
  any round configuration from Q1.
- **Shaming Round**: one step of the loop. It has a round number, a disparaging line, and a
  recommended shirt that is more complicated than the previous round's.
- **About Content**: Dan's bio, in sections. Where it lives depends on Q3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With shaming on, 100% of BLAND-tier shirts that reach a cart through the shirt page
  went through every round of the loop. 0 unconfirmed bland adds succeed.
- **SC-002**: Escaping at any round leaves the cart unchanged 100% of the time.
- **SC-003**: Within a single loop, 100% of rounds show a disparaging line not repeated earlier in that
  loop, and a recommendation more complicated than the round before (when one exists).
- **SC-004**: With either switch off, its tactic is completely absent: 0 shaming rounds, or 0 shaming
  labels, appear.
- **SC-005**: Adding a non-bland shirt takes the same number of steps as in 001.
- **SC-006**: The About page is reachable in one click from every shopper page, on phone and desktop.
- **SC-007**: When 5 people read the About page cold, at least 4 describe Dan as self-important or
  "trying way too hard."

## Assumptions

- **The loop's recommendations escalate**: round 1 recommends a shirt from the next tier above BLAND,
  and each later round recommends something more complicated, up to the top tier.
- **Shaming lines and labels are brand copy** that ships with the store, like the other copy in 001.
  A pool of at least 6 disparaging lines is enough for variety.
- **Where the loop applies**: it applies when adding from a shirt's page, the only place shirts are
  added in 001. Quantity changes in the cart are not re-shamed.
- **Signed in or not**: the loop applies to guests and signed-in shoppers alike.
- **Out of scope**: the roach-motel cart (005), pre-checked add-ons (005), the urgency engine (004),
  and Flash Mode and the Pipes background (006).

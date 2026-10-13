# Feature Specification: Brand Pages & Bland-Shirt Shaming

**Feature Branch**: `002-brand-pages-and-shaming`

**Created**: 2026-10-13

**Status**: Draft (clarifications Q1–Q3 resolved 2026-10-13)

**Input**: User description: "Brand pages and bland-shirt shaming. (1) An About Us page: an egocentric bio of Dan Flashes himself that tries far too hard to justify the inflated prices — the superior quality and complexity of his wild polos and button-downs — reachable from the site navigation. (2) Bland-shirt shaming: when the shopper tries to add a BLAND-tier shirt to his cart, the store repeatedly asks "You sure about that?", each time disparaging the type of person who would wear such basic attire and steering him toward something more complicated; he can push through and buy it anyway, but only after enduring the whole loop. (3) Confirmshaming: the buttons for backing out or choosing the bland option are worded to make him feel bad ("No thanks, I'd rather blend in"). Per the constitution, bland-shirt shaming and confirmshaming are manipulation tactics, so each needs its own owner on/off switch."

**Builds on**: 001-core-storefront (catalog, tiers with BLAND as the lowest, the cart, accounts, and
store settings).

## Clarifications

### Session 2026-10-13

- Q: How many rounds of "You sure about that?" → A: **Endless.** While shaming is on, the loop never
  ends and a BLAND shirt can never be added to a cart. "Dan Flashes does not sell boring,
  uncomplicated shirts." The only ways out are to relent (close the dialog and keep shopping) or to
  take the recommended, more complicated shirt. This replaces the input's "push through and buy it
  anyway."
- Q: Which decline choices get confirmshaming labels? → A: The bland-shirt loop's "continue with the
  bland shirt" choice, the cart's **Remove**, and **Sign out**. These are the decline moments that
  exist today; later features add their own.
- Q: Where does Dan's bio live? → A: In the store's brand copy, alongside the rest of the site's copy.
  Editing it is a code change. Keep it simple.
- Q: Can bland lines already in a cart stay, or arrive by merging carts at sign-in? → A: **No.** While
  shaming is on, a bland shirt can't be in a cart, period. Adds, quantity raises, and the sign-in
  merge are all refused. Bland lines already in a cart are pulled out with a notice, the same way
  retired shirts are, so they can never be checked out. With the switch off, bland shirts sell
  normally.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - "You Sure About That?" (Priority: P1)

The guy finds Beige Regret and, for reasons known only to him, hits Add to Cart. The store stops him:
"You sure about that?" A line about the kind of man who wears beige, and right next to it a shirt
that's actually complicated. He insists. "You sure about that?" again, meaner, with an even more
complicated shirt. He insists again, and again, and again. It never ends. Dan Flashes does not sell
boring shirts. Eventually he either relents and closes the dialog, or takes the complicated shirt
he's being offered.

**Why this priority**: this is the core gag of the feature and the constitution's "bland-shirt
shaming" tactic. It's the piece that changes shopping behavior.

**Independent Test**: on a BLAND-tier shirt's page, choose a size and add it to the cart. Confirm
that the dialog appears, that insisting any number of times only produces new rounds (each with a
new line and a more complicated recommendation, until the most complicated shirt is reached), that
relenting or escaping leaves the cart unchanged, and that the store refuses a bland add however it
is attempted.

**Acceptance Scenarios**:

1. **Given** bland-shirt shaming is on, **When** the shopper adds a BLAND-tier shirt with a size
   picked, **Then** nothing is added. A "You sure about that?" dialog appears with a disparaging
   line and a recommended, more complicated shirt.
2. **Given** any round, **When** he insists on the bland shirt, **Then** a new round appears with a
   line not used since the pool last cycled, and a recommendation at least as complicated as the
   last (more complicated until the store's most complicated shirt is reached). The bland shirt is
   still not added.
3. **Given** any round, **When** he takes the recommendation, **Then** he lands on that shirt's page
   and nothing is added.
4. **Given** any round, **When** he relents (closes the dialog), **Then** the dialog closes, he stays
   on the bland shirt's page, and nothing is added.
5. **Given** shaming is on, **When** a bland add reaches the store by any route (skipping the dialog
   or raising a bland line's quantity in the cart), **Then** the store refuses it in brand voice and
   the cart is unchanged.
6. **Given** a shirt that is *not* in the BLAND tier, **When** he adds it, **Then** it goes straight
   into the cart exactly as in 001.
7. **Given** shaming is off, **When** he adds a BLAND-tier shirt, **Then** it is added like any other
   shirt.
8. **Given** shaming is on and his cart already holds a bland line (added while it was off), **When**
   he views his cart or checks out, **Then** the line is pulled out with a brand-voice notice and is
   never bought.

---

### User Story 2 - Confirmshaming (Priority: P2)

Every time the guy backs away from something the store wants, the button makes him feel it. Insisting
on the bland shirt reads "Yes, I'd rather blend in." Removing a shirt from his cart and signing out
get the same treatment.

**Why this priority**: it amplifies P1 and the rest of the store, but P1 works on neutral buttons
too.

**Independent Test**: with confirmshaming on, check the three covered choices for their shaming
labels. Switch it off and confirm they show neutral labels and behave identically.

**Acceptance Scenarios**:

1. **Given** confirmshaming is on, **When** the loop's insist button, a cart line's Remove button, or
   the Sign out button is shown, **Then** it carries its shaming label (e.g. "Yes, I'd rather blend
   in").
2. **Given** confirmshaming is off, **When** the same choices are shown, **Then** they carry plain,
   neutral labels ("Yes, I'm sure", "Remove", "Sign out").
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

- **Switch flipped mid-loop**: the store applies the setting in effect when a shirt would actually
  be added. A page already open keeps the behavior it loaded with. Once shaming is turned off, the
  bland shirt adds normally after the page is reloaded.
- **A shirt re-tiered** (the owner moves BLAND's range): whether a shirt is bland is decided at the
  moment it would be added.
- **Bland lines already in a cart** (added in 001, or while shaming was off): once shaming is on,
  they are pulled out the next time the cart is shown or checked out, with a brand-voice notice, the
  same way retired shirts are.
- **Signing in with a guest cart**: while shaming is on, bland lines in the guest cart are not
  carried into the account's cart.
- **The top of the ladder**: once the recommendation reaches the most complicated active shirt,
  later rounds keep recommending it (or rotate among the top tier).
- **Nothing more complicated to recommend** (no active non-bland shirts): the round still runs, and
  the escape goes to the shirt listing.
- **The line pool runs out**: lines don't repeat until every line in the pool has been used, then the
  pool cycles.
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
- **FR-004**: The bio MUST live in the store's brand copy with the rest of the site's copy. Editing
  it is a code change.

**Bland-shirt shaming**

- **FR-005**: Bland-shirt shaming MUST be an owner on/off setting, on by default (constitution IV).
- **FR-006**: While it is on, attempting to add a BLAND-tier shirt from its page MUST open the "You
  sure about that?" dialog instead of adding the shirt.
- **FR-007**: The loop MUST be endless. Insisting on the bland shirt MUST always produce another
  round and MUST NEVER add the shirt.
- **FR-008**: Each round MUST show "You sure about that?" with a disparaging line not repeated until
  the whole pool has been used, and recommend an active shirt at least as complicated as the
  previous round's recommendation (strictly more complicated until the most complicated active
  shirt is reached).
- **FR-009**: Each round MUST offer three choices: take the recommendation (go to that shirt;
  nothing added), relent (close the dialog; stay on the page; nothing added), and insist (next
  round).
- **FR-010**: While shaming is on, no BLAND-tier shirt may be in a cart, however it would get there.
  The store MUST:
  - refuse adds and quantity raises of BLAND-tier shirts, with a brand-voice refusal
  - not carry bland lines over when a guest cart merges at sign-in
  - pull out any bland line already in a cart, with a brand-voice notice, before the cart is shown or
    checked out
- **FR-011**: Shirts outside the BLAND tier, and all shirts while shaming is off, MUST be added
  exactly as in 001.

**Confirmshaming**

- **FR-012**: Confirmshaming MUST be an owner on/off setting, on by default and independent of
  bland-shirt shaming (constitution IV).
- **FR-013**: While it is on, these choices MUST use shaming labels: the loop's insist choice, each
  cart line's Remove, and Sign out. While it is off, they MUST use neutral labels.
- **FR-014**: Changing a label MUST NOT change what the choice does.

**Voice**

- **FR-015**: All new copy (the bio, the shaming lines, the refusal, the shaming labels) MUST use the
  Dan Flashes voice from constitution I.

### Key Entities

- **Store Settings** (from 001) gains two switches: bland-shirt shaming and confirmshaming.
- **Cart audit** (from 001): the check that pulls retired shirts from a cart also pulls bland lines
  while shaming is on.
- **Shaming Round**: one step of the loop. It has a round number, a disparaging line, and a
  recommended shirt.
- **Brand Copy** (from 001) gains the About bio, the pool of shaming lines, the bland-refusal
  message, and the shaming and neutral labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With shaming on, 0 BLAND-tier shirts are added to, merged into, or bought from any
  cart, however it's attempted.
- **SC-002**: Insisting 20 times in a row produces 20 more rounds and still adds nothing.
- **SC-003**: Within a loop, no line repeats until all lines in the pool have been shown, and
  recommendations never get less complicated.
- **SC-004**: Relenting or taking the recommendation at any round leaves the cart unchanged 100% of
  the time.
- **SC-005**: With either switch off, its tactic is completely absent: bland shirts add normally, or
  all three covered choices show neutral labels.
- **SC-006**: Adding a non-bland shirt takes the same number of steps as in 001.
- **SC-007**: The About page is reachable in one click from every shopper page, on phone and desktop.
- **SC-008**: When 5 people read the About page cold, at least 4 describe Dan as self-important or
  "trying way too hard."

## Assumptions

- **The ladder**: round 1 recommends a shirt from the next tier above BLAND, and each later round
  climbs toward the most complicated active shirt, then stays at the top.
- **The line pool**: at least 8 disparaging lines.
- **Default labels with confirmshaming on**:
  - insist: "Yes, I'd rather blend in"
  - Remove: "Remove (and lose your edge)"
  - Sign out: "Sign out (go back to being normal)"
- **Relent label**: always plain and sheepish ("Fine. I'll look at real shirts"). Relenting is what
  the store wants, so it isn't shamed.
- **Who sees the loop**: guests and signed-in shoppers alike.
- **Tests and demos**: 001's journeys that bought a bland shirt now buy a non-bland one, or turn
  shaming off for the test.
- **Out of scope**: the roach-motel cart (005), pre-checked add-ons (005), the urgency engine (004),
  and Flash Mode and the Pipes background (006).

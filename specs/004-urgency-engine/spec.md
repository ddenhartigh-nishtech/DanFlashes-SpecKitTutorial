# Feature Specification: Urgency Engine

**Feature Branch**: `004-urgency-engine`

**Created**: 2026-10-15

**Status**: Draft (Q1–Q3 resolved 2026-10-15)

**Input**: User description: "Urgency engine (ROADMAP 004). Three manipulation tactics from constitution IV, each its own named feature with its own owner on/off switch: (1) Fake scarcity: shirts show alarming stock warnings like "Only 1 left!", and there is always only 1 left; the store has no real inventory and the warning never actually stops a purchase. (2) Countdown timers that quietly reset when they hit zero: a ticking deadline that creates pressure to buy now, then silently starts over. (3) Fabricated social proof: fake activity such as "Gary from Accounts Payable just bought this pattern" and people supposedly looking at a shirt right now. All of it is played completely straight and never explains the joke. None of it may change what anything costs (prices stay server-authoritative: complexity-driven MSRP or the owner's final price), and none of it may block a purchase. Shoppers never see a shirt's complexity score."

**Builds on**:
- 001-core-storefront: the catalog, the listing and detail pages, the cart, checkout, and the store settings
- 002-brand-pages-and-shaming: the switch-per-tactic pattern and the BLAND tier
- 003-revenue-streams-per-diem: the bottom-left corner, which the per diem gauge and its GONE pops already use

## Clarifications

### Session 2026-10-15

- Q1: What does the countdown count down to? → A: **Both, on one shared clock.** A "deal" clock sits
  beside the price on shirt pages ("This price won't last."), and a cart hold sits on the cart and
  checkout ("Your shirts are reserved for…"). It shows **milliseconds** too, for extra intensity.
- Q2: How do the fake purchases show up? → A: **Both.** There's a line on each shirt's page, and
  pop-ups on every page every 20–40 seconds: bottom-right on a wider screen, and at the top on a
  phone (see below). The pop-ups slide away on
  their own, and each has an (x) to close it early.
- Q3: What happens on BLAND shirts? → A: **Inverted.**
  - "Plenty left. Nobody wants these."
  - "0 people are looking at this shirt right now."
  - No coworker ever buys one.

  The countdown stays as it is.
- Owner addition: when he adds a shirt that's "Only 1 left!", the store adds **"Oh wait, we found
  another one!"** It says it again whenever he raises the quantity in his cart. There's still only 1
  left.
- Q: On a phone, where should the fake-purchase pop-ups appear, given that the bottom-left corner
  already holds the per diem gauge and GONE pops? → A: **At the top on phones.**
  - On phones (the layout with the Menu button), each pop-up is a short, full-width banner that drops
    in just under the header. It may briefly cover the page, but never the header.
  - On wider screens it sits bottom-right, clear of everything.
- Owner, after analysis: **once he's bought a shirt, the store admits it found another one.** Its
  warning becomes "Just kidding, we actually found another one! One more left!" everywhere he sees
  it. A pop-up covering something briefly is fine, as long as it's easy to dismiss.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fake Scarcity (Priority: P1)

He's looking at Geo Riot. Right under the price, in letters you could read from the food court: "Only
1 left!" He'd better move. He adds it to his cart. "Oh wait, we found another one!" He bumps the
quantity to 2, and they found another one. The cart still says only 1 left. He buys them. Tomorrow he
comes back, and there's still only 1 left. There is always only 1 left.

**Why this priority**: it's the cheapest tactic to build and the one he sees on every shirt. The other
two stand on their own, but this one makes the whole catalog feel like it's running out.

**Independent Test**: with the scarcity switch on, check that:
- every active, non-bland shirt says "Only 1 left!" on its detail page, its listing card, and its cart
  line
- adding it, or raising its quantity, adds "Oh wait, we found another one!"
- the number never changes, whatever anyone buys
- bland shirts are the opposite: plenty left, and nobody looking
- adding several, checking out, and paying all work exactly as before
- turning the switch off removes every warning and changes nothing else

**Acceptance Scenarios**:

1. **Given** the scarcity switch is on, **When** he views an active, non-bland shirt's detail page,
   **Then** "Only 1 left!" shows beside the price and Add to Cart.
2. **Given** the listing, **When** he browses, **Then** every active, non-bland shirt's card carries the
   same warning.
3. **Given** the shirt is in his cart in any quantity, **When** he views the cart, **Then** its line still
   says "Only 1 left!", and he can still set any quantity from 1 to 99.
4. **Given** "Only 1 left!", **When** he adds the shirt to his cart, **Then** the confirmation also
   says "Oh wait, we found another one!" **When** he raises its quantity in the cart, **Then** the
   cart says it again.
5. **Given** he has bought the shirt, **When** he views it again (its card, its page, or a cart line),
   **Then** it says "Just kidding, we actually found another one! One more left!" It never sells out,
   and no other shopper's purchase changes anything.
6. **Given** a bland shirt, **When** he views it (detail page, listing card, or a cart line while bland
   shaming is off), **Then** it says "Plenty left. Nobody wants these." instead, and adding it never
   finds another one.
7. **Given** the scarcity switch is off, **When** he browses or buys, **Then** no stock warning appears
   anywhere, and everything else behaves exactly as before.

---

### User Story 2 - Countdown Timers That Reset (Priority: P2)

A clock is ticking, down to the millisecond: 09:59.873, 09:59.412. Beside Geo Riot's price: "This price
won't last." In his cart: "Your shirts are reserved for 07:12.356." It's the same clock. He doesn't
know what happens at zero, but he knows he doesn't want to find out. He walks to another page, and the
clock keeps going right where it was. At 00:00.000 nothing happens. The clock is quietly back at
10:00.000, as if it had always been there.

**Why this priority**: it's the second tactic named in the constitution. It needs a clock that keeps
its place as he moves around, which makes it a little more work than scarcity.

**Independent Test**: with the countdown switch on, check that:
- the countdown shows minutes, seconds and milliseconds, ticking down continuously
- it shows beside the price on shirt pages, and on the cart and checkout, as one shared clock
- it keeps its place across pages, reloads and tabs
- at 00:00 it quietly restarts at full length, and nothing else changes
- turning the switch off removes every countdown

**Acceptance Scenarios**:

1. **Given** the countdown switch is on, **When** he views a shirt's detail page, **Then** a "deal"
   countdown sits beside the price under "This price won't last.", ticking down continuously in
   minutes, seconds and milliseconds.
2. **Given** the countdown switch is on and a cart with shirts in it, **When** he views the cart or
   checkout, **Then** a hold countdown reads "Your shirts are reserved for" and the time. It's the
   same clock as the deal countdown, showing the same time.
3. **Given** a countdown at 07:12, **When** he goes to another page or reloads, **Then** it carries on
   from about 07:12. It doesn't start over.
4. **Given** a countdown, **When** it reaches 00:00.000, **Then** it quietly starts again at full
   length. There's no "expired" message, and his prices, cart and checkout are untouched. Nothing
   in the cart is ever released.
5. **Given** the countdown switch is off, **When** he browses or buys, **Then** no countdown appears
   anywhere.

---

### User Story 3 - Fabricated Social Proof (Priority: P3)

As he browses, a pop-up slides in from the bottom-right: "Gary from Accounts Payable just bought Fractal
Fury." It slides away. Thirty seconds later, Craig from Regional Sales buys Geo Riot. On Geo Riot's page:
"23 people are looking at this shirt right now," and Todd from IT just bought this pattern. Everybody
in his office is buying. He should be buying. When a pop-up gets in his way, he hits its (x), and the
next one comes anyway.

**Why this priority**: the funniest of the three, but it needs a cast of fake coworkers and a sense of
activity over time, which makes it the most to build.

**Independent Test**: with the social proof switch on, check that:
- shirt pages show how many people are "looking right now", and a fake coworker's purchase of that
  shirt
- pop-ups of fake purchases come every 20–40 seconds on every page, slide away on their own, and
  close at once with their (x)
- no real shopper's name or order ever shows up
- turning the switch off removes all of it

**Acceptance Scenarios**:

1. **Given** the social proof switch is on, **When** he views an active shirt's detail page, **Then** it
   says how many people are looking at it right now: a believable number that drifts over time and is
   never zero.
2. **Given** the social proof switch is on, **When** he views an active, non-bland shirt's detail page,
   **Then** it names a fake coworker who just bought it: "[Name] from [Department] just bought this
   pattern."
3. **Given** the social proof switch is on, **When** he's on any page for 20–40 seconds, **Then** a pop-up
   slides in (bottom-right on a wider screen, just under the header on a phone): "[Name] from
   [Department] just bought [shirt]." It slides away by
   itself after a few seconds, and the next one follows 20–40 seconds later.
4. **Given** a pop-up, **When** he clicks its (x), **Then** it closes at once. The next one still
   comes.
5. **Given** a bland shirt's detail page, **When** he views it, **Then** it says "0 people are looking at
   this shirt right now." No coworker ever buys a bland shirt, on the page or in a pop-up.
6. **Given** any fake activity, **When** it names a person or a purchase, **Then** the person is from
   the store's fake cast and the shirt is a real, active one. No real shopper and no real order ever
   appears.
7. **Given** the social proof switch is off, **When** he browses or buys, **Then** no fake activity
   appears anywhere.

---

### Edge Cases

- **More than one in the cart**: he has 3 of a shirt, and the line still says "Only 1 left!". The
  warning never caps the quantity, and checkout never refuses because of it.
- **Retired shirts**: an inactive shirt, seen from an old order, shows no urgency at all. It can't be
  bought anyway.
- **The countdown hits zero at checkout**: it restarts and checkout carries on as normal.
- **An empty cart**: there's nothing to hold, so the cart and checkout show no hold countdown. Shirt
  pages still show the deal clock.
- **Found another one, again and again**: every add and every raise says it. Lowering the quantity, or
  removing the shirt, says nothing.
- **A pop-up over a button**: a pop-up may briefly cover the page, a price or Add to Cart included,
  for about 6 seconds or until its (x). It never covers the header or the bottom-left corner.
  - On a wider screen it sits in the bottom-right corner.
  - On a phone it drops in just under the header as a full-width banner, within 360px.
- **Pop-ups while he's away**: a tab in the background doesn't pile up pop-ups. He sees one at a time.
- **A sleeping tab**: when he comes back to a tab that sat in the background, the countdown shows the
  right time left (or has quietly restarted), not where it was when he left.
- **Several tabs**: every tab shows the same countdown.
- **The corner**: nothing floating may cover the bottom-left corner, where the per diem gauge and its
  GONE pops live (003). Only a pop-up may cover a shirt's price, tier badge, or Add to Cart, and
  only briefly, because it's easy to dismiss (owner, after analysis).
- **A 360px phone**: every urgency element fits without sideways scrolling.
- **All switches off**: the store looks and behaves exactly as it did after 003.
- **Prices**: no urgency copy ever shows a price other than the real one: no "was" price, no
  percentage off, and no complexity score.
- **A guest who bought something** (only possible with the checkout gate off) has no order history,
  so he keeps seeing "Only 1 left!".
- **A catalog with no active, non-bland shirts**: fake purchases still need a shirt to name. If there
  isn't one, none appear.

## Requirements *(mandatory)*

### Functional Requirements

**All three tactics**

- **FR-001**: Fake scarcity, countdown timers, and fabricated social proof MUST each be their own
  owner on/off setting, on by default (constitution IV).
- **FR-002**: Turning a tactic off MUST remove every trace of it, and change nothing about the other
  tactics or the rest of the store.
- **FR-003**: No tactic may change a price, a total, or a cart's contents, or block or delay adding to
  the cart, checking out, or paying. Prices stay as the server works them out (the owner's final price,
  or the complexity MSRP).
- **FR-004**: No urgency copy may show a price other than the real one (no "was" prices, no discounts),
  or a shirt's complexity score.
- **FR-005**: The tactics MUST work the same for guests and for signed-in shoppers, except where they
  read his own order history (FR-008).
- **FR-006**: No urgency element may shift the page's layout as it appears or updates. Nothing
  floating may cover the header or the bottom-left corner (003's gauge and pops). Only a pop-up may
  briefly overlap the rest of the page, a price or Add to Cart included, because it slides away on its
  own and closes at once with its (x) (FR-015). Everything MUST fit from a 360px phone up.

**Fake scarcity**

- **FR-007**: While it's on, every active, non-bland shirt MUST say "Only 1 left!":
  - on its detail page, beside the price and Add to Cart
  - on its shirt card, wherever one appears (the listing, the home page, About's Exhibit A)
  - on its cart line
- **FR-008**: There MUST always be exactly 1 left. It never says sold out, and it never limits the
  quantity (1 to 99, as before). Once he has bought a shirt, its warning MUST read "Just kidding, we
  actually found another one! One more left!" wherever "Only 1 left!" would. Only his own orders
  count; nothing other shoppers buy changes anything.
- **FR-009**: Adding a shirt that says "Only 1 left!", or raising its quantity in the cart, MUST add
  "Oh wait, we found another one!" to the confirmation. The warning stays "Only 1 left!".
- **FR-010**: A BLAND shirt MUST instead say "Plenty left. Nobody wants these." wherever the warning
  would be, and adding it never finds another one.

**Countdown timers**

- **FR-011**: While it's on, one shared countdown MUST show in two places, each under its own
  deadline line in voice:
  - beside the price on every active shirt's detail page: "This price won't last."
  - on the cart and checkout while the cart has shirts: "Your shirts are reserved for"

  It shows minutes, seconds and milliseconds (09:59.873), ticking down continuously.
- **FR-012**: The countdown runs for 10 minutes. It MUST keep its place for that shopper across pages,
  reloads and tabs, and show the right time after a tab wakes from the background.
- **FR-013**: At 00:00.000 the countdown MUST quietly start again at full length: no message, no
  "expired" state, and no effect on prices, the cart or checkout. Nothing is ever released from the
  cart.

**Fabricated social proof**

- **FR-014**: While it's on, each active, non-bland shirt's detail page MUST say:
  - how many people are looking at it right now: a believable number from 3 to 40 that drifts over
    time and is never zero
  - which fake coworker just bought it: "[Name] from [Department] just bought this pattern."

  A bland shirt's page MUST say "0 people are looking at this shirt right now," and name no buyer.
- **FR-015**: While it's on, every page MUST show fake purchases as pop-ups: "[Name] from [Department]
  just bought [shirt]," naming an active, non-bland shirt.
  - Where: in the bottom-right corner on a wider screen. On a phone (the layout with the Menu button),
    as a short, full-width banner just under the header.
  - A new one comes every 20–40 seconds, one at a time.
  - Each slides away by itself after a few seconds.
  - Each has an (x) that closes it at once. Closing one doesn't stop the next.
- **FR-016**: Every name MUST come from the store's own fake cast of coworkers (at least 8, such as Gary
  from Accounts Payable, Craig from Regional Sales, and Todd from IT). No real shopper's name, email or
  order may ever appear, and no fake activity may reveal what a real shopper bought.

**Voice**

- **FR-017**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers the stock warnings, "found another one", the deadline lines, the "looking right now"
  lines, the fake coworkers and their departments, and the purchase lines and pop-ups.

### Key Entities

- **Store Settings** (from 001–003): gains three switches: fake scarcity, countdown timers, and social
  proof.
- **Countdown** (per shopper, never shown as a date): when his current countdown ends. It's renewed
  whenever it runs out.
- **Fake Coworker** (brand copy, not data): a first name and a department, for example "Gary from
  Accounts Payable".
- **Brand Copy** gains the stock warnings (scarce, found again, and bland), "found another one", the deadline lines,
  the "looking right now" lines, the fake cast, and the purchase lines.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With scarcity on, 100% of active, non-bland shirts say "Only 1 left!" on their detail
  page, shirt cards and cart line. Once he has bought one, it says "Just kidding, we actually found
  another one! One more left!" instead.
- **SC-002**: With every tactic on, 100% of carts, totals and orders come out identical to the same
  purchases with every tactic off. 0 purchases are blocked or delayed.
- **SC-003**: The countdown never shows less than 00:00.000 or an expired state. At zero it's back to
  full length within 1 second. The deal and hold countdowns always show the same time.
- **SC-004**: Moving between pages, a countdown carries on within 2 seconds of where it was, 100% of
  the time.
- **SC-005**: 0 real shopper names, emails or orders appear in any fake activity.
- **SC-006**: Pages showing urgency never visibly jump as it appears or ticks; they stay within the
  store's performance budget (constitution VII). Nothing urgent ever covers the header or the
  bottom-left corner. Only a pop-up ever covers a price, a tier badge or Add to Cart, and only
  until it slides away or he closes it.
- **SC-007**: With a tactic's switch off, 0 of its elements appear on any page.
- **SC-008**: With social proof on, a shopper on any page sees a fake purchase pop-up within 40 seconds,
  never more than one at a time, and its (x) closes it within half a second.
- **SC-009**: When 5 people browse the store cold for two minutes, at least 4 say they felt rushed, or
  call it "way too much."

## Assumptions

- **No real inventory.** The store has never counted stock, and this feature doesn't start. Scarcity
  is copy.
- **Where the tactics show**:
  - scarcity: every shirt card (the listing, the home page, About), the detail page, and the cart
  - the countdown: the detail page, the cart, and checkout
  - social proof: lines on the detail page, and pop-ups on every page
- **The countdown** is 10 minutes and isn't owner-tunable in this feature. Milliseconds tick
  continuously, as fast as the screen redraws.
- **Pop-up timing**: each stays up about 6 seconds before sliding away. Closing one with its (x) is
  just for that pop-up. Nothing remembers it.
- **"Looking right now"** stays between 3 and 40 and changes gradually, so it doesn't jump around on
  every load.
- **The fake cast** lives in brand copy, like 003's stream presets. There are at least 8 coworkers,
  each with a department.
- **Each tactic gets its own switch.** All three are manipulation tactics (constitution IV), and
  they're on by default like the others.
- **Out of scope**:
  - real inventory, analytics, or live visitors
  - pre-checked add-ons and the roach-motel cart (005)
  - Flash Mode (006)
  - editing the copy or the fake cast in an admin screen (008)

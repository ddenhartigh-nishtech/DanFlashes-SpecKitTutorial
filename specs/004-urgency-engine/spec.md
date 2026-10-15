# Feature Specification: Urgency Engine

**Feature Branch**: `004-urgency-engine`

**Created**: 2026-10-15

**Status**: Draft (3 open questions)

**Input**: User description: "Urgency engine (ROADMAP 004). Three manipulation tactics from constitution IV, each its own named feature with its own owner on/off switch: (1) Fake scarcity: shirts show alarming stock warnings like "Only 1 left!", and there is always only 1 left; the store has no real inventory and the warning never actually stops a purchase. (2) Countdown timers that quietly reset when they hit zero: a ticking deadline that creates pressure to buy now, then silently starts over. (3) Fabricated social proof: fake activity such as "Gary from Accounts Payable just bought this pattern" and people supposedly looking at a shirt right now. All of it is played completely straight and never explains the joke. None of it may change what anything costs (prices stay server-authoritative: complexity-driven MSRP or the owner's final price), and none of it may block a purchase. Shoppers never see a shirt's complexity score."

**Builds on**:
- 001-core-storefront: the catalog, the listing and detail pages, the cart, checkout, and the store settings
- 002-brand-pages-and-shaming: the switch-per-tactic pattern and the BLAND tier
- 003-revenue-streams-per-diem: the bottom-left corner, which the per diem gauge and its GONE pops already use

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fake Scarcity (Priority: P1)

He's looking at Geo Riot. Right under the price, in letters you could read from the food court: "Only
1 left!" He'd better move. He adds it to his cart, and the cart says it too: only 1 left. He buys it.
Tomorrow he comes back, and there's still only 1 left. There is always only 1 left.

**Why this priority**: it's the cheapest tactic to build and the one he sees on every shirt. The other
two stand on their own, but this one makes the whole catalog feel like it's running out.

**Independent Test**: with the scarcity switch on, check that:
- every active, non-bland shirt says "Only 1 left!" on its detail page, its listing card, and its cart
  line
- the number never changes, whatever anyone buys
- adding several, checking out, and paying all work exactly as before
- turning the switch off removes every warning and changes nothing else

**Acceptance Scenarios**:

1. **Given** the scarcity switch is on, **When** he views an active, non-bland shirt's detail page,
   **Then** "Only 1 left!" shows beside the price and Add to Cart.
2. **Given** the listing, **When** he browses, **Then** every active, non-bland shirt's card carries the
   same warning.
3. **Given** the shirt is in his cart in any quantity, **When** he views the cart, **Then** its line still
   says "Only 1 left!", and he can still set any quantity from 1 to 99.
4. **Given** he (or anyone else) has bought the shirt, **When** he views it again, **Then** there is
   still only 1 left. It never sells out.
5. **Given** a bland shirt, **When** he views it, **Then** [NEEDS CLARIFICATION: Q3, what the
   urgency tactics do on BLAND shirts].
6. **Given** the scarcity switch is off, **When** he browses or buys, **Then** no stock warning appears
   anywhere, and everything else behaves exactly as before.

---

### User Story 2 - Countdown Timers That Reset (Priority: P2)

A clock is ticking. 09:59. 09:58. He doesn't know what happens at zero, but he knows he doesn't want to
find out. He walks to another page, and the clock keeps going right where it was. At 00:00 nothing
happens. The clock is quietly back at 10:00, as if it had always been there.

**Why this priority**: it's the second tactic named in the constitution. It needs a clock that keeps
its place as he moves around, which makes it a little more work than scarcity.

**Independent Test**: with the countdown switch on, check that:
- the countdown shows minutes and seconds and ticks down every second
- it keeps its place across pages, reloads and tabs
- at 00:00 it quietly restarts at full length, and nothing else changes
- turning the switch off removes every countdown

**Acceptance Scenarios**:

1. **Given** the countdown switch is on, **When** he views [NEEDS CLARIFICATION: Q1, what the
   countdown counts down to, and where it shows], **Then** a countdown shows the time left in minutes
   and seconds, ticking down every second, with a deadline line in voice.
2. **Given** a countdown at 07:12, **When** he goes to another page or reloads, **Then** it carries on
   from about 07:12. It doesn't start over.
3. **Given** a countdown, **When** it reaches 00:00, **Then** it quietly starts again at full length.
   There's no "expired" message, and his prices, cart and checkout are untouched.
4. **Given** the countdown switch is off, **When** he browses or buys, **Then** no countdown appears
   anywhere.

---

### User Story 3 - Fabricated Social Proof (Priority: P3)

As he browses, word comes in: "Gary from Accounts Payable just bought Fractal Fury." On Geo Riot's
page, "23 people are looking at this shirt right now." Everybody's buying. Everybody in his office is
buying. He should be buying.

**Why this priority**: the funniest of the three, but it needs a cast of fake coworkers and a sense of
activity over time, which makes it the most to build.

**Independent Test**: with the social proof switch on, check that:
- shirt pages show how many people are "looking right now"
- fake coworkers' purchases appear
- no real shopper's name or order ever shows up
- turning the switch off removes all of it

**Acceptance Scenarios**:

1. **Given** the social proof switch is on, **When** he views an active shirt's detail page, **Then** it
   says how many people are looking at it right now: a believable number that drifts over time and is
   never zero.
2. **Given** the social proof switch is on, **When** [NEEDS CLARIFICATION: Q2, how the fake purchases
   show up], **Then** a fake coworker's purchase appears: "[Name] from [Department] just bought
   [shirt]."
3. **Given** any fake activity, **When** it names a person or a purchase, **Then** the person is from
   the store's fake cast and the shirt is a real, active one. No real shopper and no real order ever
   appears.
4. **Given** the social proof switch is off, **When** he browses or buys, **Then** no fake activity
   appears anywhere.

---

### Edge Cases

- **More than one in the cart**: he has 3 of a shirt, and the line still says "Only 1 left!". The
  warning never caps the quantity, and checkout never refuses because of it.
- **Retired shirts**: an inactive shirt, seen from an old order, shows no urgency at all. It can't be
  bought anyway.
- **The countdown hits zero at checkout**: it restarts and checkout carries on as normal.
- **A sleeping tab**: when he comes back to a tab that sat in the background, the countdown shows the
  right time left (or has quietly restarted), not where it was when he left.
- **Several tabs**: every tab shows the same countdown.
- **The corner**: nothing floating may cover the bottom-left corner, where the per diem gauge and its
  GONE pops live (003), and nothing may cover a shirt's price, tier badge, or Add to Cart.
- **A 360px phone**: every urgency element fits without sideways scrolling.
- **All switches off**: the store looks and behaves exactly as it did after 003.
- **Prices**: no urgency copy ever shows a price other than the real one: no "was" price, no
  percentage off, and no complexity score.
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
- **FR-005**: The tactics MUST work the same for guests and for signed-in shoppers.
- **FR-006**: No urgency element may shift the page's layout as it appears or updates. Nothing
  floating may cover the bottom-left corner (003's gauge and pops), or a shirt's price, tier badge or
  Add to Cart. Everything MUST fit from a 360px phone up.

**Fake scarcity**

- **FR-007**: While it's on, every active, non-bland shirt MUST say "Only 1 left!" on its detail page
  (beside the price and Add to Cart), on its listing card, and on its cart line.
- **FR-008**: There MUST always be exactly 1 left. Nothing anyone buys changes it, it never says sold
  out, and it never limits the quantity (1 to 99, as before).
- **FR-009**: On a BLAND shirt: [NEEDS CLARIFICATION: Q3].

**Countdown timers**

- **FR-010**: While it's on, a countdown MUST show [NEEDS CLARIFICATION: Q1]: minutes and seconds,
  ticking down every second, under a deadline line in voice.
- **FR-011**: A countdown runs for 10 minutes. It MUST keep its place for that shopper across pages,
  reloads and tabs, and show the right time after a tab wakes from the background.
- **FR-012**: At 00:00 a countdown MUST quietly start again at full length: no message, no "expired"
  state, and no effect on prices, the cart or checkout.

**Fabricated social proof**

- **FR-013**: While it's on, each active shirt's detail page MUST say how many people are looking at it
  right now: a believable number (from 3 to 40) that drifts over time and is never zero.
- **FR-014**: While it's on, fake coworkers' purchases MUST appear [NEEDS CLARIFICATION: Q2]: "[Name]
  from [Department] just bought [shirt]," naming an active, non-bland shirt.
- **FR-015**: Every name MUST come from the store's own fake cast of coworkers (at least 8, such as Gary
  from Accounts Payable, Craig from Regional Sales, and Todd from IT). No real shopper's name, email or
  order may ever appear, and no fake activity may reveal what a real shopper bought.

**Voice**

- **FR-016**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers the stock warnings, the deadline lines, the "looking right now" lines, the fake
  coworkers and their departments, and the purchase lines.

### Key Entities

- **Store Settings** (from 001–003): gains three switches: fake scarcity, countdown timers, and social
  proof.
- **Countdown** (per shopper, never shown as a date): when his current countdown ends. It's renewed
  whenever it runs out.
- **Fake Coworker** (brand copy, not data): a first name and a department, for example "Gary from
  Accounts Payable".
- **Brand Copy** gains the stock warning, the deadline lines, the "looking right now" lines, the fake
  cast, and the purchase lines.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With scarcity on, 100% of active, non-bland shirts say "Only 1 left!" on their detail
  page, listing card and cart line, before and after any number of purchases.
- **SC-002**: With every tactic on, 100% of carts, totals and orders come out identical to the same
  purchases with every tactic off. 0 purchases are blocked or delayed.
- **SC-003**: A countdown never shows less than 00:00 or an expired state. At zero it's back to full
  length within 1 second.
- **SC-004**: Moving between pages, a countdown carries on within 2 seconds of where it was, 100% of
  the time.
- **SC-005**: 0 real shopper names, emails or orders appear in any fake activity.
- **SC-006**: Pages showing urgency never visibly jump as it appears or ticks; they stay within the
  store's performance budget (constitution VII). Nothing urgent covers a price, a tier badge, Add to
  Cart, or the bottom-left corner.
- **SC-007**: With a tactic's switch off, 0 of its elements appear on any page.
- **SC-008**: When 5 people browse the store cold for two minutes, at least 4 say they felt rushed, or
  call it "way too much."

## Assumptions

- **No real inventory.** The store has never counted stock, and this feature doesn't start. Scarcity
  is copy.
- **Where the tactics show**:
  - home page: none, except anything floating that Q2 adds
  - the listing, the detail page, the cart and checkout: as each story says
  - About, account, sign-in, sign-up and order confirmations: none, except anything floating that
    Q2 adds
- **The countdown** is 10 minutes and isn't owner-tunable in this feature.
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

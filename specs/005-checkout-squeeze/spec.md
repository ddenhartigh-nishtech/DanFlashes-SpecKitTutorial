# Feature Specification: Checkout Squeeze

**Feature Branch**: `005-checkout-squeeze`

**Created**: 2026-10-15

**Status**: Draft (Q1–Q3 resolved 2026-10-16)

**Input**: User description: "Checkout squeeze (ROADMAP 005). Two manipulation tactics from constitution IV, each its own named feature with its own owner on/off switch: (1) Pre-checked add-ons: checkout arrives with absurd extras already ticked (Pattern Protection Plan™, Complexity Insurance, and a few more in the same spirit), and he has to untick each one to avoid paying for it. Add-ons are real line items in the order total: priced in exact dollars and cents, owner-adjustable without code changes, re-resolved by the server when the order is placed (never trusted from the client), and shown on the confirmation and in his order history. They must work with every payment method, including a Flash Credit split. (2) Roach-motel cart: adding to the cart takes one click, but removing a line takes an "Are you sure?" and then an "Are you sure sure?" before it actually goes. All of it is played completely straight and never explains the joke. Add-ons change totals, so this is a money path: exact money, test-first, and /speckit-analyze is mandatory before implementation."

**Builds on**:
- 001-core-storefront: the cart, checkout, orders and their history, and the store settings
- 002-brand-pages-and-shaming: confirmshaming labels, and the switch-per-tactic pattern
- 003-revenue-streams-per-diem: the Flash Credit split, and the per diem drain
- 004-urgency-engine: the cart hold, and the cart's "found another one"

## Clarifications

### Session 2026-10-16

- Q1: How is an add-on priced? → A: **A flat amount per order**, in exact dollars and cents, for
  example Pattern Protection Plan™ at $49.99.
- Q2: Does lowering a quantity also need the two questions? → A: **Any decrease.** Removing a line, or
  lowering its quantity, asks "Are you sure?" and then "Are you sure sure?". Shirts check in, but they
  don't check out.
- Q3: Are his unticks remembered? → A: **No. Every add-on is ticked again, every time** checkout
  opens.
- Q: When he unticks an add-on, does each add-on have its own decline line, or does every untick show
  the same one? → A: **Each add-on has its own decline line**, kept with the add-on and edited
  alongside its pitch. With confirmshaming off, no decline line shows at all.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-checked Add-ons (Priority: P1)

He gets to checkout and the store has already thought of everything. Pattern Protection Plan™: ticked.
Complexity Insurance: ticked. Extended Vibrancy Warranty: ticked. The total already includes them. To
not pay for them, he has to find each box and untick it, and Dan has something to say about every one
he unticks. Most guys don't bother. Their patterns are protected.

**Why this priority**: add-ons put real money on the order, so they're the money path of this
feature and the bigger laugh at checkout. The roach-motel cart works without them.

**Independent Test**: with the add-ons switch on, open checkout and check that:
- every add-on the owner offers is ticked, with its price
- the total includes them, to the cent
- unticking one takes it out of the total, and re-ticking puts it back
- the order he places charges exactly the shirts plus the ticked add-ons, by card, by Flash Credit,
  or split
- the confirmation and his order history list each add-on with its price
- with the switch off, checkout has no add-ons and totals as before

**Acceptance Scenarios**:

1. **Given** the add-ons switch is on, **When** he opens checkout, **Then** every add-on the owner offers
   is listed with its name, its pitch and its price, already ticked, and the total includes all of them.
2. **Given** a ticked add-on, **When** he unticks it, **Then** the total drops by exactly its price.
   **When** he ticks it again, **Then** the total goes back up.
3. **Given** confirmshaming is on, **When** he unticks an add-on, **Then** that add-on's own decline line
   appears under it, in voice (Pattern Protection Plan™: "No thanks, I'd rather my patterns go
   unprotected."). With confirmshaming off, no decline line appears. The total behaves the same
   either way.
4. **Given** some add-ons ticked, **When** he places the order by any payment method (card, Flash
   Credit, or a split), **Then** he's charged exactly the shirts plus the ticked add-ons. The
   confirmation and his order history list each add-on he bought, with the price he paid.
5. **Given** checkout showed him an add-on's price, **When** the owner changes that price or stops
   offering it before he places the order, **Then** nothing is charged, and he's shown the new total
   to place again.
6. **Given** he unticked some add-ons, **When** he reloads checkout or comes back to it, **Then** every
   offered add-on is ticked again. Nothing remembers what he unticked.
7. **Given** the add-ons switch is off, **When** he checks out, **Then** no add-ons are offered, and the
   order is the shirts alone, exactly as before.

---

### User Story 2 - Roach-Motel Cart (Priority: P2)

Adding a shirt takes one click, the way it should. Taking one out is another story. He hits Remove.
"Are you sure?" He is. "Are you sure sure?" He hesitates. If he really means it, the shirt finally
goes. If he blinks, it stays right where it was. Trying to go from 3 down to 2 gets the same two
questions.

**Why this priority**: it's the second tactic named for this feature. It's simpler than add-ons and
touches no money, but it makes the cart a place shirts check into and don't check out of.

**Independent Test**: with the roach-motel switch on, check that:
- Remove asks "Are you sure?" and then "Are you sure sure?", and lowering a quantity asks the same
- only the second yes removes the line, or lowers the quantity
- backing out at either step leaves the cart exactly as it was
- adding still takes one click
- with the switch off, Remove removes at once

**Acceptance Scenarios**:

1. **Given** the roach-motel switch is on, **When** he presses Remove on a cart line, **Then** the store
   asks "Are you sure?". Nothing is removed yet.
2. **Given** "Are you sure?", **When** he says yes, **Then** the store asks "Are you sure sure?". Still
   nothing is removed.
3. **Given** "Are you sure sure?", **When** he says yes again, **Then** the line is removed.
4. **Given** either question, **When** he backs out (the keep button, Escape, or closing it), **Then** the
   line stays exactly as it was.
5. **Given** confirmshaming is on, **When** the questions show, **Then** the yes buttons are shamed
   ("Yes, remove it (and lose your edge)") and the keep button is the easy choice. With confirmshaming
   off they're neutral. The two steps happen either way.
6. **Given** the roach-motel switch is on, **When** he adds a shirt, **Then** it takes one click, with no
   question.
7. **Given** he lowers a line's quantity (say, from 3 to 2), **When** he updates it, **Then** the same
   two questions come first. Only the second yes lowers it. Backing out leaves the quantity as it
   was. Raising a quantity asks nothing (and finds another one, per 004).
8. **Given** the roach-motel switch is off, **When** he presses Remove, **Then** the line is removed at
   once, as before.

---

### Edge Cases

- **The store removes a line itself**: a retired shirt, or a bland one while shaming is on (001, 002).
  No questions are asked. That's Dan's doing, not his.
- **Everything unticked**: the order is the shirts alone.
- **No add-ons on offer** (the owner has retired them all): checkout shows none, and nothing changes.
- **An add-on retired or repriced mid-checkout**: the order is refused, nothing is charged, and he sees
  the new total (US1 AC5).
- **A Flash Credit split**: the split covers the whole total, add-ons included, and the same
  confirmation rules apply (003).
- **The per diem drain**: an order counts against his streams by its whole total, add-ons included
  (003).
- **A double submit**: it returns the same order, charged once, add-ons included.
- **A tampered form that names an add-on twice**: it's charged once.
- **Exact money**: an order's total always equals its shirts plus its add-ons, to the cent.
- **Prices shown to him**: add-on prices are real and re-checked when he places the order. They never
  show a complexity score.
- **The roach-motel questions on a phone**: they fit at 360px, and the keep button is always reachable.
- **Lowering in steps**: each decrease asks both questions again, even right after the last one.
- **Lowering to zero**: there's no zero in the quantity box (1 to 99, as before). Taking a line out is
  Remove, with the same two questions.
- **Two tabs**: removing in one tab (after both questions) and then pressing Remove in the other finds
  the line already gone, which is harmless.
- **All switches off**: checkout and the cart behave exactly as they did after 004.

## Requirements *(mandatory)*

### Functional Requirements

**Both tactics**

- **FR-001**: Pre-checked add-ons and the roach-motel cart MUST each be their own owner on/off
  setting, on by default (constitution IV).
- **FR-002**: Turning a tactic off MUST remove every trace of it, and change nothing else.

**Pre-checked add-ons**

- **FR-003**: The add-ons MUST be owner-managed store data, editable without code changes. Each has a
  name, a one-line pitch in voice, a decline line in voice, a flat price per order in exact dollars
  and cents (greater than $0.00), whether it's offered, and its place in the list. The store starts with at least four, including
  Pattern Protection Plan™ and Complexity Insurance.
- **FR-004**: While it's on, checkout MUST list every offered add-on with its name, pitch and price,
  already ticked, and the total MUST include every ticked add-on. Every time checkout opens, every
  offered add-on starts ticked again. Nothing remembers what he unticked.
- **FR-005**: Unticking an add-on MUST take exactly its price out of the total, and re-ticking puts it
  back. While 002's confirmshaming switch is on, an unticked add-on shows its own decline line. While
  it's off, no decline line shows.
- **FR-006**: When the order is placed, the store MUST work out each ticked add-on's price again from
  its own data, never from the browser. If an add-on he ticked is no longer offered, or its price or
  the total differs from what he saw, nothing is charged and he's shown the new total.
- **FR-007**: An order MUST record each add-on he bought, with its name and the price he paid at that
  moment, as its own line. The order's total MUST equal its shirts plus its add-ons, to the cent. The
  confirmation and his order history MUST show the add-on lines.
- **FR-008**: Add-ons MUST work with every payment method: card, Flash Credit covering the whole
  total, and a Flash Credit split (the split covers the whole total, add-ons included).

**Roach-motel cart**

- **FR-009**: While it's on, any decrease MUST take two confirmations, "Are you sure?" and then "Are
  you sure sure?", before it happens. That means removing a cart line, or lowering its quantity.
  Backing out at either step MUST leave the cart unchanged.
- **FR-010**: The confirmation buttons MUST follow 002's confirmshaming switch: shamed labels while it's
  on, neutral ones while it's off, and the same two steps either way.
- **FR-011**: Adding to the cart, and raising a quantity, MUST stay one click, with no question.
- **FR-012**: Removals the store makes itself (retired shirts, bland lines while shaming is on) MUST
  NOT ask anything.

**Voice**

- **FR-013**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers the starting add-ons' names, pitches and decline lines, and both questions with
  their buttons.

### Key Entities

- **Add-on** (owner data): a name, a pitch, a decline line, a flat price per order, whether it's
  offered, and its position.
- **Order Add-on**: one add-on bought on an order, with its name and the price paid, kept as it was even
  if the owner changes the add-on later.
- **Order** (from 001): its total now covers its shirts plus its add-ons.
- **Store Settings** (from 001–004): gains two switches, pre-checked add-ons and the roach-motel cart.
- **Brand Copy** gains the two questions with their buttons. The add-ons' names, pitches and decline
  lines are owner data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of orders, the total equals the shirts plus the ticked add-ons, to the cent, and
  the recorded add-on lines add up exactly.
- **SC-002**: 0 orders charge an add-on he unticked, or charge one at a price he wasn't shown.
- **SC-003**: With the add-ons switch on, 100% of checkouts open with every offered add-on ticked.
- **SC-004**: With the roach-motel switch on, removing a line or lowering a quantity takes exactly two
  yeses after the press, and backing out at any step leaves the cart identical. With it off, neither
  asks.
- **SC-005**: Adding a shirt, or raising a quantity, never asks a question.
- **SC-006**: With a tactic's switch off, 0 of its elements appear anywhere, and totals match 004's.
- **SC-007**: When 5 people check out cold, at least 4 pay for at least one add-on they didn't mean to,
  or call it "way too much."

## Assumptions

- **Every add-on starts ticked.** That's the tactic. With the switch off, add-ons aren't offered at
  all, so the store doesn't keep an opt-in shelf of extras.
- **Starting add-ons** (owner-editable, flat per order): Pattern Protection Plan™, Complexity
  Insurance, Extended Vibrancy Warranty, and Priority Compliments Package. The owner can add, reprice, reorder or retire
  them in Studio until the Admin Console (008).
- **Add-ons are bought per order**, alongside the shirts. They aren't shirts: they don't show in the
  cart, on shirt pages, or in the shirt count.
- **Shipping and tax stay $0.00.**
- **The two questions are dialogs on the cart page**, one after the other. The keep button is the
  default and is focused first.
- **Out of scope**: refunds, cancelling add-ons after an order, real insurance, editing add-ons in an
  admin screen (008), and the nosy sign-up (009).

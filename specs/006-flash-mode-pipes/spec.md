# Feature Specification: Flash Mode & Pipes Background

**Feature Branch**: `006-flash-mode-pipes`

**Created**: 2026-10-16

**Status**: Draft (3 open questions)

**Input**: User description: "Flash Mode & Pipes Background (ROADMAP 006). Two visual-assault features from constitution V, each its own named feature with its own owner on/off switch, on by default: (1) Flash Mode: the strobe/flash mode constitution V requires. It sits behind a shopper toggle that starts off, and the button that turns it on must be the most exciting button on the site. While it's on, the site strobes and flashes, but the price, the tier badge and Add to Cart stay readable (constitution V, "the sale still closes"). (2) Pipes Background: an animated Windows "3D Pipes" screensaver as the page background in place of the plain field, with pipes growing, turning at elbow joints and filling the screen, then starting over. Both work from a 360px phone up, never cover or block the header, prices, the cart, checkout, the per diem corner or the pop-ups, and must not break the Lighthouse budgets (constitution VII). Played completely straight, never explaining the joke. No money paths change."

**Builds on**:
- 001-core-storefront: every page, the header, the store settings
- 002-brand-pages-and-shaming: the switch-per-tactic pattern, the header nav, the dialogs
- 003-revenue-streams-per-diem: the per diem corner (bottom-left)
- 004-urgency-engine: the purchase pop-ups (bottom-right, or under the header on phones) and the
  countdowns
- 005-checkout-squeeze: the roach-motel dialogs

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flash Mode (Priority: P1)

Up in the header, next to the cart, there's a button that won't sit still. It cycles through every
color the store owns and it's louder than Add to Cart, which is saying something. It says FLASH MODE.
He presses it. The store strobes. Everything that can flash, flashes. The price doesn't: Geo Riot is
still $344.61, clear as day, and Add to Cart is right where he left it. He presses the button again,
and the store calms down, relatively speaking.

**Why this priority**: constitution V requires it ("the site MUST offer a strobe/flash mode"), and the
brand is literally called Dan _Flashes_. It's the only constitution MUST that's still unbuilt.

**Independent Test**: with the Flash Mode switch on, check that:
- every page has the button in the header, at every screen size, and Flash Mode starts off
- the button is the loudest control on the site
- pressing it starts the strobe, and pressing it again stops it
- nothing ever flashes more than 3 times a second
- the price, the tier badge and Add to Cart never flash and stay readable
- with the switch off, there's no button and nothing flashes

**Acceptance Scenarios**:

1. **Given** the Flash Mode switch is on, **When** he opens any page for the first time, **Then** the
   Flash Mode button is in the header without opening a menu, and Flash Mode is off: nothing strobes.
2. **Given** any page, **When** he looks at the controls, **Then** the Flash Mode button is the most
   exciting one: it's the only control that animates on its own, cycling through at least three of the
   store's colors, even while Flash Mode is off.
3. **Given** Flash Mode is off, **When** he presses the button, **Then** Flash Mode is on: [what
   flashes, per FR-009]. The button shows that it's on. **When** he presses it again, **Then** it's
   off, and the page looks exactly as it did before.
4. **Given** Flash Mode is on, **When** he views a shirt's page, the listing, the cart or checkout,
   **Then** every price, every tier badge and Add to Cart stay steady and readable. They never flash or
   change color, and nothing covers them.
5. **Given** Flash Mode is on, **When** anything flashes, **Then** it flashes no more than 3 times in
   any second.
6. **Given** Flash Mode is on, **When** he moves to another page or comes back later, **Then** [it
   stays on or not, per FR-012].
7. **Given** the Flash Mode switch is off, **When** he browses, **Then** there's no Flash Mode button
   and nothing strobes. Everything else is exactly as before.

---

### User Story 2 - Pipes Background (Priority: P2)

The plain field behind the store is gone. In its place: pipes. An ultraviolet pipe grows in from
nowhere, runs straight, hits a joint, turns, and keeps going. A hot-pink one starts somewhere else. A
cyan one. They fill the screen, a few at a time, until there's no room left. Then the screen clears
and they start over. He's checking out, and the pipes keep growing behind his order summary. His
order summary doesn't care.

**Why this priority**: it's the second visual-assault feature on the roadmap, and it turns every page
into patterns on top of patterns (constitution V). Flash Mode stands without it.

**Independent Test**: with the Pipes switch on, check that:
- pipes grow behind every page, in place of the plain field
- they run straight, turn only at right-angle joints, and start over once the screen is full
- every piece of text and every control sits above them and stays readable and clickable
- the store still meets its page-speed budgets
- with the switch off, the plain field is back

**Acceptance Scenarios**:

1. **Given** the Pipes switch is on, **When** any page opens, **Then** the background is pipes, in
   place of the plain field. [When they start, per FR-013.]
2. **Given** the pipes are growing, **When** he watches, **Then** each pipe runs in straight lines,
   turns only at right angles with a joint at every turn, and several pipes in the store's colors grow
   at once.
3. **Given** the screen has filled up, **When** the next pipe has nowhere to go, **Then** the
   background clears and the pipes start over. The page itself doesn't move or jump.
4. **Given** the pipes are growing, **When** he scrolls, **Then** they stay put behind the page, and
   the content scrolls over them.
5. **Given** the pipes are growing, **When** he reads, taps or types anywhere (the header, a shirt card,
   the cart, checkout, the per diem corner, a pop-up, a dialog), **Then** everything works exactly as it
   does on the plain field. No pipe is ever on top of anything, and no text sits directly on a pipe.
6. **Given** a 360px phone, **When** a page opens, **Then** the pipes fill the phone's screen, still read
   as pipes, and there's no sideways scroll. **When** he rotates the phone or resizes the window,
   **Then** they start over for the new size.
7. **Given** the pipes are growing, **When** he switches to another tab and back, **Then** they paused
   while he was away and carry on where they left off.
8. **Given** the Pipes switch is off, **When** he browses, **Then** the plain field is back, and
   everything else is exactly as before.

---

### Edge Cases

- **Both at once**: Flash Mode strobes over the pipes, and the pipes keep growing. The readability and
  3-flashes-a-second rules still hold.
- **Text on the field**: headings and lines that sit straight on the plain field today (page titles,
  for example) get a solid backing of their own, so no pipe ever runs directly behind letters.
- **Dialogs** (the bland-shirt loop, the roach motel): they open above the pipes and the strobe. Their
  text and buttons never flash.
- **The per diem corner, the pop-ups, the countdowns**: they stay above the pipes, and they don't
  flash.
- **The Flash Mode button on a phone**: it fits in the header beside the Menu button and the cart at
  360px, without pushing anything off the screen.
- **A slow phone**: the pipes slow down rather than make the page stutter. Scrolling and tapping come
  first.
- **The error pages** (404, 500, 418): they get the pipes and the button too. They're pages.
- **Printing a page**: no pipes, and no strobe.
- **All switches off**: the store looks and behaves exactly as it did after 005.

## Requirements *(mandatory)*

### Functional Requirements

**Both features**

- **FR-001**: Flash Mode and the Pipes Background MUST each be their own owner on/off setting, on by
  default.
- **FR-002**: Turning one off MUST remove every trace of it, and change nothing else.
- **FR-003**: Neither MUST ever cover or block anything: the header, any text, any price, any tier
  badge, Add to Cart, the cart, checkout, the per diem corner, the pop-ups, or a dialog. Everything
  stays readable and clickable exactly as before.
- **FR-004**: Neither changes a price, a total, the cart, or an order.
- **FR-005**: Both MUST work on every page, from a 360px phone up to a desktop, with no sideways
  scroll.

**Flash Mode**

- **FR-006**: While its switch is on, every page MUST show the Flash Mode button in the header, at
  every screen size, without opening a menu.
- **FR-007**: The button MUST be the most exciting button on the site: the only control that animates
  on its own, cycling through at least three of the store's colors, whether Flash Mode is on or off.
- **FR-008**: Flash Mode MUST start off. Pressing the button turns it on, and pressing it again turns
  it off. The button shows which it is.
- **FR-009**: While Flash Mode is on, the store MUST strobe: [NEEDS CLARIFICATION: what flashes? Only
  the background field, or everything that isn't a price, a tier badge or Add to Cart (backgrounds,
  borders, headings, shirt cards)?]
- **FR-010**: Nothing MUST ever flash more than 3 times in any one second.
- **FR-011**: While Flash Mode is on, every price, every tier badge and Add to Cart MUST stay readable.
  They never flash or change color, and they keep a steady, solid backing (constitution V, "the sale
  still closes").
- **FR-012**: Flash Mode is his choice, kept in his own browser: [NEEDS CLARIFICATION: once he turns it
  on, does it stay on across pages and later visits, only for this visit, or only for the page he's
  on?]

**Pipes Background**

- **FR-013**: While its switch is on, the background of every page MUST be the pipes, in place of the
  plain field. [NEEDS CLARIFICATION: do the pipes grow from the moment a page opens, or only after he's
  been idle for a while, like a real screensaver?]
- **FR-014**: Pipes MUST grow in straight runs and turn only at right angles, with a joint at every
  turn. Several grow at once, in the store's colors. When the screen is full, it MUST clear and start
  over.
- **FR-015**: The pipes MUST stay in place as he scrolls. Resizing the window or rotating the phone
  starts them over for the new size.
- **FR-016**: Every piece of text and every control MUST sit on a solid backing, so no pipe ever runs
  directly behind letters.
- **FR-017**: The pipes MUST pause while the page can't be seen (another tab, a minimized window), and
  carry on when he's back.
- **FR-018**: The store MUST still meet its page-speed budgets with the pipes growing (constitution
  VII). Scrolling and tapping come before the pipes: on a slow device the pipes slow down, the page
  doesn't.

**Voice**

- **FR-019**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers the Flash Mode button and its on and off states.

### Key Entities

- **Store Settings** (from 001–005): gains two switches, Flash Mode and the Pipes Background.
- **His Flash Mode choice**: on or off, kept in his own browser. It's never sent to the store or saved
  to his account.
- **Brand Copy** gains the Flash Mode button's labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the Flash Mode switch on, 100% of pages show the button in the header without
  scrolling or opening a menu, from 360px up.
- **SC-002**: 0 elements ever flash more than 3 times in any one second.
- **SC-003**: With Flash Mode on, 100% of prices, tier badges and Add to Cart buttons keep the same
  colors and contrast they have with it off.
- **SC-004**: With the pipes growing, every page still meets the budgets: the main content shows
  within 2.5 seconds on a mid-range phone, and the layout shifts no more than 0.1.
- **SC-005**: With both features on, 100% of the existing journeys (browse, zoom, add to cart, the
  cart, checkout by every payment method, the account) complete exactly as before.
- **SC-006**: With a feature's switch off, 0 of its elements appear anywhere.
- **SC-007**: When 5 people use the site cold, at least 4 press the Flash Mode button within their
  first minute without being told to.

## Assumptions

- **The button lives in the header**, next to the cart. The header is on every page, and the bottom
  corners already belong to the per diem corner and the pop-ups.
- **Colors**: both features use the store's own palette (hot pink, electric cyan, highlighter,
  ultraviolet, acid, safety orange).
- **The pipes' look**: shaded tubes with a highlight, so they read as "3D", with a ball at every joint,
  as in the original. Now and then, a joint is a teapot, also as in the original.
- **Owner switches only for the pipes.** There's no shopper toggle for the background; the owner turns
  it off in Studio until the Admin Console (008).
- **No special handling for reduced-motion settings.** Flash Mode is opt-in, and the owner can turn
  either feature off (owner: it's a demo site). The 3-flashes-a-second limit holds regardless.
- **No sound.**
- **Out of scope**: the Pattern Generator (007), editing the switches in an admin screen (008), and the
  nosy sign-up (009).

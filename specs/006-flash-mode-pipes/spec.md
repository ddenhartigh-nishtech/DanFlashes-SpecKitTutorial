# Feature Specification: Flash Mode & Pipes Background

**Feature Branch**: `006-flash-mode-pipes`

**Created**: 2026-10-16

**Status**: Draft (Q1–Q3 resolved, clarified, and analysis remediation applied 2026-10-16)

**Input**: User description: "Flash Mode & Pipes Background (ROADMAP 006). Two visual-assault features from constitution V, each its own named feature with its own owner on/off switch, on by default: (1) Flash Mode: the strobe/flash mode constitution V requires. It sits behind a shopper toggle that starts off, and the button that turns it on must be the most exciting button on the site. While it's on, the site strobes and flashes, but the price, the tier badge and Add to Cart stay readable (constitution V, "the sale still closes"). (2) Pipes Background: an animated Windows "3D Pipes" screensaver as the page background in place of the plain field, with pipes growing, turning at elbow joints and filling the screen, then starting over. Both work from a 360px phone up, never cover or block the header, prices, the cart, checkout, the per diem corner or the pop-ups, and must not break the Lighthouse budgets (constitution VII). Played completely straight, never explaining the joke. No money paths change."

**Builds on**:
- 001-core-storefront: every page, the header, the store settings
- 002-brand-pages-and-shaming: the switch-per-tactic pattern, the header nav, the dialogs
- 003-revenue-streams-per-diem: the per diem corner (bottom-left)
- 004-urgency-engine: the purchase pop-ups (bottom-right, or under the header on phones) and the
  countdowns
- 005-checkout-squeeze: the roach-motel dialogs

## Clarifications

### Session 2026-10-16

- Q1: What flashes? → A: **Everything except the sale.** Backgrounds, borders, headings and shirt
  cards all cycle through the store's colors. Prices, tier badges and Add to Cart never flash.
- Q2: How long does Flash Mode stay on? → A: **Until he turns it off** (revised by the owner during
  clarify; it was "for the visit").
  - It isn't per tab: his browser remembers it in every tab and on later visits.
  - It's his browser's choice, not his account's: different browsers don't sync (owner, after
    analysis; this replaces the account sync he first asked for).
- Q3: When do the pipes start? → A: **With the toggle** (revised by the owner during clarify; it was
  "always"). The pipes are tied to the same shopper toggle as the strobe.
- Q: When Flash Mode is on and the pipes are running, should the pipes join the strobe? → A: **No.**
  - The pipes keep their **traditional screensaver colors** and only fill the background. They never
    strobe.
  - One shopper toggle, branded **"Extreme Awesomeness"** on the site, turns on the strobe and the
    pipes together. "Flash Mode" stays the feature's name in the constitution and the specs.
- Owner, on the toggle:
  - It's off until he first turns it on. That's how this spec reads the constitution's "it starts
    off".
  - Pressing the button applies the styling immediately, with no page load (after analysis).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extreme Awesomeness: Flash Mode (Priority: P1)

Up in the header, next to the cart, there's a button that won't sit still. It cycles through every
color the store owns and it's louder than Add to Cart, which is saying something. It says EXTREME
AWESOMENESS. He presses it. The store strobes. Everything that can flash, flashes. The price doesn't:
Geo Riot is still $344.61, clear as day, and Add to Cart is right where he left it. He comes back
tomorrow, and it's still on. He presses the button again, and the store calms
down, relatively speaking.

**Why this priority**: constitution V requires it ("the site MUST offer a strobe/flash mode"), and the
brand is literally called Dan _Flashes_. It's the only constitution MUST that's still unbuilt. The
toggle it brings also turns on the pipes (US2).

**Independent Test**: with the Flash Mode switch on, check that:
- every page has the Extreme Awesomeness button in the header, at every screen size, and it starts
  off
- the button is the loudest control on the site
- pressing it starts the strobe, and pressing it again stops it
- it stays on across pages, tabs, reloads and later visits in the same browser
- nothing ever flashes more than 3 times a second
- the price, the tier badge and Add to Cart never flash and stay readable
- with both switches off, there's no button and nothing flashes

**Acceptance Scenarios**:

1. **Given** the Flash Mode switch is on, **When** he opens any page for the first time, **Then** the
   Extreme Awesomeness button is in the header without opening a menu, and it's off: nothing strobes.
2. **Given** any page, **When** he looks at the controls, **Then** the Extreme Awesomeness button is
   the most exciting one. It's the only control that animates on its own, cycling through at least
   three of the store's colors, even while it's off.
3. **Given** it's off, **When** he presses the button, **Then** it's on at once, with no page load:
   - backgrounds, borders, headings and shirt cards all cycle through the store's colors
   - the pipes start growing (US2)
   - the button shows that it's on

   **When** he presses it again, **Then** it's off, and the page looks exactly as it did before.
4. **Given** it's on, **When** he views a shirt's page, the listing, the cart or checkout, **Then**
   every price, every tier badge and Add to Cart stay steady and readable. They never flash or change
   color, and nothing covers them.
5. **Given** it's on, **When** anything flashes, **Then** it flashes no more than 3 times in any second.
6. **Given** he turned it on, **When** he moves to another page, opens another tab, reloads, signs in
   or out, or comes back days later in the same browser, **Then** it's still on, until he turns it
   off. His other open tabs follow along. Another browser has its own choice.
7. **Given** the Flash Mode switch is off, **When** he presses Extreme Awesomeness (still there for
   the pipes), **Then** nothing strobes. **Given** both switches are off, **Then** there's no button
   at all. Everything else is exactly as before.

---

### User Story 2 - Pipes Background (Priority: P2)

He turns on Extreme Awesomeness, and the plain field behind the store is gone. In its place: pipes,
straight out of a 1990s office computer. A red pipe grows in from nowhere, runs straight, hits a
ball joint, turns, and keeps going. A green one starts somewhere else. A blue one. They fill the
screen, a few at a time, until there's no room left. Then the screen clears and they start over.
He's checking out, and the pipes keep growing behind his order summary. His order summary doesn't
care.

**Why this priority**: it's the second visual-assault feature on the roadmap, and it turns every page
into patterns on top of patterns (constitution V). It rides on US1's toggle. Flash Mode stands
without it.

**Independent Test**: with the Pipes switch on and Extreme Awesomeness on, check that:
- pipes grow behind every page, in place of the plain field, in the classic screensaver colors
- they run straight, turn only at right-angle joints, and start over once the screen is full
- they never strobe
- every piece of text and every control sits above them and stays readable and clickable
- the store still meets its page-speed budgets
- with Extreme Awesomeness off, or the switch off, the plain field is back

**Acceptance Scenarios**:

1. **Given** the Pipes switch is on and Extreme Awesomeness is on, **When** any page opens, **Then**
   the background is pipes, in place of the plain field, and they start growing right away. **Given**
   Extreme Awesomeness is off, **Then** it's the plain field.
2. **Given** the pipes are growing, **When** he watches, **Then**:
   - each pipe runs in straight lines and turns only at right angles, with a joint at every turn
   - several pipes grow at once, in the classic screensaver colors
   - the colors never change with the strobe
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
8. **Given** the Pipes switch is off, **When** he browses with Extreme Awesomeness on, **Then** the
   plain field is back, the strobe still works, and everything else is exactly as before.

---

### Edge Cases

- **Both switches on**: Extreme Awesomeness turns on both. The strobe hits everything except the sale
  and the pipes. The pipes keep growing in their classic colors. The readability and
  3-flashes-a-second rules still hold.
- **One switch off**: the button turns on whichever feature is still on. With both off, there's no
  button.
- **Text on the field**: headings and lines that sit straight on the plain field today (page titles,
  for example) get a solid backing of their own, so no pipe ever runs directly behind letters.
- **Dialogs** (the bland-shirt loop, the roach motel): they open above the pipes and the strobe. Their
  text and buttons never flash.
- **The per diem corner, the pop-ups, the countdowns**: they stay above the pipes, and they don't
  flash.
- **The button on a phone**: it fits in the header beside the Menu button and the cart at 360px,
  without pushing anything off the screen. "Extreme Awesomeness" may shorten or stack to fit, but it
  stays the loudest thing up there.
- **Signing in or out**: changes nothing. The choice belongs to the browser, so two people on one
  browser share it.
- **Another browser**: it has its own choice, and nothing syncs between browsers.
- **A switch the owner just turned off**: for the moment before a page finishes arriving, a shopper
  with it on can still see that feature. Then it's gone.
- **The first paint**: a page he opens with it on arrives already on. There's no flash of the plain
  store first, and no layout jump.
- **A slow phone**: the pipes slow down rather than make the page stutter. Scrolling and tapping come
  first.
- **The error pages** (404 and 500): they get the button, the strobe and the pipes too. They're pages.
  The 418 teapot page and the last-resort crash screen stand alone, with no header, so they stay as
  they are.
- **Printing a page**: no pipes, and no strobe.
- **All switches off**: the store looks and behaves exactly as it did after 005.

## Requirements *(mandatory)*

### Functional Requirements

**Both features**

- **FR-001**: Flash Mode and the Pipes Background MUST each be their own owner on/off setting, on by
  default.
- **FR-002**: Turning a setting off MUST remove every trace of its feature, and change nothing else.
  With both off, the Extreme Awesomeness button is gone too.
- **FR-003**: Neither feature MUST ever cover or block anything: the header, any text, any price, any
  tier badge, Add to Cart, the cart, checkout, the per diem corner, the pop-ups, or a dialog.
  Everything stays readable and clickable exactly as before.
- **FR-004**: Neither changes a price, a total, the cart, or an order.
- **FR-005**: Both MUST work on every page, from a 360px phone up to a desktop, with no sideways
  scroll.

**The Extreme Awesomeness toggle**

- **FR-006**: While either setting is on, every page MUST show the Extreme Awesomeness button in the
  header, at every screen size, without opening a menu.
- **FR-007**: The button MUST be the most exciting button on the site: the only control that animates
  on its own (apart from the strobe itself), cycling through at least three of the store's colors,
  whether it's on or off.
- **FR-008**: It MUST be off until he first turns it on. Pressing the button turns it on at once, with
  no page load, and pressing it again turns it off the same way. The button shows which it is. Turning it on starts every feature the owner
  has on: the strobe, the pipes, or both.
- **FR-009**: His choice MUST be remembered by his browser until he changes it. It isn't per tab or
  per visit.
  - **Every tab and later visit**: his browser remembers it. His other open tabs follow along when
    he presses the button.
  - **His browser's alone**: it's never sent to the store or saved to his account. Signing in or out
    doesn't change it, and other browsers don't sync.
  - **A page opened with it on** MUST arrive already on, with no flash of the plain store first.

**Flash Mode (the strobe)**

- **FR-010**: While Extreme Awesomeness is on and the Flash Mode setting is on, the store MUST strobe:
  - backgrounds, borders, headings and shirt cards all cycle through the store's colors
  - everything strobes except the prices, the tier badges and Add to Cart (FR-012), and the pipes
    (FR-014)
  - text that changes color stays readable against its own backing at every step
- **FR-011**: Nothing MUST ever flash more than 3 times in any one second.
- **FR-012**: While it's on, every price, every tier badge and Add to Cart MUST stay readable. They
  never flash or change color, and they keep a steady, solid backing (constitution V, "the sale still
  closes").

**Pipes Background**

- **FR-013**: While Extreme Awesomeness is on and the Pipes setting is on, the background of every page
  MUST be the pipes, in place of the plain field. They MUST start growing the moment a page opens.
  With Extreme Awesomeness off, the background is the plain field.
- **FR-014**: Pipes MUST grow in straight runs and turn only at right angles, with a joint at every
  turn.
  - Several grow at once, in the traditional screensaver colors.
  - They never strobe or change color with Flash Mode.
  - When the screen is full, it MUST clear and start over.
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
  joke. On the site, the toggle is "Extreme Awesomeness", with its on and off states. The word
  "strobe" never appears to shoppers.

### Key Entities

- **Store Settings** (from 001–005): gains two switches, Flash Mode and the Pipes Background.
- **His browser's choice**: Extreme Awesomeness on or off, off by default, remembered by his browser.
  It's never sent to the store or saved to his account.
- **Brand Copy** gains the Extreme Awesomeness button's labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: While either switch is on, 100% of pages show the Extreme Awesomeness button in the
  header without scrolling or opening a menu, from 360px up.
- **SC-002**: 0 elements ever flash more than 3 times in any one second.
- **SC-003**: With it on, 100% of prices, tier badges and Add to Cart buttons keep the same colors and
  contrast they have with it off.
- **SC-004**: With the pipes growing, every page still meets the budgets: the main content shows
  within 2.5 seconds on a mid-range phone, and the layout shifts no more than 0.1.
- **SC-005**: With everything on, 100% of the existing journeys complete exactly as before:
  - browse, zoom and add to cart
  - the cart
  - checkout, by every payment method
  - the account
- **SC-006**: With a feature's switch off, 0 of its elements appear anywhere.
- **SC-007**: His choice survives 100% of reloads, new tabs, sign-ins, sign-outs and later visits in
  the same browser.
- **SC-008**: When 5 people use the site cold, at least 4 press Extreme Awesomeness within their
  first minute without being told to.

## Assumptions

- **The button lives in the header**, next to the cart. The header is on every page, and the bottom
  corners already belong to the per diem corner and the pop-ups.
- **Colors**:
  - The button and the strobe use the store's own palette (hot pink, electric cyan, highlighter,
    ultraviolet, acid, safety orange).
  - The pipes use the classic screensaver's colors: red, green, blue, yellow, cyan, magenta and
    white.
- **The pipes' look**: shaded tubes with a highlight, so they read as "3D", with a ball at every
  joint, as in the original.
  - They grow on a black field, the original screensaver's backdrop, in place of the plain paper
    field.
  - Now and then, a joint is a teapot, also as in the original.
- **One shopper toggle.** The pipes have no toggle of their own, and the owner turns each feature off
  in Studio until the Admin Console (008).
- **"It starts off"** (constitution V) means off for anyone who hasn't turned it on. Once he does,
  it stays on for him until he turns it off (owner, clarify).
- **No special handling for reduced-motion settings.** Extreme Awesomeness is opt-in, and the owner
  can turn either feature off (owner: it's a demo site). The 3-flashes-a-second limit holds
  regardless.
- **No sound.**
- **Out of scope**: the Pattern Generator (007), editing the switches in an admin screen (008), and the
  nosy sign-up (009).

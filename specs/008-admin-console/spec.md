# Feature Specification: Admin Console

**Feature Branch**: `008-admin-console`

**Created**: 2026-10-16

**Status**: Draft (Q1–Q3 resolved 2026-10-16)

**Input**: User description: "Admin Console (ROADMAP 008). Non-technical owner pages that replace Drizzle Studio as the owner's tool: shirts (create, edit, see each one's complexity score, tier, MSRP and final price, deactivate and reactivate, never delete), media uploads (high-resolution, zoomable shirt imagery with alt text, attached to shirts), complexity tiers (names, taglines, score bands, badge colors; the lowest is BLAND), add-ons (005), every store setting and tactic switch from 001–009 (including the MSRP tuning parameters and Flash Credit presets), customers, and orders. Plus a pricing-vs-complexity analysis that spots shirts priced against the complexity order. Only the store owner can open the console or make a change, and every change is checked by the store when it's made, not just hidden. Changes take effect immediately. The constitution's rules hold: shoppers never see complexity scores, shirts are deactivated rather than deleted and stay viewable from order history, bland shirts are priced below a real shirt's starting price, the MSRP algorithm stays one deterministic exponential function whose tuning is owner-adjustable, money is exact. Every page works from a 360px phone up. Card details never show beyond brand and last four."

**Builds on**:
- 001-core-storefront: the catalog (shirts, media, tiers, store settings), MSRP and final price, accounts, orders, Flash Credit, the catalog audit
- 002-brand-pages-and-shaming: the switch-per-tactic pattern, bland shirts pulled from carts
- 003-revenue-streams-per-diem: revenue streams, the per diem drain and its achievements
- 004, 005, 006, 009: their tactic switches; 005's add-ons

## Clarifications

### Session 2026-10-16

- Q1: Who is the owner? → A: **An account marked as an admin.**
  - Each account gets an admin flag (owner: "likely bool: isAdmin"), off by default.
  - It's set and cleared from the command line only, never from the store or the console.
  - An admin signs in on the normal sign-in page, and can still shop like anyone else.
  - The demo seed adds one admin account.
- Q2: Can the owner change customers and orders? → A: **Look, plus grant Flash Credit.**
  - The owner can grant a customer Flash Credit. Each grant is its own entry in the customer's
    Flash Credit ledger.
  - Nothing else about customers or orders can be changed. There are no refunds: all sales final.
- Q3: How does the console look and sound? → A: **Perfectly tranquil.**
  - Owner: "Dan's a phoney." Dan is insecure, and the store's loudness is an act.
  - In his own office, everything is calm, and corporate motivational-poster wisdom gently
    encourages him.
  - None of the shopper tactics or the strobe ever run there.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dan's Shirts (Priority: P1)

Dan signs in and opens the console, and it's quiet in here. Nothing flashes, nothing counts down,
and nobody is looking at this shirt right now. A framed poster says **CONFIDENCE**, and under it:
"You set the prices. That makes you the expert."

Every shirt he's ever stocked is there, active or not, each with the number only Dan gets to see:
its complexity score. Beside it are the tier that score earns, the
MSRP the math suggests, and the final price he actually charges.

He bumps Fractal Fury from 42 to 48 and watches the MSRP climb before he saves. He sets a final price
on a new shirt and makes it live. He retires last season's polo. It vanishes from the store, but every
guy who bought one can still pull it up in his order history. There's no delete button. There never
was.

**Why this priority**: shirts are the store. Editing them is what the owner opens Drizzle Studio for
today, and the console has no reason to exist until this works. It also sets up the console's door:
only the owner gets in.

**Independent Test**: sign in as the owner and:
- see every shirt with its score, tier, MSRP and final price
- create a shirt and make it active
- change a score and a final price
- deactivate a shirt, then reactivate it

Each change shows in the store on the next page load, and the console itself stays calm throughout.
Then, as a guest and as a signed-in shopper, open every console address and try every console action.
Each one is refused and changes nothing.

**Acceptance Scenarios**:

1. **Given** the owner is signed in, **When** the owner opens the shirts page, **Then** every shirt
   is listed, active and inactive, with:
   - its image, name, style and status
   - its complexity score and tier
   - its MSRP
   - its final price, marked either as set by Dan or as the MSRP
2. **Given** a shirt open for editing, **When** the owner changes its score or final price, **Then**
   the console shows the resulting tier, MSRP and final price before saving. **When** the owner
   saves, **Then** the store shows the new price and badge on the next page load.
3. **Given** a shirt whose score puts it in the BLAND tier, **When** the owner saves a final price at
   or above a real shirt's start (the MSRP where the first tier above BLAND begins, 010), **Then** the save is refused with the limit and the price it would
   have resolved to, and nothing changes.
4. **Given** a shirt with no images, **When** the owner tries to make it active, **Then** it's
   refused (an active shirt needs at least one image).
5. **Given** an active shirt that's in shoppers' carts and in past orders, **When** the owner
   deactivates it, **Then**:
   - it's gone from the store's listings, and its own page says it's retired, with no way to add
     it to a cart
   - it's pulled from carts with the store's usual notice
   - it's still viewable from the order history of every order that has it

   **When** the owner reactivates it, **Then** it's back in the store.
6. **Given** a guest or a signed-in shopper, **When** they open any console address, **Then** they
   see the store's ordinary not-found page. **When** they send any console change directly (not
   through a page), **Then** it's refused and nothing changes.
7. **Given** any shirt, **When** the owner looks for a way to delete it, **Then** there is none.
8. **Given** every tactic switch is on and the owner's browser has Extreme Awesomeness on, **When**
   the owner opens any console page, **Then**:
   - nothing flashes, moves or pops up
   - no shopper tactic appears
   - one motivational poster is on the page
   - a successful save is confirmed with a word of encouragement

---

### User Story 2 - The Switchboard (Priority: P2)

A prospect wants to see the roach motel. Dan opens settings, flips Roach motel off and on again, and
reloads the cart: one click, no database. Below the switches are the MSRP tuning knobs (since 010, a
base price and a price per point). He raises the price per point. Before he saves, the console shows what every shirt's MSRP becomes. It won't let him
bring a real shirt's start down to a bland shirt's price, because a bland shirt must always cost less than a real one.

**Why this priority**: every demo flips tactics, and today that means editing a database row. This is
the owner's second reason for opening Studio.

**Independent Test**: flip each tactic switch from the console and confirm the store follows it on
the next page load. Change the MSRP tuning and confirm every MSRP follows it. Confirm that a tuning
change that would break the bland rule is refused.

**Acceptance Scenarios**:

1. **Given** the settings page, **When** the owner looks at the switches, **Then** every tactic
   switch from 001–009 is there, each with:
   - its current state
   - one plain line saying what it does when it's on
2. **Given** any switch, **When** the owner flips it, **Then** it's saved at once with one click.
   Nothing else on the page changes, and the store follows it on the next page load.
3. **Given** new MSRP tuning (the base price and the price per point, 010), **When** the owner
   previews it, **Then** the console lists each active shirt's MSRP now and after. **When** the
   owner saves, **Then** every shirt priced at MSRP shows the new price in the store.
4. **Given** new tuning that would put any BLAND shirt at or above a real shirt's new start, **When** the
   owner saves, **Then** it's refused, naming each shirt that would break the rule, and nothing
   changes.
5. **Given** the Flash Credit top-up presets, **When** the owner adds, changes or removes an amount,
   **Then** the account page's top-up offers exactly those amounts.

---

### User Story 3 - Priced Against the Grain (Priority: P3)

Somebody priced the Geo Riot under the Confetti Cannon, and the Geo Riot is *way* more complicated.
The pricing page catches it. It plots every active shirt's score against its price, with the MSRP
curve running through them and the tier bands behind. It lists every pair where the more complicated
shirt costs less, along with every shirt Dan priced off the curve and how far off it is.

**Why this priority**: the roadmap calls this analysis out by name, and it protects the store's
central promise: complexity is the price. It needs the shirt editor (US1) to fix what it finds.

**Independent Test**: seed a catalog with known inversions and overrides. Confirm that the pricing
page flags exactly those pairs and overrides, with correct differences. Confirm that fixing a price
in the shirt editor clears the flag.

**Acceptance Scenarios**:

1. **Given** two active shirts where the higher-scored one has the lower final price, **When** the
   owner opens the pricing page, **Then** the pair is listed with both shirts' scores and prices,
   the gap between them, and a link to edit either one.
2. **Given** two active shirts with the same score and different prices, **When** the owner opens
   the pricing page, **Then** they aren't flagged.
3. **Given** shirts with a final price set by Dan, **When** the owner opens the pricing page,
   **Then** each one shows how far it is from its MSRP, in dollars and percent, above or below.
4. **Given** a catalog problem that the command-line catalog audit would report (an error or a
   warning), **When** the owner opens the pricing page, **Then** the same problem is shown there.
5. **Given** fewer than two active shirts, **When** the owner opens the pricing page, **Then** it
   says there's nothing to compare yet.

---

### User Story 4 - Uploading the Goods (Priority: P4)

A new pattern just came back from the printer. Dan uploads it at full resolution, writes the alt
text, and attaches it to the new shirt as the main image. On the shirt page, a shopper can zoom in
until he can count every shape, the same as with every other shirt.

**Why this priority**: new shirts need new art. Until now, adding an image meant dropping files into
the project and adding rows by hand. US1 can already attach images that are in the library.

**Independent Test**: upload an image, attach it to a shirt as the main image, and open the shirt in
the store's zoom viewer. Confirm that uploads that are bad or too small are refused and save nothing.

**Acceptance Scenarios**:

1. **Given** the media library, **When** the owner uploads an image with alt text, **Then** it
   appears in the library and can be attached to any shirt.
2. **Given** a shirt with several images, **When** the owner reorders them, **Then** the first is
   the shirt's main image in the store.
3. **Given** an upload that isn't an accepted image, is too large, or is too small to zoom, **When**
   the owner submits it, **Then** it's refused with the reason, and nothing is saved.
4. **Given** an image that a shirt uses, or that is the store's placeholder, **When** the owner tries
   to remove it, **Then** it's refused. An image that nothing uses can be removed.
5. **Given** an active shirt with one image, **When** the owner tries to detach it, **Then** it's
   refused.

---

### User Story 5 - Tiers and Add-Ons (Priority: P5)

Dan decides "Dangerously Complicated" should start at 60, not 50. The console shows which shirts drop
a tier before he saves. He gives the Pattern Protection Plan™ a new pitch, raises its price, and
retires an add-on that wasn't pulling its weight. Last month's orders still show what those guys paid.

**Why this priority**: tiers and add-ons change less often than shirts and switches, but each one
still means a trip to Studio today.

**Independent Test**: edit a tier's name, colors and starting score, add a tier, and remove a tier.
Confirm the store's badges follow. Create, edit, retire, restore and reorder add-ons, and confirm
checkout follows. Confirm that past orders are unchanged.

**Acceptance Scenarios**:

1. **Given** the tiers page, **When** the owner opens it, **Then** each tier shows:
   - its score band
   - its badge in its own colors
   - its tagline
   - how many active shirts it holds
2. **Given** a change to a tier's starting score, **When** the owner previews it, **Then** the
   console lists the shirts that would change tier.
3. **Given** a tier change that would put a shirt in the BLAND tier at or above a real shirt's start,
   **When** the owner saves, **Then** it's refused, naming those shirts.
4. **Given** the tier that starts at score 0, **When** the owner tries to remove it, rename it, or
   move its start, **Then** it's refused. Its tagline and colors can still be edited.
5. **Given** an add-on, **When** the owner edits, retires, restores or reorders it, **Then** checkout
   follows on the next page load. Past orders keep the name and price that was paid.

---

### User Story 6 - Who's Buying (Priority: P6)

Dan scrolls his customers. Greg from Accounts Payable: eleven orders, $14,212.40 lifetime, $0.00 per
diem left, three streams drained. Dan opens Greg's latest order and sees the shirts, the scores they
had that day, the add-ons Greg didn't untick, and a Visa ending 4242. Nothing more about the card. The
store never had any more than that.

Greg is out of money. Dan grants him $500.00 of Flash Credit, and the poster says **GENEROSITY**.
Greg's balance goes up by exactly $500.00. His Flash Credit history shows it as a gift from Dan,
right next to his top-ups. He spends it on a shirt the same afternoon.

**Why this priority**: it's useful, and it's where the store's drain achievements finally get a
reader. But nothing else depends on it. The grant is the console's only money change, so it's
built test-first (constitution VI).

**Independent Test**: with seeded shoppers and orders:
- confirm that the customers and orders pages show the right totals, balances and lines
- confirm that no page shows more of a card than its brand and last four
- grant a customer Flash Credit, and confirm that their balance rises by exactly that amount and
  still equals the sum of their entries, and that they can spend it at checkout

**Acceptance Scenarios**:

1. **Given** the customers page, **When** the owner opens it, **Then** each account shows:
   - its display name and email
   - when it joined
   - its order count and lifetime spend
   - its Flash Credit balance

   The owner can search by name or email.
2. **Given** a customer, **When** the owner opens them, **Then** the console shows:
   - their orders
   - every Flash Credit entry, with a balance equal to the sum of the entries
   - their revenue streams and what's left in each
   - every drain achievement their orders earned
3. **Given** the orders page, **When** the owner opens an order, **Then** the console shows:
   - its number and date
   - its customer, or "Guest"
   - each shirt line, with the name, tier and score at purchase, the size and quantity, the price
     paid and the MSRP at the time
   - each add-on line
   - the Flash Credit applied
   - the card's brand and last four, and nothing more of the card
   - any drain achievements it earned
4. **Given** a customer, **When** the owner grants them an amount of Flash Credit, **Then**:
   - one grant entry for exactly that amount is added to their ledger
   - their balance rises by exactly that amount
   - their own Flash Credit history shows the grant
   - checkout lets them spend it like any other Flash Credit
5. **Given** a grant that's zero, negative, or not a dollar amount, **When** the owner submits it,
   **Then** it's refused and nothing is recorded. **When** the owner presses Grant twice for one
   grant, **Then** it's recorded once.
6. **Given** any customer or order, **When** the owner looks for anything else to change (an order,
   a past entry, an account's details), **Then** there's no way to change it.

---

### Edge Cases

- **A score with no ceiling.** A huge score produces an enormous MSRP. The console shows it exactly,
  to the cent, and never rounds it off or switches to scientific notation.
- **A new BLAND shirt.** A score change that moves a shirt into the BLAND tier is checked against the
  bland rule like any other price change. A shirt pulled into the BLAND tier also leaves shoppers'
  carts the next time they look, while bland shaming is on (the 002 behavior).
- **Tuning that crosses a tier.** On the straight line (010), a BLAND score's MSRP always stays
  under a real shirt's start, but a lower price per point can bring that start down to one of Dan's
  own BLAND prices. That's refused like a bland final price.
- **A price change with shirts in carts.** Carts show the new price on the next page load, and
  checkout charges the catalog price (the store never trusts a price sent from the browser). Placed
  orders never change.
- **The URL name.** A shirt's URL name is set when it's created and can't change afterward, so links
  in order history and old bookmarks keep working.
- **Two tabs, one owner.** The last save wins. Each form saves only its own fields. Flipping one
  switch never rewrites another setting.
- **The session ends mid-edit.** A save after the owner's session ends or signs out elsewhere is
  refused with a prompt to sign in again, and nothing changes.
- **A shopper guessing addresses.** Every console address shows the ordinary not-found page to
  anyone who isn't the owner. It gives no hint that a console exists.
- **An SVG with a payload.** An uploaded SVG that contains scripts, or loads anything from
  elsewhere, is refused.
- **Name collisions.** An upload never replaces or overwrites an existing image, even when the file
  names match.
- **Guest orders.** With the checkout gate off, a guest can place an order. It's listed under
  "Guest".
- **Spending a grant.** Granted credit is spent exactly like topped-up credit, including how the per
  diem drain counts it.
- **A gift to himself.** An admin's own account is a customer like any other, so the owner can grant
  it Flash Credit. It's fake money.
- **An admin no longer.** When an account's admin flag is cleared from the command line, that
  account loses the console at its next page load or save, even mid-session.
- **The quiet office.** Console pages stay calm whatever the tactic switches say, and whatever the
  owner's own Extreme Awesomeness toggle says.
- **Deactivated, still bought.** An inactive shirt still shows in the console. Its past orders still
  open, and the shopper's order history still shows it.
- **Nothing to analyze.** The pricing page with one active shirt, or none, says so.
- **The placeholder.** The store's placeholder image can be changed but never left unset by the
  console, and it can't be removed while it's in use.
- **Phones.** At 360px, every console list becomes a stack of cards, with no sideways scrolling.

## Requirements *(mandatory)*

### Functional Requirements

**The door**

- **FR-001**: The console MUST be open only to the store owner: a signed-in account marked as an
  admin.
  - Every account MUST carry an admin flag, off by default. Accounts that exist today start with it
    off.
  - The flag MUST be set and cleared only from the command line, by email. The store and the
    console MUST offer no way to change it.
  - An admin signs in on the store's normal sign-in page, and can still shop.
  - The demo seed MUST add one admin account. Its sign-in lives in the seed data, like the demo
    shopper's.
- **FR-002**: Anyone who isn't the signed-in owner, guest or shopper, who opens any console address
  MUST see the store's ordinary not-found page. Shoppers MUST see no link to the console and no hint
  that it exists.
- **FR-003**: The store MUST check every console change at the moment it's made:
  - that the change comes from the owner, who is still signed in
  - that it keeps every catalog rule

  A change that fails either check MUST be refused with nothing changed. Hiding a page or a button
  MUST NEVER be the only protection.
- **FR-004**: The owner MUST be able to reach the console from a link in the store header, which
  only the owner sees, and get back to the store from every console page.
- **FR-005**: The console MUST be perfectly tranquil. Dan's a phoney, and in his own office he can
  drop the act:
  - soft, muted colors, plain type and generous space
  - nothing that flashes, strobes, animates or pops up
  - no Extreme Awesomeness button, and no strobe or pipes, even when the owner's browser has it on
  - none of the shopper tactics: no scarcity lines, countdowns, social proof, pop-ups, add-ons,
    confirmshaming or "Are you sure sure?"

  A confirmation the console needs, such as deactivating a shirt, MUST be asked once, calmly.
- **FR-005a**: Every console page MUST show one motivational poster, in the corporate style:
  - one word in capitals, such as INTEGRITY, SYNERGY or CONFIDENCE
  - one serene line of encouragement under it, aimed at an insecure man who sets the prices (for
    example "You set the prices. That makes you the expert.")

  The posters MUST come from a set of at least 12 and change from page load to page load. Like
  the rest of the store's copy, they're played straight and never explain the joke.
- **FR-005b**: The console's messages MUST be calm and encouraging:
  - a successful save says so, with a word of encouragement (for example "Saved. That was a good
    decision, Dan.")
  - a refusal is gentle, and still says plainly what to fix

**Shirts (US1)**

- **FR-006**: The console MUST list every shirt, active and inactive, showing:
  - image, name, style and status
  - whether it's featured
  - complexity score and tier
  - MSRP
  - final price, marked as set by Dan or as the MSRP

  The list MUST sort by score, price or name, and filter by status and tier.
- **FR-007**: The owner MUST be able to create a shirt with:
  - a name (1–80 characters)
  - a URL name: lowercase letters, digits and hyphens, unique, and fixed once the shirt is created
  - a style (polo or button-down)
  - a complexity score: a whole number, 0 or more, with no ceiling
  - a description (required)
  - an optional final price, in dollars and cents, at least $0.01 (blank means the MSRP)
  - whether it's featured
  - images from the media library

  A new shirt with no images MUST start inactive.
- **FR-008**: While a score or final price is being edited, the console MUST show the resulting
  tier, MSRP and final price before saving. Those MUST come from the store's single MSRP algorithm.
  The console MUST NOT keep a second copy of the price math.
- **FR-009**: The owner MUST be able to edit every field of a shirt except its URL name. A save MUST
  be refused, with a plain reason and nothing changed, when:
  - a BLAND-tier shirt would resolve to a price at or above a real shirt's start (the message gives
    the limit and the resolved price)
  - an active shirt would have no image
  - any value breaks its rule
- **FR-010**: The owner MUST be able to deactivate and reactivate any shirt. The console MUST offer
  no way to delete a shirt. A deactivated shirt:
  - leaves the store's listings, and its own page shows it as retired, with no way to add it to a
    cart (so order-history links keep working)
  - is pulled from carts with the store's existing notice
  - stays viewable from the order history of every order that has it
- **FR-011**: Every console change MUST reach shoppers on their next page load, with no restart and
  no other step. Carts MUST follow the catalog's current prices. Placed orders MUST NEVER change.

**The switchboard (US2)**

- **FR-012**: The settings page MUST show every tactic switch, each with its current state and one
  plain line on what it does when it's on:
  - checkout gate
  - bland-shirt shaming
  - confirmshaming
  - per diem drain
  - drain jokes
  - fake scarcity
  - countdown timers
  - fabricated social proof
  - pre-checked add-ons
  - roach-motel cart
  - Flash Mode
  - pipes background
  - nosy sign-up
- **FR-013**: Each switch MUST flip with a single click and save at once. It MUST change nothing
  else.
- **FR-014**: The owner MUST be able to change the MSRP tuning: the base price and the price per
  point (010; before, the start price, the anchor score and the doubling interval). Before saving, the console MUST show each active shirt's MSRP now and
  after. The MSRP formula itself MUST NOT be editable, only its tuning (constitution II).
- **FR-015**: A tuning change that would put any BLAND-tier shirt at or above a real shirt's start MUST
  be refused, naming each such shirt.
- **FR-016**: The owner MUST be able to add, change and remove the Flash Credit top-up presets. Each
  must be a positive dollar amount.
- **FR-017**: The owner MUST be able to set the media base URL (blank, or an http(s) address) and
  choose the store's placeholder image.

**The pricing analysis (US3)**

- **FR-018**: A pricing page MUST plot every active shirt's score against its final price, with the
  MSRP line and the tier bands. Since 010 the price axis is linear from $0, so the MSRP is a
  straight line.
- **FR-019**: The pricing page MUST list every pair of active shirts where the higher-scored shirt
  has the lower final price. Each listing shows both shirts' scores and prices, the gap, and a link
  to edit each one. Shirts with equal scores MUST NOT be flagged.
- **FR-020**: The pricing page MUST list every shirt whose final price was set by Dan, with its
  difference from the MSRP in dollars and percent, marked above or below.
- **FR-021**: The pricing page MUST show the same errors and warnings the command-line catalog audit
  reports, each linked to where it can be fixed.

**Media (US4)**

- **FR-022**: The media library MUST show every image with:
  - a thumbnail and its alt text
  - the shirts that use it
  - whether it's the placeholder
- **FR-023**: The owner MUST be able to upload an image with alt text (1–200 characters, required).
  The store MUST accept only these:
  - PNG, JPEG, WebP or SVG
  - at most 15 MB
  - for a photo-style image (PNG, JPEG or WebP), at least 2,000 pixels on its longest side, so the
    zoom has something to show
  - for an SVG, no scripts and no references to anything outside the file

  A refused upload MUST save nothing. An upload MUST NEVER replace or overwrite an existing image.
- **FR-024**: The owner MUST be able to attach images to a shirt, put them in order (the first is
  the main image), and detach them. An active shirt MUST keep at least one image.
- **FR-025**: The owner MUST be able to edit an image's alt text. The owner MUST be able to remove an
  image only when no shirt uses it and it isn't the placeholder.
- **FR-026**: An uploaded image MUST work in the store's zoom viewer the same way the seeded images
  do.

**Tiers and add-ons (US5)**

- **FR-027**: The tiers page MUST show each tier in score order, with:
  - its band (its starting score up to the next tier's)
  - its badge in its own colors
  - its tagline
  - its count of active shirts
- **FR-028**: The owner MUST be able to:
  - edit a tier's name, tagline, starting score, and badge colors (#RRGGBB)
  - add a tier
  - remove any tier except the one starting at 0

  No two tiers may share a starting score or a name. Before saving, the console MUST list the shirts
  that would change tier.
- **FR-029**: The tier starting at 0 is the BLAND tier (constitution II). Its name (BLAND) and its
  start (0) MUST NOT change, and it MUST NOT be removed. Its tagline and colors can be edited.
- **FR-030**: A tier change that would put any shirt in the BLAND tier at or above a real shirt's start
  MUST be refused, naming each such shirt.
- **FR-031**: The owner MUST be able to create, edit, retire, restore and reorder add-ons, with these
  rules:
  - name: 1–60 characters, unique
  - pitch: 1–160 characters
  - decline line: 1–160 characters
  - price: at least $0.01

  The console MUST offer no way to delete an add-on. Past orders MUST keep the name and price that
  was paid.

**Customers and orders (US6)**

- **FR-032**: The customers page MUST list every account with its display name, email, join date,
  order count, lifetime spend and Flash Credit balance, and mark the admins. It MUST be searchable
  by name or email.
- **FR-033**: A customer's page MUST show:
  - their orders
  - every Flash Credit entry, with the balance equal to the sum of the entries
  - their revenue streams, with what's left in each
  - every drain achievement their orders earned
- **FR-034**: The orders page MUST list orders newest first, with the order number (e.g.
  DF-000042), the customer or "Guest", the date, the total and the payment method. An order's page
  MUST show:
  - each shirt line, with the name, tier and score at purchase, the size, the quantity, the price
    paid and the MSRP at the time
  - each add-on line
  - the Flash Credit applied
  - the card's brand and last four
  - the drain achievements the order earned
- **FR-035**: No console page may show more of a card than its brand and last four. No console page
  may show a password or anything derived from one, or a sign-in session. The nosy sign-up's answers
  are never stored, so there is nothing of them to show.
- **FR-036**: The owner MUST be able to grant a customer Flash Credit:
  - The amount is in dollars and cents, at least $0.01, with no ceiling (the same as a top-up).
  - Each grant MUST be recorded as its own entry in the customer's Flash Credit ledger, marked as a
    grant (constitution: Flash Credit is a ledger).
  - The balance stays the sum of the entries, and it never goes below zero.
  - A grant MUST be recorded exactly once, even when it's submitted twice.
  - The customer's own Flash Credit history MUST show the grant as a gift from Dan, in the store's
    voice. It's spent at checkout like any other Flash Credit.
- **FR-036a**: Apart from grants, the console MUST NOT change customers or orders. There's no
  refund, no order edit, no change to a past ledger entry, and no change to an account's details or
  sign-in. All sales final.

**Everywhere**

- **FR-037**: Every console page MUST work from a 360px-wide phone up to a desktop, with no
  horizontal scrolling (constitution V).
- **FR-038**: Every amount the console takes MUST be exact dollars and cents:
  - a whole-dollar entry like "1400" is kept as $1,400.00
  - fractions of a cent, and anything that isn't a dollar amount, are refused

  Every amount shown MUST be exact to the cent.
- **FR-039**: Complexity scores MUST appear only in the console. No shopper page may show one
  (constitution II).
- **FR-040**: The store's documentation for owners MUST describe the console as the way to manage the
  store, in place of Drizzle Studio.

### Key Entities *(include if feature involves data)*

- **Admin (the owner)**: an account with the admin flag on (FR-001). Only an admin can open the
  console. Every account has the flag, off by default.
- **Shirt**: name, URL name, style, complexity score, optional final price, description, status
  (active or inactive), featured, ordered images. It's never deleted.
- **Media**: an image with a storage key and alt text, attachable to any number of shirts. One image
  is the store's placeholder.
- **Complexity tier**: name, tagline, starting score and badge colors. The tier starting at 0 is
  BLAND.
- **Store settings**: the MSRP tuning, the Flash Credit presets, the media base URL, the placeholder
  image, and every tactic switch.
- **Add-on**: name, pitch, decline line, price, position and active. It's retired, never deleted.
- **Customer**: a shopper account, with its orders, Flash Credit entries and revenue streams.
- **Flash Credit grant**: a new kind of Flash Credit entry. It's a positive amount the owner gave a
  customer, and it's never edited or removed.
- **Motivational poster**: a word in capitals and one line of encouragement. It's console copy,
  with at least 12 in the set.
- **Order**: its shirt lines and add-on lines as they were bought, its payment (Flash Credit and the
  card's brand and last four), and its drain achievements.
- **Pricing finding** (derived, never stored): an inverted pair, an override's distance from the
  MSRP, or a catalog audit problem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every owner task in the store's "Managing the store" guide can be done in the console
  without Drizzle Studio or a command line: shirts, prices, images, tiers, add-ons, switches and MSRP
  tuning.
- **SC-002**: A console change appears for shoppers on their next page load, every time, with no
  restart or other step.
- **SC-003**: 100% of console addresses show the not-found page to guests and to signed-in shoppers.
  100% of console changes attempted by anyone other than the owner are refused and change nothing.
- **SC-004**: After any sequence of console saves, the catalog audit reports zero errors.
- **SC-005**: The owner can flip any tactic switch in at most two clicks from opening the console.
- **SC-006**: On a seeded catalog with known inversions and overrides, the pricing page flags all of
  them and nothing else.
- **SC-007**: Shopper pages show zero complexity scores. Console pages show zero card details beyond
  brand and last four.
- **SC-008**: Every console page works at 360px wide with no horizontal scrolling, and passes its
  journeys on both a phone and a desktop.
- **SC-009**: An owner new to the console can create a shirt, attach an uploaded image and make it
  active in under 5 minutes, without help.
- **SC-010**: After every grant, the customer's balance rises by exactly the amount granted and
  equals the sum of their ledger entries, every time. A grant submitted twice is recorded once.
- **SC-011**: With every tactic switch on and Extreme Awesomeness on, console pages show zero
  flashing, motion, pop-ups or shopper tactics. Every console page shows exactly one motivational
  poster.

## Assumptions

- There's one store. Any admin is the owner. There are no staff roles, no permissions beyond "admin
  or not", and no change history of who changed what.
- No bulk import or export, and no scheduled changes (such as a price that changes next week).
- Nothing is deleted from the console except images that nothing uses. Shirts and add-ons retire,
  and customers and orders are never removed.
- The switch descriptions are the one-line versions of the store guide's switch table.
- The order history achievements (per diem drained, and each stream an order emptied) are recorded
  today but read nowhere. The console's customer and order pages become their reader.
- Uploaded images are stored with the store's other images and served the same way, under the same
  media base URL.
- The console needs no performance work beyond the store's existing budgets. It's an owner tool on a
  demo store.
- Drizzle Studio stays available to developers. The owner just no longer needs it.
- Shoppers' money paths don't change. Prices still come from the catalog at checkout. The only
  new money is the grant, a new kind of Flash Credit entry that's spent like a top-up.
- Because grants touch Flash Credit, this feature is built test-first and runs `/speckit-analyze`
  before implementation (constitution VI and the "Analyze the money" gate).
- **Constitution note.** As written, principle I ("Every page… MUST target exactly one customer")
  and principle V ("The UI MUST be as loud as the shirts") cover every page. The tranquil console
  (FR-005) needs an amendment that scopes them to shopper pages and adds the console's own rule:
  calm, and still working from 360px. That amendment is drafted as constitution v4.1.0, batched
  with the pending K1 clarification (V, "It starts off"). The owner ratifies it by merging this
  feature's pull request.

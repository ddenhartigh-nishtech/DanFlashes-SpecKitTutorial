# Feature Specification: Core Storefront

**Feature Branch**: `001-core-storefront`

**Created**: 2026-10-12

**Status**: Draft (revised after `/speckit-analyze` reviews 2026-10-12 and 2026-10-13, and plan review 2026-10-13)

**Input**: User description: "Build the core Dan Flashes storefront: a home page, a product listing
page with a complexity/price filter, and a product detail page with zoom/enhance, sizes S–XXL, and
add to cart. Guests can build a cart but must sign in to check out. Accounts show purchase history
and hold Flash Credit, preloaded from a (fake) credit card. Checkout is faux money only: pay with a
fake card (billed separately) or with Flash Credit (deducted from the balance). The owner sets each
shirt's complexity score in catalog data, and the price follows an exponential curve with a $300
starting price; bland shirts sit below that as foils. Include a T.C. Tugger shirt as a cross-skit
tie-in."

## Glossary

- **Complexity score**: a whole number the owner assigns to each shirt. It is owner-only and never
  shown to shoppers.
- **MSRP**: the calculated price. It comes from the complexity score through the exponential MSRP
  algorithm.
- **Final price**: what the store displays and charges. It is the owner's price if one is set,
  otherwise the MSRP.
- **Complexity tier**: an owner-named band of complexity scores (e.g. "Dangerously Complicated").
  Shoppers see the tier badge, never the score.
- **Bland shirt**: any shirt in the lowest complexity tier, the BLAND tier. It is a foil priced under
  $300.
- **Money**: US dollars to the cent (e.g., $200.18), everywhere.
- **Inactive shirt**: a shirt the owner has taken off the floor. It is never deleted.
- **Media**: an image file the store can show, plus its description. The store data records where each
  file lives, so files can move to a different host without editing each shirt.

## Clarifications

### Session 2026-10-12

- Q: Where do shirt designs come from? → A: A curated catalog maintained by the owner now.
  Procedurally generated shirts come later as their own feature.
- Q: What shape is the price curve? → A: Exponential, with the starting price and growth rate tuned
  at the owner's discretion.
- Q: Who sets the final price? → A: The owner. The exponential algorithm produces the MSRP, and the
  owner can set a final price for any shirt. Without one, the final price is the MSRP.
- Q: Who can check out? → A: Anyone can build a cart, but checkout requires an account. The gate is
  a deliberate Dan Flashes move, not an oversight.
- Q: How is vibrancy enforced? → A: It isn't measured by software. The owner curates. Bland shirts
  are allowed as flagged foils priced below $300.
- Q: Do shoppers see the complexity score? → A: No. It is the owner's data lever. Shoppers see
  complexity in the design itself and in complexity tier badges (owner-defined score ranges). Bland
  shirts get a BLAND badge.
- Q: What happens to a shirt that is taken down? → A: It is deactivated, never deleted. Any cart lines
  holding it are removed by a cart audit, and past buyers can still view it from their order
  history.
- Q: What does an empty cart do? → A: It still loads. It asks "You sure about that?" and pushes the
  most expensive shirt and the top-tier listing.

### Session 2026-10-13

- Q: Where does product data live? → A: In the store's database, not in files in the codebase.
  That covers shirts, images, tiers, and store settings. A demo data loader fills it the first time.
  Until an admin page exists, the owner manages data with a database editing tool.
- Q: Where do images live? → A: Image files sit in a local media folder. The store data holds each
  image's location (relative to a configurable base address) and its description, so moving to
  cloud storage later means changing one setting. The placeholder image is configured the same way.
- Q: Must the site work on phones? → A: Yes. Every page works from a 360px-wide phone up to a
  desktop.
- Q: Should the store warn the owner when a manual price breaks the complexity order? → A: No.
  Pricing-vs-complexity analysis is a downstream admin feature (ROADMAP 008), not part of 001.
- Q: Error pages? → A: Branded 404 and 500 pages, plus a 418 "I'm a teapot" easter egg.
- Q: What money granularity? → A: US dollars to the cent everywhere: prices, MSRP, totals, Flash
  Credit, and top-ups.
- Q: Is "bland" its own flag? → A: No. Bland is the lowest complexity tier.
- Q: What can the owner configure on a tier? → A: Its name (the badge text), a tagline, the lowest
  score it covers, and its badge colors. Tiers can be added, edited, and restyled.
- Q: In what order do cart lines appear? → A: Most recently added first. Drag-to-reorder is out of
  scope.
- Q: What happens to the cart at checkout? → A: The order keeps its own permanent copy of each line
  (with that moment's prices and tier), and the cart is emptied, ready for the next spree.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Filter by Complexity (Priority: P1)

The Dan Flashes guy lands on the home page and gets hit with the loudest shirts in the store. He
heads to the shirt listing. Every shirt shows its price and a tier badge that says exactly how
complicated it is: "Complicated," "Very Complicated," all the way up to "Too Complicated for Most
Men." He filters to the top tier, sorts by most complicated, and watches the prices climb. Down at
the bottom are a few BLAND shirts, cheap and clearly labeled. He keeps scrolling up.

**Why this priority**: this is the joke. A catalog where price visibly tracks complexity is the
smallest thing that is recognizably Dan Flashes. Everything else builds on it.

**Independent Test**: load the seeded catalog. Visit the home page and the listing, then filter by
tier and by price and sort both ways. Confirm that every shirt shows a price and exactly one badge
(tier or BLAND), that no complexity number appears anywhere, and that among shirts priced at MSRP,
prices never go down as complexity goes up.

**Acceptance Scenarios**:

1. **Given** the seeded catalog, **When** the guy opens the home page, **Then** he sees a hype
   headline, a featured set of the most complicated shirts, and a path to the full listing.
2. **Given** the listing, **When** it loads, **Then** every active shirt shows its name, image, style
   (polo or button-down), price, and one badge: its complexity tier (BLAND for the lowest tier). No
   complexity score is shown.
3. **Given** the listing, **When** he selects one or more tiers, a price range, a style, or any
   combination, **Then** only shirts matching every active filter are shown.
4. **Given** the listing, **When** he sorts by "Most Complicated," "Least Complicated," or price in
   either direction, **Then** the shirts appear in that order. If no owner prices are set,
   most-complicated and highest-price produce the same order (ties excepted).
5. **Given** two shirts with the same complexity score and no owner price, **When** they are
   displayed, **Then** they have the same price and the same tier badge.
6. **Given** a shirt in the lowest tier, **When** it is displayed, **Then** it shows the BLAND badge and costs
   less than $300.
7. **Given** an inactive shirt, **When** the home page or listing loads, **Then** that shirt does not
   appear.

---

### User Story 2 - Zoom, Enhance, Add to Cart (Priority: P2)

He opens a shirt. It fills the screen. He hits enhance and zooms in until he can count every shape
he's paying for. He picks a size from S to XXL and adds it to his cart without signing in.

**Why this priority**: the detail view is where the price gets justified and where the buying
starts. It's useless without the catalog (P1) and needed by checkout (P3).

**Independent Test**: open any shirt as a guest, zoom to maximum, pick a size, and add it to the
cart. Confirm that the cart holds the right shirt, size, price, and badge.

**Acceptance Scenarios**:

1. **Given** an active shirt, **When** he opens its detail page, **Then** he sees a large image with
   the tier or BLAND badge on the image viewer, plus the name, style, price, size options S, M, L,
   XL, and XXL, and an Add to Cart action.
2. **Given** the detail page, **When** he uses zoom/enhance, **Then** he can magnify the pattern and
   pan around it, and individual motifs stay distinguishable at maximum zoom.
3. **Given** the detail page, **When** he switches sizes, **Then** the price does not change. Size never
   affects price.
4. **Given** he hasn't picked a size, **When** he tries to add to cart, **Then** he is told to pick a
   size and nothing is added.
5. **Given** he is a guest, **When** he adds a shirt, **Then** it goes into his cart and stays there
   as he keeps browsing.
6. **Given** the cart, **When** it loads, **Then** each line shows the shirt image, name, badge, size,
   quantity, and price, most recently added first, plus a running total.
7. **Given** an empty cart, **When** he opens the cart page, **Then** it loads and asks "You sure about
   that?". It spotlights the most expensive active shirt and links to the listing filtered to the
   top tier.

---

### User Story 3 - The Checkout Gate, an Account, and a Faux Card (Priority: P3)

His cart is loaded, and he goes to check out. The store stops him: no account, no shirts. He signs up
(or signs in), his guest cart comes with him, and he pays with a fake credit card. It's billed
separately, so nothing comes out of his Flash Credit. He gets a congratulatory confirmation, and the
order shows up in his purchase history.

**Why this priority**: it closes the buying loop and creates the account that Flash Credit (P4),
revenue streams, and per diem all build on later.

**Independent Test**: build a guest cart, attempt checkout, create an account, and pay with a
card-shaped test number. Confirm that the order is recorded with the correct total and appears in
order history.

**Acceptance Scenarios**:

1. **Given** a guest with a non-empty cart, **When** he tries to check out, **Then** checkout is
   blocked and he is pushed to sign in or create an account, with brand-voice copy that makes this
   sound like a privilege.
2. **Given** a guest cart, **When** he signs up or signs in, **Then** the guest cart merges into his
   account cart and nothing is lost.
3. **Given** a signed-in shopper at checkout, **When** the page loads, **Then** he sees each line item
   with its badge, a subtotal, Shipping $0.00, Tax $0.00, and the total.
4. **Given** a signed-in shopper at checkout, **When** he chooses the card method and enters a
   card-shaped number (valid checksum), a future expiry, and a CVC, **Then** the order is recorded,
   the confirmation shows "charged to card ending ####", and his Flash Credit balance is unchanged.
5. **Given** the card form, **When** the number fails the checksum, the expiry is in the past, or the
   CVC is missing, **Then** the payment is refused with a clear message and no order is recorded.
6. **Given** a completed order, **When** he opens his account, **Then** his purchase history lists
   the order with its date, its items (shirt, badge, size, quantity, price), subtotal, shipping, tax,
   total, and how it was paid. Each item links to its shirt page.
7. **Given** a shirt he bought that has since been deactivated, **When** he follows its link from
   order history, **Then** the shirt page still shows its images, name, and description, marked as
   retired, with no Add to Cart.
8. **Given** checkout, **When** prices are calculated, **Then** each final price is re-resolved from
   the catalog at that moment. Any price coming from the shopper's side is ignored.

---

### User Story 4 - Flash Credit (Priority: P4)

In his account, he loads up on Flash Credit by "charging" a fake card. Next time he checks out, he
picks Flash Credit and the total comes straight off his balance.

**Why this priority**: it's the store's own currency and the foundation for revenue streams and the
per diem drain later. The store is fully shoppable without it (P3), so it comes last.

**Independent Test**: as a signed-in shopper, top up Flash Credit with a card-shaped test number,
then check out with Flash Credit. Confirm that the balance drops by exactly the order total and that
the account shows every change.

**Acceptance Scenarios**:

1. **Given** a signed-in shopper, **When** he opens his account, **Then** he sees his Flash Credit
   balance and a history of every top-up and spend.
2. **Given** his account, **When** he adds Flash Credit by choosing a preset amount or entering his
   own and paying with a card-shaped number, **Then** the balance increases by exactly that amount
   and the top-up appears in the history.
3. **Given** a balance at least equal to the order total, **When** he checks out with Flash Credit,
   **Then** the order is recorded, the balance decreases by exactly the order total, and the spend
   appears in the history, linked to the order.
4. **Given** a balance below the order total, **When** he picks Flash Credit, **Then** the payment is
   refused, no credit is deducted, and he is offered a top-up (with hype copy) or the card method.
5. **Given** any sequence of top-ups and spends, **When** the balance is shown, **Then** it equals the
   sum of the history entries and is never negative.

---

### Edge Cases

- **Astronomical prices**: there is no price ceiling, so prices can reach seven figures or more. They
  MUST display in full with thousands separators and never be abbreviated or truncated.
- **Price change mid-cart**: if the owner changes a final price or retunes the MSRP settings after a
  shirt is carted, checkout uses the re-resolved price. If it differs from what the cart showed, he
  is told before he pays.
- **Shirt deactivated while in a cart**: a cart audit runs every time the cart loads, every time
  checkout loads, and again when an order is placed. Lines for inactive (or missing) shirts are
  deleted, and he is told in brand voice which shirts Dan pulled from the floor.
- **Empty cart**: the cart page still loads (US2-7). Checkout with an empty cart sends him back to
  the cart.
- **Double submit**: submitting checkout twice records one order and deducts Flash Credit once.
- **Two sessions spending the same Flash Credit**: the balance can't be overspent. The second
  checkout is refused if the first has already used the credit.
- **Unknown URL or server error**: branded 404 and 500 pages, never a framework default page.
- **Missing or broken image**: a loud placeholder image is shown wherever the shirt's image would be.
  The name, badge, and price still show.
- **Signing in with a cart on both sides**: the guest cart and the saved account cart merge.
  Identical shirt and size combinations add their quantities together.

## Requirements *(mandatory)*

### Functional Requirements

**Catalog & Pricing**

- **FR-001**: The catalog MUST live in the store's database, and it MUST NOT be kept as files in the
  codebase. Each shirt has a name, style (polo or button-down), one or more images, a complexity
  score, an optional final price, a short hype description, and an active/inactive status. Until an admin page exists, the owner edits it with a database editing tool.
- **FR-002**: The complexity score MUST be a whole number of zero or more, set by the owner, with no
  upper limit. It MUST NEVER be shown to shoppers.
- **FR-003**: Each shirt MUST have an MSRP, calculated from its complexity score by one exponential
  MSRP algorithm. The MSRP MUST be deterministic, monotonic (a higher score never gives a lower
  MSRP), and rounded to the nearest cent.
- **FR-004**: The MSRP settings (at least the starting price, the score where the starting price
  applies, and the doubling interval) MUST be owner-editable without changing code.
- **FR-005**: The owner MAY set a final price for any shirt. A shirt's final price is the owner's
  price (dollars and cents) if one is set, and its MSRP otherwise. The final price is what the store
  displays and charges. Size and style MUST NOT affect price.
- **FR-006**: The seed catalog MUST include at least 12 shirts, with both polos and button-downs, at
  least 2 shirts in the BLAND tier, at least one shirt in every complexity tier, and 1 T.C. Tugger cross-over
  shirt.
- **FR-007**: The owner MUST be able to add, edit, and restyle complexity tiers without changing code.
  Each tier has a name (the badge text), an optional tagline, the lowest score it covers, and badge
  colors. The tiers MUST cover every score from 0 upward with no gaps or overlaps. The last tier is
  open-ended, and **the lowest tier is the BLAND tier**. A shirt's tier follows from its score, so
  changing a tier's range re-sorts shirts automatically.
- **FR-008**: Shirts MUST be deactivated, never deleted. Inactive shirts are hidden from the home
  page, listing, and cart, and they can't be added or checked out. The system MUST refuse to delete
  any shirt that appears in an order.

**Home & Listing**

- **FR-009**: The home page MUST show a hype headline, featured shirts (the most complicated active
  shirts by default, or the ones the owner marks as featured), and a path to the full listing.
- **FR-010**: The listing MUST let shoppers filter by complexity tier (one or more), price range, and
  style, and sort by Most/Least Complicated or by price in either direction.
- **FR-011**: Wherever a shirt appears (listing, home, detail image viewer, cart lines, checkout
  lines, order confirmation, and order history), it MUST show exactly one badge: its complexity tier,
  styled with that tier's colors.

**Product Detail & Cart**

- **FR-012**: The detail page MUST provide zoom/enhance with pan, size selection (S, M, L, XL, XXL),
  and Add to Cart. All sizes share one price.
- **FR-013**: The detail page of an inactive shirt MUST still render its images, name, style, badge,
  and description, marked as retired, with no price and no Add to Cart. It MUST NOT be linked from
  anywhere except the order history of shoppers who bought it.
- **FR-014**: Guests MUST be able to add, change the quantity of, and remove cart items, and the cart
  MUST persist while they browse.
- **FR-015**: The cart MUST show each line's image, name, badge, size, quantity, and final price,
  ordered most recently added first, plus a running total.
- **FR-016**: A cart audit MUST run whenever the cart loads, whenever checkout loads, and when an order
  is placed. It deletes lines for inactive or missing shirts and tells the shopper which were removed.
- **FR-017**: An empty cart page MUST ask "You sure about that?", spotlight the most expensive active
  shirt, and link to the listing filtered to the top complexity tier.
- **FR-018**: Wherever a shirt image is missing or fails to load, a loud placeholder image MUST be
  shown instead. The placeholder is an owner-configurable image, stored like any other image.

**Accounts & the Checkout Gate**

- **FR-019**: Shoppers MUST be able to create an account and sign in with an email and password, and
  sign out.
- **FR-020**: Checkout MUST require a signed-in account. A guest who attempts checkout MUST be sent
  to sign in or sign up, and returned to checkout afterward with the cart intact.
- **FR-021**: The checkout gate MUST be an owner-switchable setting (constitution Principle IV). When
  it is off, guests can check out with the card method.
- **FR-022**: On sign-in, the guest cart MUST merge into the account's cart.
- **FR-023**: The account area MUST show purchase history (orders with date, items, subtotal,
  shipping, tax, total, and payment method, each item linking to its shirt page) and the Flash Credit
  balance and history.

**Checkout & Payment (all faux)**

- **FR-024**: Checkout MUST offer two payment methods: the faux card and Flash Credit. No real payment
  processor is involved.
- **FR-025**: The faux card MUST accept a number only if it passes the standard card checksum, has a
  future expiry, and has a 3–4 digit CVC. Only the card brand and last four digits are kept.
- **FR-026**: A card payment MUST record the order and MUST NOT change the Flash Credit balance.
- **FR-027**: A Flash Credit payment MUST succeed only when the balance covers the full order total,
  and MUST deduct exactly that total.
- **FR-028**: At checkout, the system MUST re-resolve every final price from the catalog, MUST ignore
  any price provided by the shopper's side, and MUST record each item's final price and MSRP on the
  order.
- **FR-029**: Checkout, the order confirmation, and order history MUST show the lines Subtotal,
  Shipping $0.00, Tax $0.00, and Total. Nothing ships.
- **FR-030**: A successful checkout MUST show a brand-voice confirmation. A failed one MUST record no
  order, deduct no credit, and keep the cart.

**Flash Credit**

- **FR-031**: Signed-in shoppers MUST be able to top up Flash Credit with a preset amount ($500,
  $1,000, $5,000) or a custom amount in dollars and cents (at least $0.01), paid with the faux card.
- **FR-032**: Every top-up and spend MUST be recorded as a history entry with its amount, date, and
  (for spends) the related order. The balance MUST equal the sum of the entries and MUST NEVER be
  negative.

**Media, Layout & Errors**

- **FR-033**: Images MUST be stored as files referenced from the store data by a relative location
  plus an owner-configurable base address. Changing the base address MUST move every image without
  editing individual records.
- **FR-034**: Every page MUST be usable on screens from 360px wide (phones) to desktop, with no
  horizontal scrolling. The zoom viewer MUST support touch pinch and drag.
- **FR-035**: The store MUST show branded pages for "not found" (404) and "something broke" (500).
  A request to `/teapot` MUST return HTTP 418 with a branded "I'm a teapot" page.
- **FR-036**: The owner MUST be able to back up the store data to a timestamped copy and restore from
  a chosen copy. A backup MUST be taken automatically before any structural update or reset.

**Voice**

- **FR-037**: All shopper-facing copy (headlines, buttons, empty states, errors, confirmations) MUST
  use the Dan Flashes voice from constitution Principle I.

### Key Entities

- **Shirt**: a catalog item maintained by the owner. It has a name, a style, images, a complexity
  score, an optional final price, a hype description, a status (active or inactive),
  and an optional featured flag.
- **MSRP Settings**: the owner-tunable values for the exponential MSRP algorithm (starting price,
  anchor score, doubling interval).
- **Complexity Tier**: an owner-defined band of complexity scores, with a name (badge text), an
  optional tagline, the lowest score it covers, and badge colors. Tiers are ordered, contiguous, and
  start at 0. The lowest is BLAND.
- **Media**: an image file's relative location, its description (alt text), and what it is for (shirt
  image or placeholder).
- **Store Settings**: owner-tunable values: MSRP settings, tactic switches, Flash Credit presets, the
  media base address, and which image is the placeholder.
- **Shopper Account**: a registered customer, identified by an email and password.
- **Cart / Cart Item**: shirts, sizes, and quantities a guest or shopper intends to buy. A cart holds
  no prices.
- **Order**: a completed faux purchase. It records the items (each with its final price, MSRP, name,
  and tier at checkout), the subtotal, shipping, tax, and total, the payment method (card brand and
  last four, or Flash Credit), and the date.
- **Flash Credit Entry**: one top-up or spend on an account's Flash Credit, with an amount, a date,
  and an optional link to an order. The balance is the sum of the entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from the home page to a completed checkout (including
  creating an account) in under 3 minutes.
- **SC-002**: In an audit of the full catalog, 100% of shirts without an owner price are priced at
  their MSRP, and 100% of BLAND-tier shirts
  cost less than $300.
- **SC-003**: 100% of shirt appearances show exactly one badge (a tier or BLAND), and 0 complexity
  scores appear on any shopper-facing page.
- **SC-004**: 100% of recorded orders have a total exactly equal to the sum of their items' final
  prices times their quantities.
- **SC-005**: Across any sequence of top-ups and spends, the displayed Flash Credit balance equals
  the sum of the entries 100% of the time and is never negative.
- **SC-006**: 0 full card numbers or CVCs can be found anywhere the store keeps data.
- **SC-007**: On a typical mobile connection, the main shirt image on the listing and detail pages
  appears within 2.5 seconds.
- **SC-008**: 0 carts can reach a placed order containing an inactive shirt.
- **SC-009**: When 5 people are shown the store with no explanation, at least 4 can correctly say
  why the most expensive shirt is the most expensive.
- **SC-010**: Every shopper page passes the automated journeys at both a phone-sized (≈390px) and a
  desktop viewport with no horizontal scroll.

## Assumptions

- **MSRP defaults**: a score of 10 has an MSRP of $300, and the MSRP doubles every 10 points
  (score 15 → $424.26, 20 → $600.00, 50 → $4,800.00). BLAND-tier shirts have scores below 10, so they land under
  $300. The owner can retune all of this.
- **Tier defaults** (the owner can rename, re-range, restyle, or add tiers):

  | Score | Tier |
  |---|---|
  | 0–9 | BLAND |
  | 10–24 | Complicated |
  | 25–44 | Very Complicated |
  | 45–69 | Seriously Complicated |
  | 70–99 | Dangerously Complicated |
  | 100+ | Too Complicated for Most Men |

- **Catalog storage**: the database is the only runtime source of product data. A demo data loader
  seeds about 14 shirts, which is fixture data for development and not read at runtime. A real admin
  page is its own later feature (ROADMAP 008).
- **Images**: the owner supplies shirt images in the local media folder. Placeholder pattern art is
  acceptable for the tutorial. No image CDN is needed for now.
- **Hosting**: none in 001 (local only). The design MUST NOT require a paid or serverless-only host.
- **Inventory**: every shirt is always in stock in every size. Fake scarcity comes later.
- **No shipping address**: nothing ships, so none is collected.
- **No split payments**: an order is paid entirely by card or entirely by Flash Credit.
- **No password reset or email verification** in this feature. Accounts are local to the store.
- **Currency**: USD only.
- **Out of scope for 001**: see `ROADMAP.md`. This includes the About Us page, bland-shirt shaming
  (the empty-cart "You sure about that?" is just a taste), revenue streams and per diem, the urgency
  tactics, add-ons and the roach-motel cart, Flash Mode, and the pattern generator.

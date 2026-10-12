# Feature Specification: Core Storefront

**Feature Branch**: `001-core-storefront`

**Created**: 2026-10-12

**Status**: Draft (clarifications Q1–Q3 resolved 2026-10-12)

**Input**: User description: "Build the core Dan Flashes storefront: a home page, a product listing
page with a complexity/price filter, and a product detail page with zoom/enhance, sizes S–XXL, and
add to cart. Guests can build a cart but must sign in to check out. Accounts show purchase history
and hold Flash Credit, preloaded from a (fake) credit card. Checkout is faux money only: pay with a
fake card (billed separately) or with Flash Credit (deducted from the balance). The owner sets each
shirt's complexity score in catalog data, and the price follows an exponential curve with a $300
starting price; bland shirts sit below that as foils. Include a T.C. Tugger shirt as a cross-skit
tie-in."

## Clarifications

### Session 2026-10-12

- Q: Where do shirt designs come from? → A: A curated catalog maintained by the owner now.
  Procedurally generated shirts come later as their own feature.
- Q: What shape is the price curve? → A: Exponential, with the starting price and growth rate tuned
  at the owner's discretion.
- Q: Who sets the final price? → A: The owner. The exponential algorithm produces a suggested MSRP,
  and the owner can set a final price for any shirt. Without one, the final price is the MSRP.
- Q: Who can check out? → A: Anyone can build a cart, but checkout requires an account. The gate is
  a deliberate Dan Flashes move, not an oversight.
- Q: How is vibrancy enforced? → A: It isn't measured by software. The owner curates. Bland shirts
  are allowed as flagged foils priced below $300.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Filter by Complexity (Priority: P1)

The Dan Flashes guy lands on the home page and gets hit with the loudest shirts in the store. He
heads to the shirt listing, where every shirt shows its complexity score in big type right next to
its price. He drags the complexity filter up, sorts by most complicated, and watches the prices climb.
Down at the bottom are a few bland shirts, cheap and clearly labeled as such. He keeps scrolling up.

**Why this priority**: this is the joke. A catalog where price visibly tracks complexity is the
smallest thing that is recognizably Dan Flashes. Everything else builds on it.

**Independent Test**: load the seeded catalog. Visit the home page and the listing, then filter and
sort by complexity and by price. Confirm that every shirt shows a score and a price, and that among
shirts priced at MSRP, prices never go down as complexity goes up.

**Acceptance Scenarios**:

1. **Given** the seeded catalog, **When** the guy opens the home page, **Then** he sees a hype
   headline, a featured set of the most complicated shirts, and a path to the full listing.
2. **Given** the listing, **When** it loads, **Then** every shirt shows its name, image, style
   (polo or button-down), complexity score, and price. The score is at least as prominent as the
   price.
3. **Given** the listing, **When** he narrows the complexity range, the price range, or both,
   **Then** only shirts inside every active range are shown.
4. **Given** the listing, **When** he sorts by complexity or by price, in either direction, **Then**
   the shirts appear in that order. If no owner prices are set, the two sorts produce the same order
   (ties excepted).
5. **Given** two shirts with the same complexity score and no owner price, **When** they are
   displayed, **Then** they have the same price (their shared MSRP).
6. **Given** a bland shirt, **When** it is displayed, **Then** it is visibly labeled as bland and
   costs less than $300.

---

### User Story 2 - Zoom, Enhance, Add to Cart (Priority: P2)

He opens a shirt. It fills the screen. He hits enhance and zooms in until he can count every shape
he's paying for. He picks a size from S to XXL and adds it to his cart without signing in.

**Why this priority**: the detail view is where the price gets justified and where the buying
starts. It's useless without the catalog (P1) and needed by checkout (P3).

**Independent Test**: open any shirt as a guest, zoom to maximum, pick a size, and add it to the
cart. Confirm that the cart holds the right shirt, size, and price.

**Acceptance Scenarios**:

1. **Given** a shirt, **When** he opens its detail page, **Then** he sees a large image, the name,
   the style, the complexity score, the price, size options S, M, L, XL, and XXL, and an Add to Cart
   action.
2. **Given** the detail page, **When** he uses zoom/enhance, **Then** he can magnify the pattern and
   pan around it, and individual motifs stay distinguishable at maximum zoom.
3. **Given** the detail page, **When** he switches sizes, **Then** the price does not change. Size never
   affects price.
4. **Given** he hasn't picked a size, **When** he tries to add to cart, **Then** he is told to pick a
   size and nothing is added.
5. **Given** he is a guest, **When** he adds a shirt, **Then** it goes into his cart and stays there
   as he keeps browsing.

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
3. **Given** a signed-in shopper at checkout, **When** he chooses the card method and enters a
   card-shaped number (valid checksum), a future expiry, and a CVC, **Then** the order is recorded,
   the confirmation shows "charged to card ending ####", and his Flash Credit balance is unchanged.
4. **Given** the card form, **When** the number fails the checksum, the expiry is in the past, or the
   CVC is missing, **Then** the payment is refused with a clear message and no order is recorded.
5. **Given** a completed order, **When** he opens his account, **Then** his purchase history lists
   the order with its date, its items (shirt, size, quantity, score, price), its total, and how it
   was paid.
6. **Given** checkout, **When** prices are calculated, **Then** each final price is re-resolved from
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

- **Astronomical complexity**: there is no price ceiling, so prices can reach seven figures or more.
  They MUST display in full with thousands separators and never be abbreviated or truncated.
- **Price change mid-cart**: if the owner changes a final price or retunes the MSRP settings after a
  shirt is carted, checkout uses the re-resolved price. If it differs from what the cart showed, he is told before he
  pays.
- **Shirt removed from the catalog while in a cart**: it is flagged in the cart and cannot be checked
  out.
- **Empty cart**: checkout is unreachable. The empty cart pushes him back to the shirts.
- **Double submit**: submitting checkout twice records one order and deducts Flash Credit once.
- **Two sessions spending the same Flash Credit**: the balance can't be overspent. The second
  checkout is refused if the first has already used the credit.
- **Missing image**: the shirt still shows its name, score, and price, with a loud placeholder.
- **Signing in with a cart on both sides**: the guest cart and the saved account cart merge.
  Identical shirt and size combinations add their quantities together.

## Requirements *(mandatory)*

### Functional Requirements

**Catalog & Pricing**

- **FR-001**: The store owner MUST maintain the catalog as editable data. Each shirt has a name,
  style (polo or button-down), one or more images, a complexity score, a bland flag, a short hype
  description, and an active/removed status.
- **FR-002**: The complexity score MUST be a whole number of zero or more, set by the owner, with no
  upper limit.
- **FR-003**: Each shirt MUST have a suggested MSRP, computed from its complexity score by one
  exponential MSRP algorithm. The MSRP MUST be deterministic, monotonic (a higher score never gives
  a lower MSRP), and rounded to whole dollars.
- **FR-004**: The MSRP settings (at least the starting price, the score where the starting price
  applies, and the doubling interval) MUST be owner-editable without changing code.
- **FR-005**: The owner MAY set a final price for any shirt in the catalog data. A shirt's final
  price is the owner's price if one is set, and its MSRP otherwise. The final price is what the
  store displays and charges. Size, style, and the bland flag MUST NOT affect price.
- **FR-006**: When the catalog is loaded, the system MUST warn the owner about every shirt whose
  final price is lower than that of a shirt with a lower complexity score. The warning MUST NOT block
  the price.
- **FR-007**: The seed catalog MUST include at least 12 shirts, with both polos and button-downs, at
  least 2 bland shirts, and 1 T.C. Tugger cross-over shirt.

**Home & Listing**

- **FR-008**: The home page MUST show a hype headline, featured shirts (the most complicated ones by
  default), and a path to the full listing.
- **FR-009**: The listing MUST let shoppers filter by complexity range and price range, and sort by
  complexity or price in either direction.
- **FR-010**: Every displayed price, anywhere in the store, MUST be accompanied by its complexity
  score, and the score MUST be at least as prominent as the price.
- **FR-011**: Bland shirts MUST be visibly labeled as bland wherever they appear.

**Product Detail & Cart**

- **FR-012**: The detail page MUST provide zoom/enhance with pan, size selection (S, M, L, XL, XXL),
  and Add to Cart. All sizes share one price.
- **FR-013**: Guests MUST be able to add, change the quantity of, and remove cart items, and the cart
  MUST persist while they browse.
- **FR-014**: The cart MUST show each item's shirt, size, quantity, score, and price, plus a running
  total.

**Accounts & the Checkout Gate**

- **FR-015**: Shoppers MUST be able to create an account and sign in with an email and password, and
  sign out.
- **FR-016**: Checkout MUST require a signed-in account. A guest who attempts checkout MUST be sent
  to sign in or sign up, and returned to checkout afterward with the cart intact.
- **FR-017**: The checkout gate MUST be an owner-switchable setting (constitution Principle IV). When
  it is off, guests can check out with the card method.
- **FR-018**: On sign-in, the guest cart MUST merge into the account's cart.
- **FR-019**: The account area MUST show purchase history (orders with date, items, total, and
  payment method) and the Flash Credit balance and history.

**Checkout & Payment (all faux)**

- **FR-020**: Checkout MUST offer two payment methods: the faux card and Flash Credit. No real payment
  processor is involved.
- **FR-021**: The faux card MUST accept a number only if it passes the standard card checksum, has a
  future expiry, and has a 3–4 digit CVC. Only the card brand and last four digits are kept.
- **FR-022**: A card payment MUST record the order and MUST NOT change the Flash Credit balance.
- **FR-023**: A Flash Credit payment MUST succeed only when the balance covers the full order total,
  and MUST deduct exactly that total.
- **FR-024**: At checkout, the system MUST re-resolve every final price from the catalog, MUST ignore
  any price provided by the shopper's side, and MUST record each item's final price and MSRP on the
  order.
- **FR-025**: Shipping and tax are $0.00. Nothing ships.
- **FR-026**: A successful checkout MUST show a brand-voice confirmation. A failed one MUST record no
  order, deduct no credit, and keep the cart.

**Flash Credit**

- **FR-027**: Signed-in shoppers MUST be able to top up Flash Credit with a preset amount ($500,
  $1,000, $5,000) or a custom whole-dollar amount, paid with the faux card.
- **FR-028**: Every top-up and spend MUST be recorded as a history entry with its amount, date, and
  (for spends) the related order. The balance MUST equal the sum of the entries and MUST NEVER be
  negative.

**Voice**

- **FR-029**: All shopper-facing copy (headlines, buttons, empty states, errors, confirmations) MUST
  use the Dan Flashes voice from constitution Principle I.

### Key Entities

- **Shirt**: a catalog item maintained by the owner. It has a name, a style, images, a complexity
  score, an optional owner-set final price, a bland flag, a hype description, and a status.
- **MSRP Settings**: the owner-tunable values for the exponential MSRP algorithm (starting price,
  anchor score, doubling interval).
- **Shopper Account**: a registered customer, identified by an email and password.
- **Cart / Cart Item**: shirts, sizes, and quantities a guest or shopper intends to buy.
- **Order**: a completed faux purchase. It records the items with each one's final price and MSRP
  at checkout, the total, the payment method (card brand and last four, or Flash Credit),
  and the date.
- **Flash Credit Entry**: one top-up or spend on an account's Flash Credit, with an amount, a date,
  and an optional link to an order. The balance is the sum of the entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from the home page to a completed checkout (including
  creating an account) in under 3 minutes.
- **SC-002**: In an audit of the full catalog, 100% of shirts without an owner price are priced at
  their MSRP, 100% of complexity-order breaks are reported to the owner, and 100% of bland shirts
  cost less than $300.
- **SC-003**: 100% of displayed prices, on every page, appear alongside their complexity score.
- **SC-004**: 100% of recorded orders have a total exactly equal to the sum of their items' final
  prices times their quantities.
- **SC-005**: Across any sequence of top-ups and spends, the displayed Flash Credit balance equals
  the sum of the entries 100% of the time and is never negative.
- **SC-006**: 0 full card numbers or CVCs can be found anywhere the store keeps data.
- **SC-007**: On a typical mobile connection, the main shirt image on the listing and detail pages
  appears within 2.5 seconds.
- **SC-008**: When 5 people are shown the store with no explanation, at least 4 can correctly say
  why the most expensive shirt is the most expensive.

## Assumptions

- **MSRP defaults**: a score of 10 has an MSRP of $300, and the MSRP doubles every 10 points
  (score 20 → $600, 30 → $1,200, 50 → $4,800). Bland shirts have scores below 10, so they land under
  $300. The owner can retune all of this.
- **Catalog format**: the owner prefers JSON catalog files. That choice is carried into
  `/speckit-plan`.
- **Images**: the owner supplies shirt images. Placeholder pattern art is acceptable for the
  tutorial.
- **Inventory**: every shirt is always in stock in every size. Fake scarcity comes later.
- **No shipping address**: nothing ships, so none is collected.
- **No split payments**: an order is paid entirely by card or entirely by Flash Credit.
- **No password reset or email verification** in this feature. Accounts are local to the store.
- **Currency**: USD only.
- **Out of scope for 001**: see `ROADMAP.md`. This includes the About Us page, bland-shirt shaming,
  revenue streams and per diem, the urgency tactics, add-ons and the roach-motel cart, Flash Mode, and
  the pattern generator.

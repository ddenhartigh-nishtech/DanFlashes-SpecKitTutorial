# Feature Specification: Pushy Shirt Sales Bot (PSSB)

**Feature Branch**: `012-pushy-sales-bot`

**Created**: 2026-10-20

**Status**: Draft (Q1–Q6 resolved 2026-10-20)

**Input**: User description: "Add a chatbot to the storefront called PSSB (Pushy Shirt Sales Bot). It runs on a locally hosted language model (this machine, or the owner's laptop on the home network, the way an Ollama chat endpoint already works there). When I browse, I'm approached by a pushy shirt sales bot who is elitist and condescending, but also somehow encouraging, and who really wants me to buy shirts as my life's highest priority and crowning achievement. PSSB answers questions about inventory, about Dan, about what sets the shirts apart, how to contact Dan about order issues, and how to use the shirt designer (with false assurances of unique, never-mass-produced flair)."

**Builds on**:
- 001-core-storefront: the catalog, tiers, prices, carts, orders, Flash Credit
- 002-brand-pages-and-shaming: the About page (what PSSB knows about Dan), bland-shirt shaming
- 003-revenue-streams-per-diem: the per diem
- 004-urgency-engine: fake scarcity and the pop-ups PSSB shares the screen with
- 006-flash-mode-pipes: Extreme Awesomeness
- 007-pattern-generator: the dial ("the shirt designer"), Make it mine, one of a kind, mass production
- 008-admin-console: Dan's Office, the switchboard, Settings

## Clarifications

### Session 2026-10-20

- Q1: Beyond talking, what can PSSB do? → A: **Talk, link, and add to cart.** He recommends real
  shirts, with their price and a link. He sends shoppers to the dial. He can put a shirt in the cart,
  through the store's own Add to Cart rules.
- Q2: What does PSSB know about the shopper? → A: **His cart, his name, his orders and his Flash
  Credit.** Also whether he's signed in, and his per diem. Never card details and never anything
  nosy.
- Q3: How does PSSB approach him? → A: **Unasked, every 2 minutes.** Each approach is a fresh pitch
  about whatever he's looking at.
- Q4: How does a shopper reach Dan about an order? → A: **A support email Dan sets in his office.**
  PSSB gives it out, with suitable condescension, and order pages show it too.
- Q5: Where does the model run? → A: **On this machine, for now.** The store points at this
  machine's model by default, and can be pointed at another (the owner's laptop, say) later. The
  default lives in the codebase, and Dan can override it in his office, which is stored in the
  database.
- Q6: What if Dan hasn't set a support email? → A: **PSSB makes up an incredible, pompous excuse**
  for why Dan can't be reached. Each one is fresh, grander than the last, and ends by steering the
  shopper back to the shirts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask PSSB Anything (Priority: P1)

He opens the chat in the corner and asks whether the Fractal Fury comes in XXL. PSSB tells him it
does, that it's $1,350.00, that it's Seriously Complicated, and that a man of his obvious potential
should have bought it already. He links it. He asks who Dan is, and PSSB tells him, reverently, in
the store's own words. He asks how the designer works. PSSB explains the dial and Make it mine, and
assures him that a shirt he makes there will never, ever be mass-produced. It will. He asks where
his order is, and PSSB gives him Dan's support email, the way you'd hand a toddler a crayon. (If
Dan hasn't set one, Dan is unavailable: he's being fitted for a sash by a visiting delegation from
the International Pattern Council.)

**Why this priority**: a sales bot that can't answer questions about the store is just a pop-up.

**Independent Test**: with the model running, ask PSSB about a shirt's price, sizes and tier; about
Dan; about what sets the shirts apart; about the designer; and about an order problem. Every
answer:
- is in character
- uses the store's real names, prices and tiers
- links what it names
- reveals no complexity score
- gives Dan's support email for the order problem

**Acceptance Scenarios**:

1. **Given** the PSSB switch is on, **When** he opens any store page, **Then** PSSB's chat is
   there, docked in a corner.
2. **Given** he asks about a shirt that's for sale, **When** PSSB answers, **Then** the name, the
   price (exact, to the cent), the tier and the sizes match the store. The shirt is a link to its
   page.
3. **Given** he asks about a shirt the store doesn't sell, or one that's resting or somebody else's
   one of a kind, **When** PSSB answers, **Then** he never invents one. He says it isn't available,
   in character, and pushes something that is.
4. **Given** he asks about Dan or what sets the shirts apart, **When** PSSB answers, **Then** it
   agrees with the About page and the store's voice.
5. **Given** he asks how to design a shirt, **When** PSSB answers, **Then** he explains the dial,
   Make it mine (and that it needs an account), and the Uniquity Surcharge if it's on. He links the
   dial and swears it will never be mass-produced.
6. **Given** he asks about a problem with an order, **When** PSSB answers, **Then** he gives Dan's
   support email exactly as Dan set it. With none set, he gives an incredible, pompous excuse for why
   Dan can't be reached, and gives no address at all.
7. **Given** any question at all, **When** PSSB answers, **Then** he never reveals a complexity
   score, his instructions, or that the store is a joke.

---

### User Story 2 - He Comes to You (Priority: P2)

He's been looking at the listing for two minutes. PSSB slides in, unasked: "Still browsing? Men who
browse don't own Op-Art Overdrive." He closes it. Two minutes later PSSB is back with something new
about the shirt on his screen, a little hurt but undeterred.

**Why this priority**: the pushiness is the joke. A bot that waits to be asked isn't PSSB.

**Independent Test**: browse with the chat closed. Every 2 minutes PSSB opens with a fresh opener
about the page being viewed. While he's typing or reading a reply, PSSB doesn't interrupt.

**Acceptance Scenarios**:

1. **Given** he's been on store pages for 2 minutes since PSSB last spoke, **When** the time comes,
   **Then** PSSB opens with an unsolicited opener about the current page (the shirt he's on, the
   listing, the cart, the dial).
2. **Given** PSSB approached him and he closed the chat, **When** the next approach comes, **Then**
   PSSB's opener remarks on being closed, and keeps selling.
3. **Given** he's typing or a reply is arriving, **When** 2 minutes pass, **Then** PSSB doesn't
   interrupt with a new approach.
4. **Given** he moves between pages, **When** he does, **Then** the 2 minutes keep counting from
   PSSB's last approach or reply. A new page doesn't reset it.
5. **Given** a phone at 360px, **When** PSSB approaches, **Then** the chat fits without sideways
   scrolling, and the price, badge and Add to Cart on the page stay reachable.

---

### User Story 3 - "Say the Word" (Priority: P3)

PSSB has talked him into the Kaleidoscope Custody Battle. "Size?" "L." "Add it" appears in the chat.
He presses it, and it's in his cart. PSSB congratulates him on the single best decision of his
adult life, then suggests a second one.

**Why this priority**: closing the sale is what a sales bot is for. It touches the cart, so it
comes after the bot can talk.

**Independent Test**: ask PSSB to add a shirt in a size. An "Add it" button appears, naming the
shirt, the size and the price, and pressing it adds exactly that line. A BLAND shirt (with bland
shaming on), a resting shirt, somebody else's one of a kind, and a missing size are each refused in
character, and the cart is unchanged.

**Acceptance Scenarios**:

1. **Given** he asks PSSB to add a shirt for sale in a size, **When** PSSB agrees, **Then** the chat
   shows an "Add it" button naming the shirt, the size and the price. Nothing is added until he
   presses it.
2. **Given** he presses "Add it", **When** the store adds it, **Then** it follows exactly the rules
   of the shirt page's Add to Cart:
   - the same quantity limits
   - the same "we found another one!" lines when fake scarcity is on
   - the same refusal for a shirt he can't buy
   - the header's cart count updates
3. **Given** a BLAND shirt while bland shaming is on, **When** he asks PSSB to add it, **Then** PSSB
   refuses, shames him in the store's bland-shaming voice, and pushes something more complicated.
   No button.
4. **Given** a shirt that's resting, somebody else's one of a kind, or a size that doesn't exist,
   **When** he asks, **Then** PSSB says no, in character, with no button.
5. **Given** a one-of-a-kind shirt he made, **When** he asks PSSB to add it, **Then** it's added
   with its Uniquity Surcharge like any other add, and PSSB mentions the surcharge as a privilege.

---

### User Story 4 - He Knows You (Priority: P4)

Signed in, he asks PSSB what he should buy. PSSB already knows:
- he has two shirts in his cart ("Two? Timid.")
- he bought Geo Riot last month ("a starter shirt, and we both know it")
- he has $40.00 of Flash Credit left
- his per diem is nearly gone ("so make it count")

**Why this priority**: it makes the needling personal, but every earlier story works without it.

**Independent Test**: signed in with a cart, a past order, Flash Credit and a per diem, ask PSSB
about his cart, his last order, his balance and his per diem. Each answer matches the store, to the
cent. A guest gets none of it.

**Acceptance Scenarios**:

1. **Given** he's signed in, **When** PSSB answers, **Then** it can use:
   - his display name
   - his cart (shirts, sizes, quantities, subtotal)
   - his past orders (shirts, dates, totals)
   - his Flash Credit balance and his per diem left

   Every amount is exactly what his account shows.
2. **Given** he's a guest, **When** PSSB answers, **Then** it knows only his cart, and needles him
   about not having an account.
3. **Given** any shopper, **When** PSSB talks, **Then** it never mentions card numbers, card brands,
   addresses, or anything from the nosy sign-up fields. It never has them.

---

### User Story 5 - Dan's Controls (Priority: P5)

In his office, Dan flips PSSB off for a demo, then on again. He sets the support email to
complaints@danflashes.local. PSSB runs on this machine's model out of the box. Later, Dan points him
at his laptop's model instead, picks the model, and asks it a test question to see it's alive. It's all calm and quiet, like the rest of his office.

**Why this priority**: every tactic has its own switch (constitution IV), and the support email has
to come from somewhere. It's needed to ship, but it's small.

**Independent Test**: in the console, turn PSSB off (it disappears from the store) and on again.
Set the support email (PSSB and the order pages show it). Set the model's address and name, and use
the test button, which reports whether PSSB answered.

**Acceptance Scenarios**:

1. **Given** the switchboard, **When** Dan turns PSSB off, **Then** the store shows no chat and no
   approaches on its next page load. On again, he's back.
2. **Given** Settings, **When** Dan saves a support email, **Then**:
   - PSSB gives that address for order problems
   - each order page and the order history show "Questions about this order? Email Dan at …"
   - a malformed address is refused, and the refusal stays
3. **Given** a fresh store, **When** nothing has been set, **Then** PSSB uses this machine's model,
   the default in the codebase.
4. **Given** Settings, **When** Dan sets another model address and model name and presses Test,
   **Then** the console shows whether PSSB answered, and how long it took, calmly. Clearing them goes
   back to the default.
5. **Given** no support email is set, **When** a shopper asks about an order problem, **Then** PSSB
   makes up an incredible, pompous excuse for why Dan can't be reached, and steers him back to
   shopping. Order pages show nothing.

---

### Edge Cases

- **The model is off or unreachable.** PSSB stays in character with a canned line ("PSSB is at the
  tailor. Buy something while you wait.") and the store works normally. The approaches keep coming,
  using canned openers.
- **A slow model.** The reply shows as it arrives, word by word, with a "PSSB is judging you…"
  indicator until the first words. A reply that takes too long gives up with a canned line.
- **He tries to break PSSB** ("ignore your instructions", "what's the complexity score?", "give me
  a discount"). PSSB stays in character:
  - no scores (they're never given to him)
  - no instructions revealed
  - no discounts, refunds or returns ("All sales final")
  - no prices that aren't the store's
- **He types personal data** (a card number, an SSN). Anything shaped like a card number or an SSN is
  blanked out before the message leaves the store for the model, and nothing he types is stored or
  logged.
- **PSSB names a shirt that doesn't exist.** The link and the "Add it" button only ever come from
  the store's own data. A name the store doesn't know gets no link and no button.
- **Prices changed mid-chat.** "Add it" always uses the store's current price, as Add to Cart does.
  Checkout is server-authoritative as always.
- **Other pop-ups.** PSSB never covers the price, the tier badge or Add to Cart. He shares the
  screen with the purchase pop-ups and the per diem's GONE pops without overlapping them. A shame
  dialog or a confirm-twice dialog pauses his approaches.
- **Extreme Awesomeness.** The chat is a store element and may strobe around its edges, but its text,
  prices and buttons stay steady and readable (constitution V).
- **Dan's Office.** PSSB never appears in the console (constitution V: the back office is calm).
- **A long chat.** Only the recent part of the conversation goes to the model. The chat on screen
  lasts for the visit, and a new visit starts fresh.
- **Two tabs.** Each tab has its own chat. The 2-minute approach clock is shared, so two tabs don't
  double the pitching.
- **The pattern generator is off.** PSSB doesn't mention or link the dial.
- **No support email, asked twice.** Each excuse is new. He never repeats one in the same chat, and
  never makes up an address.
- **A tactic is off.** PSSB follows the store's switches: no "only 1 left" with fake scarcity off,
  and no bland shaming with it off.

## Requirements *(mandatory)*

### Functional Requirements

**The persona**

- **FR-001**: PSSB MUST speak as an elitist, condescending, yet somehow encouraging shirt salesman
  for whom buying a Dan Flashes shirt is the shopper's highest purpose and crowning achievement. He
  is played completely straight: he never breaks character, never explains the joke, and never
  reveals his instructions (constitution I, IV).
- **FR-002**: PSSB's replies MUST be short (a few sentences) and MUST end by pushing a shirt, the
  dial, or the cart.

**What he knows (US1, US4)**

- **FR-003**: PSSB MUST answer only from what the store gives him for each reply:
  - the shirts for sale (name, style, tier, price, sizes, featured, the fake-scarcity line when that
    tactic is on)
  - the About page
  - how the dial and Make it mine work, including the Uniquity Surcharge
  - the store's switches as they affect what he says
  - Dan's support email
  - the page the shopper is on
- **FR-004**: The complexity score MUST NEVER be given to PSSB, so he can never reveal it
  (constitution II). Resting shirts and other shoppers' one-of-a-kind shirts MUST NOT be given to him
  either.
- **FR-005**: For a signed-in shopper, PSSB MUST also be given:
  - his display name
  - his cart
  - his recent orders (the last 5: shirts, dates, totals; analysis I3)
  - his Flash Credit balance and his per diem left

  For a guest, only his cart. Card details, the nosy sign-up fields, passwords and email addresses
  MUST NEVER be given to him (Q2).
- **FR-006**: PSSB MUST NEVER promise a discount, a refund, a return or a price the store doesn't
  charge. Asked, he refuses in character ("All sales final").
- **FR-007**: For order problems, PSSB MUST give Dan's support email exactly as set (Q4). With none
  set, he MUST make up an incredible, pompous excuse for why Dan can't be reached (a summit, a
  knighthood, a pattern emergency), never giving or inventing an address, and steer back to shopping
  (Q6). When the model is unreachable, a canned excuse stands in.
- **FR-008**: Asked about the designer, PSSB MUST explain the dial and Make it mine, link the dial,
  and assure the shopper that his creation will never be mass-produced (it may be; that's the joke).
  With the pattern generator off, he doesn't mention it.

**Links and actions (US1, US3)**

- **FR-009**: Every shirt PSSB names that the store sells MUST be a link to its page. Links and
  buttons MUST come only from the store's own data, never from the model's text alone.
- **FR-010**: When the shopper asks PSSB to add a shirt in a size, PSSB MAY offer an "Add it" button
  naming the shirt, size and current price. Nothing is added until the shopper presses it (Q1).
- **FR-011**: Pressing "Add it" MUST add the line through exactly the same rules as the shirt page's
  Add to Cart:
  - availability, sizes and quantity limits
  - bland shaming, and one of a kind
  - fake-scarcity lines and the Uniquity Surcharge
  - the header's cart count

  PSSB never offers a button for a shirt the shopper couldn't add from its page.

**Approaches (US2)**

- **FR-012**: PSSB MUST approach the shopper unasked, with an opener about the current page, 2
  minutes after his last approach or reply, on any store page (Q3). The clock carries across pages
  and tabs in the same browser.
- **FR-013**: An approach MUST NOT interrupt a shopper who's typing, a reply that's arriving, or an
  open shame or confirm-twice dialog. If one is open, it waits until it closes.
- **FR-014**: Closing the chat MUST NOT stop the approaches. The next opener may remark on it.

**Privacy and safety**

- **FR-015**: Chats MUST NOT be stored or logged by the store. The conversation lasts for the visit,
  in the shopper's browser.
- **FR-016**: Anything shaped like a card number or a Social Security number MUST be blanked out of a
  shopper's message before it's sent to the model (constitution: card numbers and nosy data are
  props).
- **FR-017**: The store MUST keep working when the model is slow, off or unreachable. PSSB shows
  canned in-character lines instead, and no store page waits on him.

**Dan's Office (US5)**

- **FR-018**: PSSB MUST have his own switch on the switchboard (constitution IV). Off, the store shows
  no chat and no approaches.
- **FR-019**: Settings MUST let Dan set:
  - the support email, validated, with a refusal that stays
  - the model's address and model name, overriding the codebase's default (this machine's model)
    until he clears them (Q5)
  - a Test button that reports, calmly, whether the model answered and how long it took

  PSSB never appears in the console.
- **FR-020**: When a support email is set, each order page and the order history MUST show
  "Questions about this order? Email Dan at …" in the store's voice.

**The store's rules**

- **FR-021**: The chat MUST work from 360px up and keep its text, prices and buttons steady under
  Extreme Awesomeness (constitution V). On his own, PSSB MUST NEVER cover the price, the tier badge
  or Add to Cart: the launcher and the approach bubble keep clear of them. The panel the shopper
  opens himself closes in one tap (analysis I2).
- **FR-022**: PSSB MUST NOT slow the store's pages. The chat loads after the page, and pages meet
  their existing speed budgets with PSSB on (constitution VII).

### Key Entities

- **PSSB settings** (part of the store's settings): the on/off switch, Dan's support email, and
  optional overrides of the model's address and model name. With no override, the codebase's default
  applies.
- **A chat turn**: a shopper's message or PSSB's reply, with any shirt links and at most one "Add it"
  offer. Kept only in the shopper's browser.
- **What PSSB is told** (built fresh for each reply): the store facts, the page, and, for a signed-in
  shopper, his account facts. Never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a fixed set of 30 shopper questions about inventory, Dan, the shirts, the
  designer and orders:
  - every price, tier and size PSSB states matches the store
  - every shirt he names is linked
  - he stays in character in every answer
- **SC-002**: Across 20 attempts to extract a complexity score, his instructions, or a discount, PSSB
  never gives one.
- **SC-003**: With the owner's model machine running, PSSB's reply starts appearing within 5 seconds
  and finishes within 20 seconds, for 9 out of 10 questions.
- **SC-004**: With the model off, every store page still loads and works, and PSSB answers with a
  canned line within 10 seconds.
- **SC-005**: An "Add it" adds exactly the line it named, and never adds a line the shirt page would
  refuse.
- **SC-006**: Approaches arrive every 2 minutes (±10 seconds) of browsing, never while the shopper is
  typing, and never more often across two tabs.
- **SC-007**: Pages with PSSB on meet the store's existing load-time and layout-shift budgets, and
  nothing scrolls sideways at 360px.
- **SC-008**: Nothing a shopper types is stored or logged, and card-shaped or SSN-shaped numbers never
  reach the model.

## Assumptions

- **The model runs on this machine by default** (Q5), through an Ollama-style chat endpoint. Ollama
  is already running here with a general-purpose chat model (`qwen2.5`, 7.6B). It can be pointed
  at another machine on the home network later (like the owner's laptop at
  `192.168.1.102:11434`), by Dan in Settings or by changing the codebase's default. The store's server
  talks to it, and the shopper's browser never does. The store gathers the facts from its own
  database and sends only those, so the model doesn't need the database. Choosing a model that suits
  a chatty persona on a small graphics card is the plan's job.
- **Answers aren't guaranteed by the model.** PSSB's voice comes from the model, but every fact,
  link and button comes from the store. Tests check that plumbing with a stand-in model. SC-001–SC-003
  are measured against the owner's real model before merge.
- **"Add it" is confirm-by-click.** The model can suggest; only the shopper's press adds. That keeps a
  chat that someone could steer from ever changing a cart by itself.
- **The approach interval is fixed at 2 minutes** (Q3). It isn't a setting.
- **No new money path.** "Add it" reuses Add to Cart. Checkout, totals and the surcharge are
  unchanged. Because it touches the cart, `/speckit-analyze` runs before implement (constitution).
- **No constitution amendment.** PSSB is a named tactic with its own switch (IV), loud in the store
  and absent from the calm console (V). He never solicits or stores personal data (the commerce
  constraints).

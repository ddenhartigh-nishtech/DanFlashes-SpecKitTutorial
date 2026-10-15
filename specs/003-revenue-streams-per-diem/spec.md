# Feature Specification: Revenue Streams & Per Diem Drain

**Feature Branch**: `003-revenue-streams-per-diem`

**Created**: 2026-10-14

**Status**: Draft (clarifications Q1–Q3 resolved 2026-10-14; split payment added by the owner)

**Input**: User description: "Revenue streams and the per diem drain (ROADMAP 003). (1) Revenue streams: a signed-in shopper can connect "revenue streams", recurring sources of money starting with his work per diem, that automatically fund his Flash Credit, so the money goes straight to shirts without him having to think about it. (2) Per diem drain: the store tracks how much of his per diem is left (what the per diem gave him minus what he has spent at Dan Flashes) on a prominent meter, and celebrates loudly, as if it were an achievement, when it hits $0. Per the constitution, the per diem drain is a manipulation tactic and needs its own owner on/off switch. Flash Credit stays a ledger: every auto-funding is its own ledger entry and the balance never goes negative. Money is exact dollars and cents. There is no real bank or payroll connection: revenue streams are props, like the faux card."

**Builds on**: 001-core-storefront (accounts, Flash Credit and its history, orders, checkout) and
002-brand-pages-and-shaming (store switches, confirmshaming labels).

## Clarifications

### Session 2026-10-14

- Q: Which revenue streams exist? → A: **The per diem, a fixed set of absurd presets, and custom
  streams he names himself.**
- Q: How often do payments arrive? → A: **The shopper picks a schedule for each stream:**
  - **Recurring**: pays every pay period. The owner can tune the period; it's short by default so a
    demo shows money flowing within minutes.
  - **One time**: pays once.
  - **Whenever I want** (ad hoc): pays each time he presses "Cash in".
- Q: Is a per diem ongoing or tied to a trip? → A: **Every stream has a set beginning and end, with
  the option to make it ongoing** (no end). Payments only happen inside that window.
- Owner addition, after analysis: **a shopper can split a payment between Flash Credit and a card**,
  and can remove the applied credit before placing the order. When his credit doesn't cover the total,
  the store asks him to confirm putting the rest on a card. This replaces 001 FR-027's "Flash Credit
  only if it covers the whole total".
- Owner feedback after US1:
  - **No ceiling on a stream's amount.** The sky's the limit; the $10,000.00 cap is gone.
  - **A one-time stream is "applied", not "connected".**
  - **Each schedule says what it does**: "Every payday" shows the store's real pay period, and
    "Whenever I want" says it only pays on Cash in.
- Owner feedback, round 2 (this replaces Q2's store-wide pay period):
  - **"Every payday" becomes a "Recurring top-off" with its own interval**: every N minutes, hours,
    days or weeks, chosen by the shopper. The first top-off sets the day and time it repeats on. For
    example: every 2 weeks from a Friday at 5:00 PM (a paycheck), every 1 day from 8:00 AM (a per
    diem), or every 5 minutes for testing.
  - **"Just once" is applied immediately and once.** It has no start, end, or Disconnect, and it
    shows as paid in full straight away.
  - **"Whenever I want" keeps Cash in and Disconnect.**
- Owner feedback, round 3: **every stream drains, and every drain is an achievement.**
  - Spending draws down the per diem first, then the oldest money from his other streams.
  - Each stream shows how much of it is left.
  - Every stream that runs dry unlocks its own achievement ("You spent your kid's college fund on
    shirts." "Second Mortgage: GONE").
  - One big order can drain several streams at once and stacks their achievements on its
    confirmation.
- Owner feedback, round 4 (2026-10-15): **every GONE is a pop in the corner, and every pop has an (x).**
  - Each stream that runs dry gets a "[Stream]: GONE" pop in the bottom-left corner, stacked above
    the per diem gauge. The confirmation still stacks the order's achievements too.
  - The per diem gauge's GONE state and every stream's pop have an (x) that clears it. A cleared pop
    stays cleared until that stream is paid again and drained again.
  - The countdown itself ("Per diem left $X") can't be cleared. It's the meter, not a trophy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect a Revenue Stream (Priority: P1)

The guy is at the Regional Sales Kickoff. He opens his account, finds "Revenue Streams", and connects
his per diem: $75.00, recurring, from now until Thursday at 5. From then on the money lands in his
Flash Credit by itself, each payment on its own line in his history, and it stops when the trip ends.
Feeling bold, he also connects "My Kid's College Fund" for $2,000.00, one time, and a custom stream
he calls "Craig owes me" for $40.00 that pays whenever he hits "Cash in". He never has to think about
where the money is going. It's going to shirts.

**Why this priority**: it's the plumbing the whole feature stands on. The per diem meter (P2) has
nothing to measure until money is flowing in, and it's demoable on its own: connect a stream, then
watch the Flash Credit balance grow.

**Independent Test**: as a signed-in shopper, connect one stream of each schedule. Confirm that:
- a recurring top-off pays at its first top-off and then every interval he set until its end (or
  forever if it's ongoing), including payments he missed while away
- a one-time stream is applied immediately and exactly once
- a "whenever I want" stream pays each time he cashes in, and only inside its window
- every payment is its own history entry, and the balance always equals the history

**Acceptance Scenarios**:

1. **Given** a signed-in shopper, **When** he connects a stream by picking a preset (or naming his
   own), entering an amount in dollars and cents, picking a schedule, and setting a start and an end
   (or ticking Ongoing), **Then** the stream appears in his account with its name, amount, schedule,
   window, and next payment.
2. **Given** a recurring top-off, **When** each interval inside its window comes due, **Then**
   exactly its amount is added to his Flash Credit as its own history entry, labeled with the
   stream's name. The first payment comes at its start. None come after its end.
3. **Given** a one-time stream, **When** he applies it, **Then** it pays its amount immediately and
   exactly once. Its record shows as paid in full, with nothing to disconnect.
4. **Given** a "whenever I want" stream inside its window, **When** he presses "Cash in", **Then** its
   amount is added as its own history entry. Outside its window there is nothing to cash in.
5. **Given** he was away while recurring payments came due, **When** he next visits, **Then** each
   missed payment is credited separately, oldest first, and none is credited twice.
6. **Given** a connected stream, **When** he disconnects it, **Then** no further payments arrive, and
   every payment already received stays in his balance and history.
7. **Given** a guest, **When** he looks for revenue streams, **Then** he is told to sign in first.
8. **Given** any sequence of stream payments, top-ups, and spends, **When** the balance is shown,
   **Then** it equals the sum of his history exactly, and it is never negative.

---

### User Story 2 - The Per Diem Drain (Priority: P2)

Now there's a meter. Everywhere he goes on the site, it shows what's left of his per diem: what it has
paid him, minus everything he has spent at Dan Flashes since it started. It ticks down with every
shirt. When an order takes it to $0, the store throws him a party: a loud, over-the-top achievement,
as if he'd won something. He has. He spent his whole per diem on shirts.

**Why this priority**: this is the constitution's "per diem drain" tactic and the punchline of the
feature, but it needs P1's money to measure.

**Independent Test**: with a per diem connected and the switch on, check that:
- the meter shows the right amount to the cent
- it drops by the order total after each purchase
- an order taking it to $0 triggers the celebration
- turning the switch off removes the meter and the celebration completely

**Acceptance Scenarios**:

1. **Given** the drain is on and he has a per diem, **When** he browses any page, **Then** a meter
   shows his per diem left: the per diem paid in, minus what he has spent at Dan Flashes since it
   started, never below $0.00.
2. **Given** the meter shows an amount, **When** he places an order by any payment method, **Then**
   the meter drops by the order total, or to $0.00 if the order is bigger.
3. **Given** the meter is above $0, **When** an order takes it to $0, **Then** the store celebrates
   loudly, once, right when it happens, and the meter shows the achievement while it stays at $0.
4. **Given** the meter is at $0, **When** a new per diem payment arrives, **Then** the meter refills
   by that amount, and the next drain to $0 celebrates again.
5. **Given** the drain is off, **When** he browses or buys, **Then** no meter and no celebration
   appear anywhere. His streams keep paying exactly as before.
6. **Given** a per diem at $0, **When** he wants another shirt, **Then** nothing stops him. He pays by
   Flash Credit or card as usual, and the meter stays at $0.
7. **Given** his per diem's window has ended, **When** he browses, **Then** the meter still shows
   what's left of it, so he can finish the job.

---

### User Story 3 - Split the Bill (Priority: P3)

His per diem left him $155.39 of Flash Credit, and the shirt he wants is $344.61. At checkout he
applies his Flash Credit. The store takes $155.39 off and shows $189.22 still to pay, and asks him to
confirm putting the rest on a card. He confirms, enters the card, and the shirt is his. If he'd rather
not, he removes the credit and pays it all by card, or walks away with his credit untouched.

**Why this priority**: without it, Flash Credit is all or nothing, so a small per diem can never touch
a complicated shirt. It makes P1's money spendable, but P1 and P2 work without it.

**Independent Test**: with a Flash Credit balance smaller than the order total, apply the credit.
Confirm that:
- checkout shows the credit applied and the remainder
- the order can't be placed until he confirms the split and enters a valid card
- removing the credit puts the whole total back on the card
- a placed split order deducts exactly the applied credit and records both parts

**Acceptance Scenarios**:

1. **Given** a balance that covers the order, **When** he applies his Flash Credit, **Then** it pays
   the whole total, and no card is needed (as in 001).
2. **Given** a balance above $0 but below the total, **When** he applies his Flash Credit, **Then**
   checkout shows his whole balance applied and the amount left to pay, and asks him to confirm
   putting that amount on a card.
3. **Given** the split shown, **When** he tries to place the order without confirming it or without a
   valid card, **Then** nothing is placed and nothing is deducted.
4. **Given** he confirms and his card is valid, **When** he places the order, **Then** exactly the
   applied credit comes off his Flash Credit, the card covers the rest, and the order shows both parts.
5. **Given** credit applied, **When** he removes it before placing, **Then** the whole total goes back
   on the card and his balance is untouched.
6. **Given** his balance changed after checkout showed the split (a payday landed, or another tab
   spent it), **When** he places the order, **Then** nothing is charged, and he's shown the new split
   to confirm.
7. **Given** a $0.00 balance, **When** he checks out, **Then** applying credit isn't offered; he's
   pointed to top up or connect a revenue stream instead.

---

### User Story 4 - Drain Them All (Priority: P4)

The per diem is gone, but he's got a College Fund and a Garage Sale in there too. Every shirt he buys
comes out of the per diem first, then out of the oldest money he's got. Each stream shows what's
left of it, and the order that empties one unlocks its achievement. One big enough order empties two
at once, and the confirmation stacks both: "You spent your kid's college fund on shirts." "Garage
Sale: GONE."

**Why this priority**: it extends US2's single per diem trophy to every stream. It's the biggest laugh
per line of code, but US1–US3 stand on their own without it.

**Independent Test**: with a per diem, an older one-time stream and a newer one, place orders and
confirm that:
- the per diem drains first, then the older stream, then the newer one
- each stream shows how much is left
- the order that empties a stream lists its achievement, and an order that empties two lists both

**Acceptance Scenarios**:

1. **Given** the drain is on and he has several streams, **When** he places an order (any payment
   method), **Then** it is counted against his current per diem first, then against his other streams'
   money, oldest payment first.
2. **Given** his streams, **When** he views his account, **Then** each stream shows how much of its
   money is left, or that it's gone.
3. **Given** an order that takes a stream from above $0 to $0, **When** its confirmation opens,
   **Then** that stream's achievement is on it, in voice.
4. **Given** an order that empties several streams, **When** its confirmation opens, **Then** every one
   of their achievements is there, stacked.
5. **Given** a stream that was drained, **When** it pays again and a later order drains it again,
   **Then** that order unlocks its achievement again.
6. **Given** the drain is off, **When** he browses or buys, **Then** no "left" amounts and no
   achievements appear.
7. **Given** a stream other than the per diem has paid in and is spent to $0, **When** he browses
   any page, **Then** a "[Stream]: GONE" pop shows in the bottom-left corner, stacked above the per
   diem gauge.
8. **Given** a GONE pop (the per diem's or any stream's), **When** he clicks its (x), **Then** it
   disappears on every page and stays gone, until that stream is paid again and drained again.

---

### Edge Cases

- **Paying by card**: an order paid by faux card counts against the per diem, the same as Flash
  Credit. The meter tracks what he spent at Dan Flashes, not how he paid.
- **Overspending**: spending past the per diem keeps the meter at $0.00. It never goes negative, and
  the celebration only fires on the order that crosses from above $0 to $0.
- **Starts later**: a stream whose start is in the future pays nothing until then. Spending before a
  per diem starts doesn't count against it.
- **Away for a long time**: missed recurring payments are credited on his next visit, up to a cap per
  visit (see Assumptions). The rest arrive on later visits, and never past the stream's end.
- **Two tabs at once**: each due payment is credited exactly once, however many pages load at the
  same moment, and one "Cash in" press pays once.
- **A second per diem**: he can have one per diem at a time. A new one can start once the current one
  has been disconnected. An ended per diem doesn't block a new one; the new one takes over the meter.
- **Disconnect**: the meter disappears with the per diem. Its payments and history stay.
- **Switch flipped while at $0**: turning the drain off hides the meter. Turning it back on shows the
  current amount, without replaying an old celebration.
- **Changing an interval**: disconnect and reconnect. A top-off keeps the interval it was connected
  with.
- **Daylight saving**: a daily or weekly top-off repeats every 24 hours or 7 days of real time, so a
  local "8:00 AM" can drift by an hour across a clock change.
- **Signed out**: guests see no meter.
- **Credit exactly equal to the total**: it's a plain Flash Credit order. No split and no confirmation.
- **An invalid card in a split**: nothing is placed and no credit is deducted.
- **The per diem and a split order**: the meter counts the full order total, however it was split.
- **Replaying a split checkout** (a double submit): it returns the same order, charged once.
- **Spending past all of his streams**: the rest came from other money (top-ups or a card). It isn't
  held against later payments, so a stream that pays again starts fresh.
- **A disconnected stream**: its money still counts and can still be drained.
- **An old per diem** (replaced by a new one): what's left of it counts as his other money, by age.
- **Two streams paid at the same moment**: the one connected first is treated as older.
- **An old per diem** that runs dry gets no pop. It left the corner with its gauge.
- **Clearing a pop as a payday lands**: the (x) clears only the drain he saw. If the stream was paid
  in the meantime, its next drain pops again.

## Requirements *(mandatory)*

### Functional Requirements

**Revenue streams**

- **FR-001**: Signed-in shoppers MUST be able to connect revenue streams. A stream is either one of
  the store's presets (the per diem plus a fixed set of absurd ones) or a custom stream he names
  himself (1–40 characters).
- **FR-002**: Connecting a stream MUST ask for its amount per payment, in exact dollars and cents,
  greater than $0.00, with no upper limit. It MUST NOT ask for bank, payroll, or account details.
  Streams are props, and no real money moves.
- **FR-003**: Each stream MUST have a schedule chosen by the shopper, and the form MUST say what each
  one does:
  - **Recurring top-off**: pays automatically, every interval he set
  - **Just once**: applied immediately, once
  - **Whenever I want**: pays each time he presses "Cash in", never on its own
- **FR-004**: A recurring top-off MUST have its own interval, chosen by the shopper: a whole number (1 to
  1,000) of minutes, hours, days or weeks. Its first top-off sets the day and time it repeats on.
- **FR-005**: Recurring and "whenever" streams MUST have a start (now or later, never in the past) and
  either an end after the start or Ongoing (no end). Payments happen only inside the window:
  - a recurring top-off pays at its first top-off and then every interval until its end
  - "Cash in" works only inside the window
  - a one-time stream has no window; it is applied the moment it is added
- **FR-006**: Every stream payment MUST be its own Flash Credit history entry, naming the stream. The
  balance MUST always equal the exact sum of the history and MUST never go negative.
- **FR-007**: Recurring payments that came due while he was away MUST be credited on his next visit,
  each separately and oldest first. No payment may ever be credited twice, and one "Cash in" press
  pays exactly once.
- **FR-008**: His account MUST list his streams with each one's name, amount, schedule (with the
  interval for a recurring top-off), window, and next payment (or a "Cash in" button). He MUST be able
  to disconnect recurring and "whenever" streams. A one-time stream shows as applied (greyed, paid in
  full), with no Disconnect. Disconnecting stops future payments and never removes past ones.
- **FR-009**: The disconnect button MUST follow 002's confirmshaming switch: a shaming label while it
  is on, a neutral one while it is off, and the same behavior either way.
- **FR-010**: A shopper MUST have at most one per diem at a time that is still connected. Ended per
  diems don't count. Other presets and custom streams are unlimited.
- **FR-011**: Guests MUST NOT be able to connect streams. They are told to sign in first.

**Per diem drain**

- **FR-012**: The per diem drain MUST be an owner on/off setting, on by default (constitution IV).
- **FR-013**: While it is on and the shopper has a connected per diem (running or ended), a meter MUST
  show his per diem left on every page and in his account, exact to the cent. Replaying in time order
  since the per diem started, each top-off adds to it and each Dan Flashes order (any payment method)
  takes from it, and it never drops below $0.00 at any point. Spending past $0 came from other money,
  so it isn't held against the next top-off, which refills the meter by its whole amount (US2 AC4).
- **FR-014**: When an order takes the meter from above $0 to $0, the store MUST celebrate loudly and
  as an achievement, once, at that moment. The meter MUST show the achievement for as long as it stays
  at $0, until he clears it (FR-030).
- **FR-015**: A per diem payment that refills the meter MUST arm the celebration again for the next
  drain.
- **FR-016**: The per diem MUST never block a purchase. Orders are paid by Flash Credit or card
  exactly as in 001.
- **FR-017**: While the drain is off, no meter, no "left" amounts, and no celebration or achievement may
  appear anywhere. Streams and Flash Credit MUST behave identically either way.

**Split payment**

- **FR-018**: Checkout MUST let a signed-in shopper with a balance above $0.00 apply his Flash Credit
  to the order. Applying uses his whole balance, up to the order total.
- **FR-019**: When the applied credit covers the total, the order is paid by Flash Credit alone. When
  it doesn't, the remainder MUST be paid by faux card, and he MUST explicitly confirm the split (the
  credit applied and the amount going on the card) before the order can be placed.
- **FR-020**: He MUST be able to remove the applied credit at any time before placing the order. The
  whole total then goes on the card, and nothing is deducted.
- **FR-021**: At placement the store MUST recompute the split from his live balance. If it differs from
  what he confirmed, nothing is charged and he is shown the new split to confirm.
- **FR-022**: A split order MUST deduct exactly the applied credit as one Flash Credit spend linked to
  the order, and keep only the card's brand and last four digits for the rest. The confirmation and his
  order history MUST show both parts. The balance never goes negative.
- **FR-023**: This replaces 001 FR-027 for partial coverage. Paying by Flash Credit alone still requires
  a balance that covers the whole total.

**Drain them all**

- **FR-024**: Every Dan Flashes order (any payment method) MUST be counted against his streams in
  order: his current per diem first, then his other streams' money, oldest payment first. Spending
  beyond what his streams hold is other money and MUST NOT be held against later payments.
- **FR-025**: While the drain is on, each of his streams MUST show how much of its money is left, or
  that it's gone.
- **FR-026**: An order that takes a stream from above $0 to $0 MUST unlock that stream's achievement:
  "You spent your [stream] on shirts." in voice, with a badge "[Stream]: GONE". A stream that is paid
  again can be drained, and celebrated, again.
- **FR-027**: One order MUST be able to unlock several achievements at once. Its confirmation MUST show
  all of them, stacked.
- **FR-028**: Achievements MUST only be recorded while the drain is on. Turning it on later doesn't
  award old orders.
- **FR-029**: While the drain is on, every stream other than a per diem that has paid in and is spent
  to $0 MUST show a "[Stream]: GONE" pop on every page, stacked above the per diem gauge in the same
  corner. Like the gauge, it shifts no layout.
- **FR-030**: The per diem gauge's GONE state and every stream's GONE pop MUST have an (x) that clears
  it for his account, on every page and device. A cleared pop MUST stay cleared until that stream is
  paid again and drained again. The countdown ("Per diem left $X") can't be cleared.

**Voice**

- **FR-031**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers preset names, schedule names, the meter, the celebration, the disconnect labels,
  "Cash in", history entries, the checkout split, every stream's achievement, and the GONE pops.

### Key Entities

- **Revenue Stream**: one shopper's source of money. It has a name (a preset, or his own custom name),
  whether it's the per diem, an amount per payment, a schedule (recurring, one time, or whenever),
  a start, an end or ongoing, how many payments it has made, whether it's still connected, and
  which drain's GONE pop he cleared.
- **Stream Payment**: a Flash Credit history entry made by a stream: amount, the stream it came from,
  and which scheduled payment (or which "Cash in") it is.
- **Per Diem Meter** (derived, never stored): what's left of the current per diem (see FR-024).
- **Stream Left** (derived, never stored): what's left of each stream, after counting every order
  against the per diem first, then the oldest money.
- **Order Drain**: a stream that an order took to $0, recorded when the order is placed (drain on).
- **Store Settings** (from 001/002) gains the per diem drain switch.
- **Order** (from 001) can now be paid by card, by Flash Credit, or **split**, and records how much
  Flash Credit it used.
- **Brand Copy** gains the preset names, the schedule names, the meter, the celebration, the
  disconnect labels, "Cash in", and the history wording.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in shopper can connect a stream in under a minute and three steps or fewer,
  and a stream that starts now has its first payment (or its "Cash in" button) ready immediately.
- **SC-002**: After any sequence of stream payments, top-ups, and spends, the Flash Credit balance
  equals the sum of its history to the cent, 100% of the time, and is never negative.
- **SC-003**: Every recurring payment due inside a stream's window is credited exactly once: 0
  missed, 0 duplicates, and 0 outside the window, including across visits and simultaneous page
  loads.
- **SC-004**: The meter is correct to the cent after any sequence of payments and orders.
- **SC-005**: The celebration appears on 100% of orders that take the meter from above $0 to $0, and
  on no other order.
- **SC-006**: With the drain off, 0 meters and 0 celebrations appear on any page.
- **SC-007**: 0 fields anywhere ask for bank, routing, or payroll details.
- **SC-008**: When 5 people watch the $0 celebration cold, at least 4 laugh or call it "way too much."
- **SC-009**: In 100% of split orders, the credit deducted plus the card portion equals the order total
  to the cent, and the balance drops by exactly the credit applied.
- **SC-010**: 0 split orders are placed without the shopper confirming the exact amounts he was shown.
- **SC-011**: After any sequence of payments and orders, every stream's "left" is correct to the cent,
  and no stream is drawn on while the current per diem still has money.
- **SC-012**: An order that empties N streams shows exactly N achievements on its confirmation.
- **SC-013**: Every drained stream's GONE pop shows on 100% of pages until he clears it, and 0 cleared
  pops come back without a new payment and a new drain.

## Assumptions

- **Presets**: Per Diem, Expense Report Padding, My Kid's College Fund, Garage Sale, and Second
  Mortgage. Only the per diem drives the meter.
- **Form defaults**: start now, a recurring top-off every 1 day, and no end chosen yet. He must pick an
  end or tick Ongoing.
- **No monthly intervals**: months vary in length, so intervals are minutes, hours, days or weeks.
- **Window times** are entered and shown in the shopper's local time.
- **Catch-up cap**: at most 30 missed payments per stream are credited per visit. Later visits catch
  up the rest.
- **"Cash in"** has no limit beyond the window. It's a faux source, like the faux card top-up.
- **The meter's spending window**: Dan Flashes orders placed at or after the per diem's start, by any
  payment method. Top-ups and other streams don't affect it; only per diem payments raise it.
- **Where the meter shows**: as a floating gauge pinned to a bottom corner of every page, for
  signed-in shoppers with a per diem (desktop and phone), and in the account next to Flash Credit.
  Other streams' GONE pops stack above it in the same corner.
- **Where the celebration shows**: on the order confirmation for the order that drained the per diem.
- **Disconnect labels**: shamed "Disconnect (and settle for less)", neutral "Disconnect".
- **Revenue streams are a store feature, not a manipulation tactic**: they have no switch of their
  own. The per diem drain is the tactic, and it has one.
- **Changing a stream**: disconnect and reconnect. There is no editing in this feature.
- **Applying credit is all or nothing per order**: his whole balance, up to the total. There's no
  partial amount to type.
- **Reversing is before placement only**: after an order is placed, refunds remain out of scope.
- **The card is the only other payment method.**
- **Out of scope**: real banks or payroll, refunds, the Admin Console (008), Flash Mode and the Pipes
  background (006), and the urgency engine (004).

# Feature Specification: Revenue Streams & Per Diem Drain

**Feature Branch**: `003-revenue-streams-per-diem`

**Created**: 2026-10-14

**Status**: Draft (clarifications Q1–Q3 resolved 2026-10-14)

**Input**: User description: "Revenue streams and the per diem drain (ROADMAP 003). (1) Revenue streams: a signed-in shopper can connect "revenue streams", recurring sources of money starting with his work per diem, that automatically fund his Flash Credit, so the money goes straight to shirts without him having to think about it. (2) Per diem drain: the store tracks how much of his per diem is left (what the per diem gave him minus what he has spent at Dan Flashes) on a prominent meter, and celebrates loudly, as if it were an achievement, when it hits $0. Per the constitution, the per diem drain is a manipulation tactic and needs its own owner on/off switch. Flash Credit stays a ledger: every auto-funding is its own ledger entry and the balance never goes negative. Money is exact dollars and cents. There is no real bank or payroll connection: revenue streams are props, like the faux card."

**Builds on**: 001-core-storefront (accounts, Flash Credit and its history, orders) and
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
- a recurring stream pays at its start and then every pay period until its end (or forever if it's
  ongoing), including payments he missed while away
- a one-time stream pays exactly once
- a "whenever I want" stream pays each time he cashes in, and only inside its window
- every payment is its own history entry, and the balance always equals the history

**Acceptance Scenarios**:

1. **Given** a signed-in shopper, **When** he connects a stream by picking a preset (or naming his
   own), entering an amount in dollars and cents, picking a schedule, and setting a start and an end
   (or ticking Ongoing), **Then** the stream appears in his account with its name, amount, schedule,
   window, and next payment.
2. **Given** a recurring stream, **When** each pay period inside its window comes due, **Then**
   exactly its amount is added to his Flash Credit as its own history entry, labeled with the
   stream's name. The first payment comes at its start. None come after its end.
3. **Given** a one-time stream, **When** its start arrives, **Then** it pays its amount exactly once
   and is done.
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
- **The owner changes the pay period**: payments already made stay. Payments still to come follow the
  new period.
- **Signed out**: guests see no meter.

## Requirements *(mandatory)*

### Functional Requirements

**Revenue streams**

- **FR-001**: Signed-in shoppers MUST be able to connect revenue streams. A stream is either one of
  the store's presets (the per diem plus a fixed set of absurd ones) or a custom stream he names
  himself (1–40 characters).
- **FR-002**: Connecting a stream MUST ask for its amount per payment, in exact dollars and cents,
  greater than $0.00 and at most $10,000.00. It MUST NOT ask for bank, payroll, or account details.
  Streams are props, and no real money moves.
- **FR-003**: Each stream MUST have a schedule chosen by the shopper:
  - **Recurring**: pays every pay period
  - **One time**: pays once
  - **Whenever I want**: pays each time he presses "Cash in"
- **FR-004**: The pay period MUST be an owner setting. It defaults to a few minutes so a demo shows
  money flowing, and the owner can lengthen it up to a day or more.
- **FR-005**: Each stream MUST have a start (now or later, never in the past) and either an end after
  the start or Ongoing (no end). Payments happen only inside the window:
  - a recurring stream pays at its start and then every pay period until its end
  - a one-time stream pays at its start
  - "Cash in" works only inside the window
- **FR-006**: Every stream payment MUST be its own Flash Credit history entry, naming the stream. The
  balance MUST always equal the exact sum of the history and MUST never go negative.
- **FR-007**: Recurring payments that came due while he was away MUST be credited on his next visit,
  each separately and oldest first. No payment may ever be credited twice, and one "Cash in" press
  pays exactly once.
- **FR-008**: His account MUST list his streams with each one's name, amount, schedule, window, and
  next payment (or a "Cash in" button), and MUST let him disconnect any of them. Disconnecting stops
  future payments and never removes past ones.
- **FR-009**: The disconnect button MUST follow 002's confirmshaming switch: a shaming label while it
  is on, a neutral one while it is off, and the same behavior either way.
- **FR-010**: A shopper MUST have at most one per diem at a time that is still connected. Ended per
  diems don't count. Other presets and custom streams are unlimited.
- **FR-011**: Guests MUST NOT be able to connect streams. They are told to sign in first.

**Per diem drain**

- **FR-012**: The per diem drain MUST be an owner on/off setting, on by default (constitution IV).
- **FR-013**: While it is on and the shopper has a connected per diem (running or ended), a meter MUST
  show his per diem left on every page and in his account: the per diem paid in, minus his Dan Flashes
  order totals since the per diem started (any payment method), exact to the cent and never below
  $0.00.
- **FR-014**: When an order takes the meter from above $0 to $0, the store MUST celebrate loudly and
  as an achievement, once, at that moment. The meter MUST show the achievement for as long as it stays
  at $0.
- **FR-015**: A per diem payment that refills the meter MUST arm the celebration again for the next
  drain.
- **FR-016**: The per diem MUST never block a purchase. Orders are paid by Flash Credit or card
  exactly as in 001.
- **FR-017**: While the drain is off, no meter and no celebration may appear anywhere. Streams and
  Flash Credit MUST behave identically either way.

**Voice**

- **FR-018**: All new copy MUST use the Dan Flashes voice from constitution I and never explain the
  joke. That covers preset names, schedule names, the meter, the celebration, the disconnect labels,
  "Cash in", and history entries.

### Key Entities

- **Revenue Stream**: one shopper's source of money. It has a name (a preset, or his own custom name),
  whether it's the per diem, an amount per payment, a schedule (recurring, one time, or whenever),
  a start, an end or ongoing, how many payments it has made, and whether it's still connected.
- **Stream Payment**: a Flash Credit history entry made by a stream: amount, the stream it came from,
  and which scheduled payment (or which "Cash in") it is.
- **Per Diem Meter** (derived, never stored): the per diem paid in, minus Dan Flashes spending since
  that per diem started, floored at $0.00.
- **Store Settings** (from 001/002) gains the per diem drain switch and the pay period.
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

## Assumptions

- **Presets**: Per Diem, Expense Report Padding, My Kid's College Fund, Garage Sale, and Second
  Mortgage. Only the per diem drives the meter.
- **Default pay period**: 5 minutes. The owner sets it in minutes in Drizzle Studio, from 1 minute up.
- **Form defaults**: start now, recurring, and no end chosen yet. He must pick an end or tick Ongoing.
- **Window times** are entered and shown in the shopper's local time.
- **Catch-up cap**: at most 30 missed payments per stream are credited per visit. Later visits catch
  up the rest.
- **"Cash in"** has no limit beyond the window. It's a faux source, like the faux card top-up.
- **The meter's spending window**: Dan Flashes orders placed at or after the per diem's start, by any
  payment method. Top-ups and other streams don't affect it; only per diem payments raise it.
- **Where the meter shows**: as a floating gauge pinned to a bottom corner of every page, for
  signed-in shoppers with a per diem (desktop and phone), and in the account next to Flash Credit.
- **Where the celebration shows**: on the order confirmation for the order that drained the per diem.
- **Disconnect labels**: shamed "Disconnect (and settle for less)", neutral "Disconnect".
- **Revenue streams are a store feature, not a manipulation tactic**: they have no switch of their
  own. The per diem drain is the tactic, and it has one.
- **Changing a stream**: disconnect and reconnect. There is no editing in this feature.
- **Out of scope**: real banks or payroll, refunds, the Admin Console (008), Flash Mode and the Pipes
  background (006), and the urgency engine (004).

# Feature Specification: Revenue Streams & Per Diem Drain

**Feature Branch**: `003-revenue-streams-per-diem`

**Created**: 2026-10-14

**Status**: Draft (3 open questions)

**Input**: User description: "Revenue streams and the per diem drain (ROADMAP 003). (1) Revenue streams: a signed-in shopper can connect "revenue streams", recurring sources of money starting with his work per diem, that automatically fund his Flash Credit, so the money goes straight to shirts without him having to think about it. (2) Per diem drain: the store tracks how much of his per diem is left (what the per diem gave him minus what he has spent at Dan Flashes) on a prominent meter, and celebrates loudly, as if it were an achievement, when it hits $0. Per the constitution, the per diem drain is a manipulation tactic and needs its own owner on/off switch. Flash Credit stays a ledger: every auto-funding is its own ledger entry and the balance never goes negative. Money is exact dollars and cents. There is no real bank or payroll connection: revenue streams are props, like the faux card."

**Builds on**: 001-core-storefront (accounts, Flash Credit and its history, orders) and
002-brand-pages-and-shaming (store switches, confirmshaming labels).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect the Per Diem (Priority: P1)

The guy is at the regional sales conference. He opens his account, finds "Revenue Streams", and
connects his per diem: $75.00 a day. From then on, the money lands in his Flash Credit by itself,
each payment on its own line in his history. He never has to think about where it's going. It's going
to shirts.

**Why this priority**: it's the plumbing the whole feature stands on. The per diem meter (P2) has
nothing to measure until money is flowing in, and it's demoable on its own: connect, then watch the
Flash Credit balance grow.

**Independent Test**: as a signed-in shopper, connect a per diem with an amount. Confirm that the
first payment lands in Flash Credit, that later payments arrive on schedule (including any he missed
while away), that each one is its own history entry, and that the balance always equals the history.

**Acceptance Scenarios**:

1. **Given** a signed-in shopper with no streams, **When** he connects a per diem and enters an
   amount in dollars and cents, **Then** the stream appears in his account with its amount and
   schedule, and its first payment lands in his Flash Credit.
2. **Given** a connected stream, **When** a payment comes due, **Then** exactly that amount is added
   to his Flash Credit as its own history entry, labeled with the stream's name.
3. **Given** he was away while several payments came due, **When** he next visits, **Then** each
   missed payment is credited separately, oldest first, and none is credited twice.
4. **Given** a connected stream, **When** he disconnects it, **Then** no further payments arrive, and
   every payment already received stays in his balance and history.
5. **Given** a guest, **When** he looks for revenue streams, **Then** he is told to sign in first.
6. **Given** any sequence of payments, top-ups, and spends, **When** the balance is shown, **Then** it
   equals the sum of his history exactly, and it is never negative.

---

### User Story 2 - The Per Diem Drain (Priority: P2)

Now there's a meter. Everywhere he goes on the site, it shows what's left of his per diem: what it has
paid him, minus everything he has spent at Dan Flashes since. It ticks down with every shirt. When an
order takes it to $0, the store throws him a party: a loud, over-the-top achievement, as if he'd won
something. He has. He spent his whole per diem on shirts.

**Why this priority**: this is the constitution's "per diem drain" tactic and the punchline of the
feature, but it needs P1's money to measure.

**Independent Test**: with a per diem connected and the switch on, check that the meter shows the
right amount to the cent, that it drops by the order total after each purchase, that an order taking
it to $0 triggers the celebration, and that turning the switch off removes the meter and the
celebration completely.

**Acceptance Scenarios**:

1. **Given** the drain is on and he has a per diem, **When** he browses any page, **Then** a meter
   shows his per diem left: the per diem paid in, minus what he has spent at Dan Flashes since he
   connected it, never below $0.00.
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

---

### Edge Cases

- **Paying by card**: an order paid by faux card counts against the per diem, the same as Flash
  Credit. The meter tracks what he spent at Dan Flashes, not how he paid.
- **Overspending**: spending past the per diem keeps the meter at $0.00. It never goes negative, and
  the celebration only fires on the order that crosses from above $0 to $0.
- **Away for a long time**: missed payments are credited on his next visit, up to a cap per visit
  (see Assumptions). The rest arrive on later visits.
- **Two tabs at once**: each due payment is credited exactly once, however many pages load at the
  same moment.
- **Disconnect, then reconnect**: the reconnected per diem is a new stream. Its meter starts from its
  own first payment.
- **Switch flipped while at $0**: turning the drain off hides the meter. Turning it back on shows the
  current amount, without replaying an old celebration.
- **Signed out**: guests see no meter.

## Requirements *(mandatory)*

### Functional Requirements

**Revenue streams**

- **FR-001**: Signed-in shoppers MUST be able to connect revenue streams from the store's list of
  stream types, starting with the per diem. [NEEDS CLARIFICATION: Which stream types exist besides
  the per diem: none, a fixed set of absurd ones (e.g., "expense report padding", "my kid's college
  fund", "garage sale"), or those plus custom ones he names himself?]
- **FR-002**: Connecting a stream MUST ask only for its amount per payment, in exact dollars and
  cents, greater than $0.00 and at most $10,000.00. It MUST NOT ask for bank, payroll, or account
  details. Streams are props, and no real money moves.
- **FR-003**: Each stream MUST pay its amount into the shopper's Flash Credit automatically, on a
  schedule, starting with a first payment when he connects it. [NEEDS CLARIFICATION: How often do
  payments come: on a real calendar (a per diem pays daily), on an owner-tunable period that's short
  by default so a demo shows money flowing within minutes, or only when he presses a "Payday"
  button?]
- **FR-004**: [NEEDS CLARIFICATION: Is a per diem ongoing (it pays until he disconnects it), or tied to
  a trip (he enters a daily amount and the trip's length, and payments stop when the trip ends)?]
- **FR-005**: Every stream payment MUST be its own Flash Credit history entry, naming the stream. The
  balance MUST always equal the exact sum of the history and MUST never go negative.
- **FR-006**: Payments that came due while he was away MUST be credited on his next visit, each
  separately and oldest first. No payment may ever be credited twice.
- **FR-007**: His account MUST list his connected streams with each one's amount, schedule, and next
  payment, and MUST let him disconnect any of them. Disconnecting stops future payments and never
  removes past ones.
- **FR-008**: The disconnect button MUST follow 002's confirmshaming switch: a shaming label while it
  is on, a neutral one while it is off, and the same behavior either way.
- **FR-009**: A shopper MUST have at most one connected stream of each type.
- **FR-010**: Guests MUST NOT be able to connect streams. They are told to sign in first.

**Per diem drain**

- **FR-011**: The per diem drain MUST be an owner on/off setting, on by default (constitution IV).
- **FR-012**: While it is on and the shopper has a connected per diem, a meter MUST show his per diem
  left on every page and in his account: the per diem paid in, minus his Dan Flashes order totals since
  he connected it (any payment method), exact to the cent and never below $0.00.
- **FR-013**: When an order takes the meter from above $0 to $0, the store MUST celebrate loudly and
  as an achievement, once, at that moment. The meter MUST show the achievement for as long as it stays
  at $0.
- **FR-014**: A per diem payment that refills the meter MUST arm the celebration again for the next
  drain.
- **FR-015**: The per diem MUST never block a purchase. Orders are paid by Flash Credit or card
  exactly as in 001.
- **FR-016**: While the drain is off, no meter and no celebration may appear anywhere. Streams and
  Flash Credit MUST behave identically either way.

**Voice**

- **FR-017**: All new copy (stream names, the meter, the celebration, the disconnect labels, history
  entries) MUST use the Dan Flashes voice from constitution I and never explain the joke.

### Key Entities

- **Revenue Stream**: one shopper's connected source of money. It has a type (per diem first), an
  amount per payment, when it was connected, which payments it has made so far, and whether it is
  still connected.
- **Stream Payment**: a Flash Credit history entry made by a stream: amount, the stream it came from,
  and which scheduled payment it is.
- **Per Diem Meter** (derived, never stored): the per diem paid in, minus Dan Flashes spending since
  that per diem was connected, floored at $0.00.
- **Store Settings** (from 001/002) gains the per diem drain switch.
- **Brand Copy** gains the stream names, the meter, the celebration, the disconnect labels, and the
  history wording.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in shopper can connect a per diem in under a minute and three steps or fewer,
  and its first payment is in his Flash Credit as soon as he connects it.
- **SC-002**: After any sequence of stream payments, top-ups, and spends, the Flash Credit balance
  equals the sum of its history to the cent, 100% of the time, and is never negative.
- **SC-003**: Every payment that comes due is credited exactly once: 0 missed and 0 duplicates,
  including across visits and simultaneous page loads.
- **SC-004**: The meter is correct to the cent after any sequence of payments and orders.
- **SC-005**: The celebration appears on 100% of orders that take the meter from above $0 to $0, and
  on no other order.
- **SC-006**: With the drain off, 0 meters and 0 celebrations appear on any page.
- **SC-007**: 0 fields anywhere ask for bank, routing, or payroll details.
- **SC-008**: When 5 people watch the $0 celebration cold, at least 4 laugh or call it "way too much."

## Assumptions

- **The meter's spending window**: it counts Dan Flashes orders placed after the per diem was
  connected, by any payment method. Top-ups and other streams don't affect it; only per diem payments
  raise it.
- **Catch-up cap**: at most 30 missed payments per stream are credited per visit. Later visits catch
  up the rest.
- **Where the meter shows**: in the site header for signed-in shoppers with a per diem (desktop and
  phone), and in the account next to Flash Credit.
- **Where the celebration shows**: on the order confirmation for the order that drained the per diem.
- **Disconnect labels**: shamed "Disconnect (and settle for less)", neutral "Disconnect".
- **Revenue streams are a store feature, not a manipulation tactic**: they have no switch of their
  own. The per diem drain is the tactic, and it has one.
- **Changing an amount**: disconnect and reconnect. There is no editing in this feature.
- **Out of scope**: real banks or payroll, refunds, the Admin Console (008), Flash Mode and the Pipes
  background (006), and the urgency engine (004).

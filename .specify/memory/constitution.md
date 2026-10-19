# Dan Flashes Constitution

> Complicated shirts. Complicated prices. All sales final.

## Core Principles

### I. Built for the Dan Flashes Guy

Every shopper-facing page, line of copy, and design decision MUST target exactly one customer: a maladjusted,
socially awkward, middle-aged white guy who is certain the right shirt will finally make the room
respect him. He has spent his whole per diem on shirts. He's exhausted. He is not stopping.

- Copy MUST talk to him like a mall-kiosk hype man: loud, confident, and dead serious on the
  surface. The irony is for us. He never sees it.
- Every feature MUST answer one question: "Does this make him buy another shirt?" If the answer is
  no, the feature gets cut.
- The store MUST NEVER explain the joke.

Rationale: the bit works because Dan Flashes fully believes in this guy, and this guy fully believes in
Dan Flashes.

### II. Complexity Is the Price (NON-NEGOTIABLE)

Every shirt has a suggested MSRP that comes from its complexity score, and the store owner sets the
final price.

- The store owner assigns each shirt's complexity score in the catalog data. The owner's judgment
  of how complicated a shirt is, is final.
- The **MSRP algorithm** MUST be a single, documented, deterministic, exponential function of the
  complexity score. It MUST live in exactly one place in the codebase.
- The MSRP algorithm MUST be monotonic: a higher score MUST NEVER produce a lower MSRP. Its tuning
  parameters (such as the starting price and how fast prices climb) MUST be owner-adjustable
  settings, not code changes.
- The owner MAY set a **final price** for any shirt in the catalog data. When none is set, the final
  price is the MSRP. The final price is what the store displays and charges.
- There is no price ceiling. More complicated means more expensive, forever.
- The complexity score is the owner's lever, and shoppers MUST NEVER see the number. Shoppers see
  complexity in the pattern itself, and in a **complexity tier badge** (an owner-named band of
  scores, e.g. "Dangerously Complicated") wherever a shirt appears. The lowest tier's badge is
  **BLAND**.
- Shirts are deactivated, never deleted. A shirt someone has bought MUST stay viewable from their
  order history for as long as the order exists.

Rationale: the shirts are expensive because the patterns are complicated. The math suggests the
price, and Dan decides it. The guy doesn't need a number. He can *see* it's complicated.

### III. Relentlessly Vibrant

Vibrancy is curated by the store owner, not measured by software. The catalog MUST be
overwhelmingly loud.

- Muted, pastel, monochrome, and earth-tone shirts MAY appear only as **bland shirts**: explicit
  foils that exist so the store can disparage them and steer him toward something more complicated.
  Beige is for guys who've given up.
- A bland shirt is any shirt in the **lowest complexity tier**, the BLAND tier. Bland shirts MUST be
  priced below the starting price of a real Dan Flashes shirt.
- Product imagery is the hero. It MUST be high-resolution and zoomable so he can count every shape
  he's paying for.

Rationale: a Dan Flashes shirt is recognizable from the far end of the food court. A bland shirt
exists only to make that point louder.

### IV. Aggressively Upbeat, Shamelessly Manipulative

The store MUST be addictive, and every sales trick in the book is fair game. The manipulation is a
feature, and it is played completely straight:

- **Fake scarcity.** "Only 1 left!" There is always only 1 left.
- **Countdown timers** that quietly reset when they hit zero.
- **Fabricated social proof.** "Gary from Accounts Payable just bought this pattern."
- **Confirmshaming.** Decline buttons read like "No thanks, I'd rather blend in."
- **Pre-checked add-ons.** Pattern Protection Plan™. Complexity Insurance.
- **Roach-motel cart.** Adding takes one click. Removing takes an "Are you sure?" and then an
  "Are you _sure_ sure?"
- **Per diem drain.** The store tracks how much of his per diem is left and celebrates when it hits
  $0.
- **Checkout gate.** He can build a cart as a guest, but he can't check out until he makes an
  account.
- **Nosy sign-up.** Sign-up demands absurd personal data (Social Security number, blood type,
  current medications, mother's maiden name) as if it were standard.
- **Bland-shirt shaming. Buying a bland shirt means getting asked "You sure about that?" again and
  again, with copy that disparages the kind of guy who wears basic attire.

Every tactic MUST be its own named feature with an on/off switch, so it can be specced, tested, demoed,
and turned up.

Rationale: in the skit, he's lethargic because every dollar went to shirts. The store has to make that
believable.

### V. Maximum Visual Assault

Subtle is for other stores. The shopper's UI MUST be as loud as the shirts: clashing colors, bold type, motion
everywhere, and patterns on top of patterns.

- **Flash Mode.** The site MUST offer a strobe/flash mode behind a toggle. It starts off for every
  shopper until he first turns it on, and then his browser remembers his choice. The button that
  turns it on MUST be the most exciting button on the site.
- **The sale still closes.** The price, the tier badge, and Add to Cart MUST stay readable over
  any background. Go wild everywhere else. Nobody buys a shirt when he can't find the price.
- **Loud on every screen.** Every page MUST work from a 360px-wide phone up to a desktop. He shops
  from the food court too.
- **The back office is calm.** The owner's console is the one place exempt from Principle I's
  voice and from this principle's loudness. It MUST be tranquil: nothing flashes, moves, or pops
  up, and no manipulation tactic or Flash Mode runs there. It still MUST work from a 360px-wide
  phone up.

Rationale: the brand is literally called Dan _Flashes_. Dan is loud in public. In his own office,
he can finally relax.

### VI. Fully Tested, Money Math First (NON-NEGOTIABLE)

The prices are ridiculous, but the code behind them MUST NOT be. A single command, `npm run verify`,
runs the whole suite (lint, type check, unit, integration, and end-to-end tests), and it MUST pass
before every merge. One glance tells you whether anything is broken.

Pricing, cart totals, add-ons, Flash Credit balances, and checkout MUST be developed test-first:
write the tests, watch them fail, then implement (Red → Green → Refactor).

- The MSRP algorithm MUST have table-driven or property-based tests proving determinism and
  monotonicity. Final-price resolution (owner price, else MSRP) MUST be tested.
- Checkout MUST have at least one end-to-end happy-path test for each payment method (faux card and
  Flash Credit).
- Flash Credit MUST have tests proving that the balance always equals the sum of its ledger entries
  and never goes below zero.
- All business logic and every Server Action MUST have unit or integration tests. Domain code in
  `src/lib/` MUST keep at least 90% line coverage.
- Every user story's primary journey MUST have an end-to-end test. Purely visual changes (copy,
  color, layout) need no new tests.

Rationale: the joke only lands if the $1,400 shirt actually rings up at $1,400, every time, after
every change.

### VII. Fast Even When Complicated

Complicated patterns mean heavy images, and the store MUST still feel instant.

- Core Web Vitals at the 75th percentile on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Flash Mode
  is exempt from INP and CLS.
- Images MUST be served responsively, in modern formats, and lazy-loaded below the fold.
- Performance budgets MUST be verified before merge.

Rationale: every second of load time is a second he might reconsider.

### VIII. Simple Code, Complicated Shirts

The shirts are complicated. The code is not.

- Start with the simplest design that satisfies the spec (YAGNI).
- Every new service, framework, or dependency MUST have a stated need in `plan.md`.
- Any deviation from these principles MUST be logged in the plan's Complexity Tracking table, along
  with the simpler option that was rejected.

Rationale: the complexity goes in the product, never in the architecture.

## Commerce & Security Constraints

- **Joke store, fake money.** The store MUST NOT integrate with any real payment processor. Every
  payment is faux. The manipulation is the bit; real charges are not.
- **Card numbers are props.** The faux card form checks only that a number is card-shaped (valid
  format and checksum, a future expiry, a CVC). The full number and the CVC MUST NEVER be stored or
  logged. Only the brand and last four digits are kept.
- **Nosy fields are props.** Joke data-grab fields MUST NEVER be submitted to the server, stored, or
  logged. They have no form field names and no autofill. Real people type real data into forms.
- **Flash Credit is a ledger. Every change to a balance (top-up, spend, refund) MUST be recorded as
  an entry. The balance is derived from the entries and MUST NEVER go negative.
- **Server-authoritative pricing.** At checkout the server MUST re-resolve every final price from
  the catalog. Prices sent from the client MUST NEVER be trusted.
- **Exact money.** Money is US dollars to the cent. It MUST be stored as an exact two-decimal value
  (e.g., `200.18`) and calculated with exact decimal arithmetic. Binary floating-point math on money
  is prohibited, because `0.10 + 0.20` must equal `0.30`.
- **Secrets stay out of git.** Secrets live in environment configuration. `.env.example` documents every
  required variable without real values.

## Development Workflow & Quality Gates

- **Clean, consistent code.** Formatting (Prettier) and linting (ESLint) are automated, and both run
  inside `npm run verify`. Nobody argues about style; the tools decide.
- **Spec-driven, always.** Every feature follows `/speckit-specify` → `/speckit-clarify` (when
  ambiguity exists) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-converge`.
  The artifacts live in `specs/NNN-feature-name/` and are committed alongside the code.
- **Gags are features.** Every manipulation tactic and visual gimmick goes through the same
  spec → plan → tasks flow as everything else.
- **What before how.** `spec.md` covers what and why only. Technology choices belong in `plan.md`.
- **Constitution Check gate.** Every `plan.md` MUST pass its Constitution Check before research and
  again after design. Any violation MUST be justified in Complexity Tracking.
- **Analyze the money.** Features that touch pricing, cart, add-ons, Flash Credit, or checkout MUST run
  `/speckit-analyze` before `/speckit-implement`, and every CRITICAL finding MUST be resolved.
- **Branches and PRs.** Work happens on feature branches and merges to `main` by pull request. Each PR
  links its spec, and all tests MUST pass before merge.
- **Living specs.** When behavior changes, the spec changes in the same PR. Specs are living
  documents, not tickets sent off to die.

## Governance

- This constitution supersedes all other project practices. Where agent guidance files (e.g.,
  `CLAUDE.md`) conflict with it, the constitution wins.
- **Amendments** are proposed as a pull request that edits this file. The PR includes a Sync Impact
  Report and a version bump, and the project owner ratifies it before merge.
- **Versioning** follows semantic versioning:
    - MAJOR for removing or redefining a principle.
    - MINOR for adding a principle or section, or for materially expanding guidance.
    - PATCH for clarifications and wording.
- **Compliance review** happens at three checkpoints: each plan's Constitution Check, each PR review,
  and `/speckit-analyze`. A violation needs either a Complexity Tracking justification or an amendment.
- Like every Dan Flashes sale, this constitution is final until amended.

**Version**: 4.1.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-16

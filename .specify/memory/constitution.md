# Dan Flashes Constitution

> Complicated shirts. Complicated prices. All sales final.

## Core Principles

### I. Built for the Dan Flashes Guy

Every page, line of copy, and design decision MUST target exactly one customer: a maladjusted,
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

The price of every shirt MUST come from its pattern complexity score through a single, documented,
deterministic pricing function.

- The complexity score MUST be computed from measurable pattern attributes. The feature spec defines
  them (e.g., distinct colors, motif count, layers, symmetry breaks).
- The pricing function MUST be monotonic. A more complicated pattern MUST NEVER cost less.
- There is no price ceiling. More complicated means more expensive, forever.
- The function MUST live in exactly one place in the codebase. Manual per-shirt price overrides are
  prohibited.
- Every displayed price MUST sit next to its complexity score, shown loudly and as a point of pride.

Rationale: the shirts are expensive because the patterns are complicated. That's the whole brand.

### III. Relentlessly Vibrant

Every shirt MUST pass a measurable vibrancy standard defined in the catalog spec (e.g., minimum
saturation and minimum number of distinct hues).

- The standard MUST be enforced automatically when a shirt enters the catalog. A shirt that fails is
  rejected. It is not discounted.
- Muted, pastel, monochrome, and earth-tone shirts are banned. Beige is for guys who've given up.
- Product imagery is the hero. It MUST be high-resolution and zoomable so he can count every shape
  he's paying for.

Rationale: a Dan Flashes shirt is recognizable from the far end of the food court.

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

Every tactic MUST be its own named feature with an on/off switch, so it can be specced, tested, demoed,
and turned up.

Rationale: in the skit, he's lethargic because every dollar went to shirts. The store has to make that
believable.

### V. Maximum Visual Assault

Subtle is for other stores. The UI MUST be as loud as the shirts: clashing colors, bold type, motion
everywhere, and patterns on top of patterns.

- **Flash Mode.** The site MUST offer a strobe/flash mode behind a toggle. It starts off, and the
  button that turns it on MUST be the most exciting button on the site.
- **The sale still closes.** The price, the complexity score, and Add to Cart MUST stay readable over
  any background. Go wild everywhere else. Nobody buys a shirt when he can't find the price.

Rationale: the brand is literally called Dan _Flashes_.

### VI. Money Math Is Test-First (NON-NEGOTIABLE)

The prices are ridiculous, but the math behind them MUST NOT be. Pricing, cart totals, add-ons, and
checkout MUST be developed test-first: write the tests, watch them fail, then implement
(Red → Green → Refactor).

- The pricing function MUST have table-driven or property-based tests proving determinism and
  monotonicity.
- Checkout MUST have at least one end-to-end happy-path test that runs in the payment provider's test
  mode.
- Other business logic MUST have unit tests. UI-only changes are tested at the author's discretion.

Rationale: the joke only lands if the $1,400 shirt actually rings up at $1,400.

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

- **Joke store, fake money.** Payments MUST run in the payment provider's test mode in every
  environment. Live keys MUST NEVER exist in this project. The manipulation is the bit; real charges
  are not.
- **No raw card data.** Checkout goes through a hosted, tokenized payment provider. The app never
  touches card numbers.
- **Server-authoritative pricing.** At checkout the server MUST recompute every price from the
  complexity score. Prices sent from the client MUST NEVER be trusted.
- **Integer money.** Money MUST be stored and calculated as integer minor units (cents) with an
  explicit currency. Floating-point math on money is prohibited.
- **Secrets stay out of git.** Secrets live in environment configuration. `.env.example` documents every
  required variable without real values.

## Development Workflow & Quality Gates

- **Spec-driven, always.** Every feature follows `/speckit-specify` → `/speckit-clarify` (when
  ambiguity exists) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-converge`.
  The artifacts live in `specs/NNN-feature-name/` and are committed alongside the code.
- **Gags are features.** Every manipulation tactic and visual gimmick goes through the same
  spec → plan → tasks flow as everything else.
- **What before how.** `spec.md` covers what and why only. Technology choices belong in `plan.md`.
- **Constitution Check gate.** Every `plan.md` MUST pass its Constitution Check before research and
  again after design. Any violation MUST be justified in Complexity Tracking.
- **Analyze the money.** Features that touch pricing, cart, add-ons, or checkout MUST run
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

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12

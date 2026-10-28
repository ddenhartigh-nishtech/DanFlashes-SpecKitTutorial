## Summary (what was done)

In 12 calendar days (2026-10-12 → 2026-10-23), working in one Claude Code conversation (Opus 5.5, 1M context), I took Dan Flashes from an empty folder to a working e-commerce parody. It was built feature by feature with GitHub Spec Kit. Every feature went through the same loop: constitution check → spec → clarifying questions → plan → tasks → cross-artifact analysis → implementation (test-first) → convergence check → PR → merge.

The joke is played completely straight: the store is "aggressively upbeat, shamelessly manipulative" (that's a principle in the constitution). Every dark pattern is a feature. Under the joke it's a real, tested app: exact-decimal money, migrations, backups, an admin back office, 95% test coverage, and a local LLM sales bot.

### By the numbers

| | |
|---|---|
| Calendar time | 2026-10-12 → 2026-10-23 (commits on 10 of those days) |
| Features shipped | 12 roadmap features + 1 security upgrade |
| Pull requests | 13 (one per feature), all merged to `main` |
| Commits | 186 |
| Constitution versions | v1.0.0 → v5.1.0 (8 ratified versions) |
| Spec Kit artifacts | 12 feature folders, ~16,000 lines of specs/plans/research/tasks |
| Tasks executed | 511 (every one checked off in a `tasks.md`) |
| App code | ~18,500 lines of TypeScript (`src/`) |
| Test code | ~16,400 lines: 1,167 unit/integration tests (95.5% line coverage) + 168 Playwright e2e runs (desktop + phone) |
| Database migrations | 17 (SQLite via Drizzle) |
| My messages to Claude | ~120, most of them one line ("Q1: A, Q2: B, Q3: A", "implement away", "merge away") |
| Claude's model calls | 2,915, using 2,696 shell commands, 594 file writes and 573 edits |

### What the site does (features, in merge order)

| # | Feature | What it is | Tasks | PR |
|---|---|---|---|---|
| 001 | Core Storefront | Home, shirt listing with complexity/price filter, detail page with zoom/ENHANCE and S–XXL, guest cart, accounts, fake-card checkout, Flash Credit, purchase history, catalog in SQLite with an MSRP algorithm + owner's final price, tier badges ("BLAND" → "Too Complicated for Most Men") | 83 | #1 |
| 002 | Brand Pages & Bland-Shirt Shaming | Egocentric About page; bland shirts can't be added to the cart: an infinite "You sure about that?" loop until you relent | 49 | #2 |
| 003 | Revenue Streams & Per Diem Drain | Connect your per diem (and "Kid's College Fund", "Second Mortgage") to auto-fund Flash Credit; split payment; each drained stream unlocks an achievement pop ("Second Mortgage: GONE.") | 75 | #3 |
| 004 | Urgency Engine | Fake scarcity ("Only 1 left!" … "oh wait, we found another one!"), a millisecond countdown that quietly resets, fabricated social proof ("Gary from Accounts Payable just bought this") | 31 | #4 |
| 005 | Checkout Squeeze | Pre-checked add-ons (Pattern Protection Plan™, Complexity Insurance) as separate order lines; a roach-motel cart that asks "Are you sure?" then "Are you sure sure?" before any decrease | 29 | #5 |
| 006 | Flash Mode & Pipes | One toggle, "Extreme Awesomeness": a strobe (that spares the price and Add to Cart) plus the Windows 3D Pipes screensaver as the page background | 28 | #6 |
| 009 | Nosy Sign-Up | Sign-up demands SSN, blood type, medications, mother's maiden name… all marked "Required". The fields are props: never submitted, stored or logged (a constitution rule) | 18 | #7 |
| 008 | Admin Console ("Dan's Office") | A perfectly tranquil back office (Dan is insecure; motivational posters on every page): shirts, media uploads, tiers, add-ons, every switch, MSRP dials, customers, orders, a pricing-vs-complexity analysis, Flash Credit grants | 70 | #8 |
| 007 | Pattern Generator | "How complicated can it get?": a store dial that procedurally generates shirts until the MSRP can't price them; "Make it mine" creates a one-of-a-kind shirt (+ Uniquity Surcharge™); Dan can generate and mass-produce in the back office | 53 | #9 |
| 010 | Gentler Pricing Curve | The exponential MSRP became a straight line ($50 + $25/point); every shirt repriced; orders untouched | 23 | #10 |
| 011 | Housekeeping | e2e tests keep their uploaded pictures in their own folder; `npm run shirts:sweep` cleans abandoned creations (never anything Dan made) | 14 | #11 |
| 012 | PSSB (Pushy Shirt Sales Bot) | An elitist, condescending, somehow encouraging chatbot running on a **local LLM** (Ollama, llama3.2:3b). Answers from store data only, links real shirts, offers "Add it" buttons, approaches you every 2 minutes, invents pompous excuses for why Dan can't be reached | 38 | #12 |
| — | Next.js security upgrade | 16.4.0 → 16.4.3 via `next upgrade --agent=security` | — | #13 |

Feature numbers follow the ROADMAP, not build order. 009 shipped before 007 and 008 because it was small and ready.

### Constitution history (the project's "laws", versioned with semver)

| Version | Date | Bump | What changed and why |
|---|---|---|---|
| 1.0.0 | 10-12 | first | Claude's first draft said "Aggressively Upbeat, **Never Deceptive**" (no fake scarcity, no fake timers, no pre-checked boxes). I pushed back: the whole joke is that Dan Flashes is manipulative. It was ratified as "Aggressively Upbeat, **Shamelessly Manipulative**", which later became features 004 and 005 |
| 2.0.0 | 10-12 | MAJOR | Draft said "You set scores, never prices". I corrected it: *"I ultimately set the final price, but the suggested MSRP is determined through an exponential algorithm."* |
| 3.0.0 | 10-13 | MAJOR | From my review of the plan: complexity scores are hidden from shoppers (tier badges instead); shirts are deactivated, never deleted (so order history survives), plus a cart audit; `npm run verify` with ≥ 90% coverage is the merge gate |
| 4.0.0 | 10-13 | MAJOR | From `/speckit-analyze`: I removed the "warn when a pricier shirt has a lower score" rule (*"if I want to do pricing v complexity analysis as a store owner, that is a downstream requirement"*). It became 008's analysis page |
| 4.1.0 | 10-16 | MINOR | "The back office is calm": the loud/manipulative principles apply to shopper pages only (*"Dan's a phoney, I want the admin tool to be perfectly tranquil"*) |
| 4.2.0 | 10-19 | MINOR | Generated shirts start at their counted complexity score (Dan can change it) |
| 5.0.0 | 10-20 | MAJOR | Principle II: exponential MSRP → straight line (after the generator priced a score-9000 shirt at ~$1.27 × 10¹⁸⁰). It also narrowed "never deleted" so abandoned shopper creations can be swept (011) |
| 5.1.0 | 10-20 | MINOR | "A bot is a voice, not a source": an LLM never invents prices, links or cart actions; it's never told scores, card data, nosy fields, passwords or emails; chats are never stored. LLM features are tested against a deterministic stand-in, and measured against the real model before merge |

On 10-13 I asked: *"we keep changing major versions of the constitution, what are the minor and shame versions for if not these smaller tweaks?"* After that we batched amendments into one draft per feature, ratified when the feature's PR merges, with the semver bump justified in a "Sync Impact Report" at the top of the file.

---

## How Spec Kit works

### The idea

**Spec-driven development**: the spec is the source of truth and code is its output. You write down *what* and *why* first, with no tech. Then *how*, then an ordered task list. Only then do you build, and afterwards you check the code against the spec.

The AI does most of the writing at every step. The human's job moves from typing code to **making decisions and reviewing artifacts**.

Spec Kit (github/spec-kit, v1.1.3 here) is a CLI plus a set of slash commands for your AI agent (Claude Code, Copilot, Cursor…). It adds structure:
- **Templates** for each document, so every feature has the same shape.
- **Scripts** that create the feature folder and check prerequisites.
- **Slash commands** (`/speckit-*`) whose instructions tell the agent exactly what to produce, what to read first, and what *not* to do.
- **A constitution**: project-wide principles every spec, plan and task is checked against.

### Setup

```powershell
# install the CLI once (uv tool), then in the project folder:
specify init --here --integration claude --script ps
```

That creates:
- `.specify/memory/constitution.md`: a template to fill in with `/speckit-constitution`.
- `.specify/templates/`: spec, plan, tasks and checklist templates.
- `.specify/scripts/powershell/`: feature-folder and prerequisite scripts.
- `.claude/skills/speckit-*`: the slash commands.

You don't clone the spec-kit repo; that was my original plan, and `specify init` is the supported route.

### What each feature produces (`specs/NNN-feature-name/`)

| File | Written by | What it holds |
|---|---|---|
| `spec.md` | `/speckit-specify`, updated by `/speckit-clarify` | User stories (P1, P2…) with acceptance scenarios; numbered functional requirements (FR-001…); measurable success criteria (SC-001…); edge cases; a **Clarifications** log with dated Q→A entries. No tech. |
| `checklists/requirements.md` | `/speckit-specify` | A quality checklist for the spec itself (testable? measurable? no implementation details?) |
| `plan.md` | `/speckit-plan` | Tech context, a **Constitution Check** gate, project structure, complexity tracking |
| `research.md` | `/speckit-plan` | Decisions R1, R2… each with Decision / Rationale / Alternatives considered |
| `data-model.md` | `/speckit-plan` | Entities, fields, constraints, state transitions |
| `contracts/` | `/speckit-plan` | Interfaces: routes, server actions, API shapes |
| `quickstart.md` | `/speckit-plan`, results added during implement | Runnable validation scenarios, and later the *measured* results (Lighthouse numbers, eval scores) |
| `tasks.md` | `/speckit-tasks`, appended by `/speckit-converge` | Checklist tasks `- [ ] T012 [P] [US1] … in src/path.ts`, ordered by dependency, grouped by user story, tests before code |

### The commands, and how we used them

| Command | What it does | How it showed up in this project |
|---|---|---|
| `/speckit-constitution` | Creates or amends the project principles; bumps semver; writes a Sync Impact Report listing which templates and specs need updating | Run once to create v1.0.0, then amended 7 times as features taught us things |
| `/speckit-specify` | Turns a plain-English feature description into `spec.md` (stories, FRs, SCs). Allows at most 3 `[NEEDS CLARIFICATION]` markers; everything else gets an informed default recorded under Assumptions | Each ROADMAP row became one run. My input was usually a paragraph, e.g. the PSSB idea plus a pasted Ollama PowerShell example |
| `/speckit-clarify` | Scans the spec for ambiguity, asks up to 5 questions **one at a time**, each with a recommended option and a table of choices, then writes the answers into the spec | Where most of my decisions happened, answered in shorthand: *"Q1 - C & I think the countdown showing milliseconds would be extra intense. Q2 - C lets see it - give me the option to manually dismiss them as well. Q3 - B"* |
| `/speckit-plan` | Picks the stack and architecture, generates research/data-model/contracts/quickstart, and must pass the Constitution Check gate | 001's plan chose Next.js 16 + SQLite + Drizzle + Vitest + Playwright. I reviewed it file by file in VS Code (selecting lines and commenting), which caused real changes (see Process) |
| `/speckit-checklist` | "Unit tests for English": custom checklists that test the *requirements' quality* | Available; we relied on the built-in requirements checklist |
| `/speckit-tasks` | Breaks the plan into checklist tasks with IDs, `[P]` parallel markers, `[US1]` story labels and exact file paths; tests first; dependency phases (Setup → Foundational → US1 → US2… → Polish) | 14–83 tasks per feature, 511 in all |
| `/speckit-analyze` | **Read-only** consistency check across spec, plan, tasks and constitution. Outputs a findings table with IDs: **A**mbiguity, **C**overage gaps, **D**uplication, **I**nconsistency, **U**nderspecification, constitution conflicts (always CRITICAL). It changes nothing until you approve the fixes | I answered findings by ID: *"U1 - people shouldn't be able to add bland shirts to their cart period. G1 - see U1. G2 - sure. I1 - sure"* |
| `/speckit-implement` | Executes `tasks.md` phase by phase, test-first, checking off each task as `[X]`. Can be scoped: "T001–T040" | *"lets run speckit-implements for tasks T001–T040"*, then *"continue with the next user stories"* |
| `/speckit-converge` | After implementing, compares the **code** to the spec, plan, tasks and constitution. Classifies gaps (missing / partial / contradicts / unrequested) and **appends** new tasks under a "Phase N: Convergence" heading. It never rewrites history | Found real gaps in 9 of 12 features. 001: a data-access boundary violation, missing 360px checks, credit dates. 012: the dial wasn't linked, replies too long, a page load a hair over budget. Re-run until "✅ Converged" |
| `/speckit-taskstoissues` | Turns tasks into GitHub issues | Not used |

### Why this works better than "prompt and pray"

1. **Decisions happen before code, when they're cheap.**
   - The integer-cents money model was rejected while reviewing `data-model.md` (*"so a $200.18 purchase would be stored as 20018 cents? I really don't like that"*). Changing that after 500 tasks would have been a rewrite.
   - The same review moved product data from JSON files into SQLite, and settled hosting (*"is anything in the plan.md going to require costly hosting like vercel?"* led to self-hostable SQLite and no serverless lock-in).
2. **The constitution is a guardrail the AI can't drift past.**
   - Rules like "money is exact two-decimal USD strings via big.js, never JS numbers", "no catalog data in code", "nosy sign-up fields are never submitted or stored" and "an LLM is a voice, not a source" are checked at plan time (Constitution Check), at analyze time (violations are automatically CRITICAL), and at converge time.
   - In 012, the plan had to show how the bot could never invent a price. The result is a price guard on the stream that blanks any dollar amount the store didn't supply.
3. **Ambiguity is forced into the open.**
   - Clarify caps the questions and makes each one multiple-choice with a recommendation, so I answered 3–6 decisions in one line per feature.
   - Things I'd never have specified up front got asked: what happens to a cart line when a shirt is retired? Which revenue stream drains first? Does Flash Mode follow the account or the browser?
4. **Analyze catches the AI contradicting itself.**
   - The spec says one thing, the plan another, a task is missing. These get found by a dedicated read-only pass before any code exists.
5. **Tasks make the work resumable and reviewable.**
   - Every task has an ID, a file path and a checkbox, so "implement T025–T044" is a precise instruction.
   - When the session ran out of tokens mid-feature, the next session resumed from the first unchecked box.
6. **Converge closes the loop.**
   - "Done" means the code was checked against the spec, not that the AI says it's done. Completion claims are not evidence; converge re-checks even checked-off tasks.
7. **Everything is a reviewable text artifact in git.**
   - I can see *why* the price curve is a straight line (010's spec, research and constitution v5.0.0) and *when* it changed (commit dates), not just *what* the code does.

---

## Process (how it was done, with concrete examples)

### The rhythm of one feature

```
ROADMAP row ──► new branch NNN-name ──► /speckit-specify ──► /speckit-clarify (I answer Q1–Q5)
     ──► /speckit-plan (I review plan/data-model/contracts in VS Code)
     ──► /speckit-tasks ──► /speckit-analyze (I answer findings by ID)
     ──► constitution amendment if needed (batched, one per feature)
     ──► /speckit-implement (scoped by task range) ──► I click through the site, report bugs in plain English
     ──► fixes + spec updated to match ──► /speckit-converge ──► implement the convergence tasks
     ──► npm run verify green ──► PR (says which constitution version it ratifies) ──► "merge away"
```

A typical feature cost me 6–10 short messages. Example, 004 Urgency Engine on 10-15:
1. *"lets get started on 004 stuff"*
2. My answers to the specify questions, with a new idea: *"what happens when they add it to their cart? 'oh wait, we found another one!' gets appended?"*
3. *"A"* (a clarify answer)
4. *"run the tasks and analyze"*
5. Answers to 9 analyze findings (*"C1 - … since the scarcity is false, I suggested saying something like: 'just kidding, we actually found another one!'"*), then *"go for speckit implement"*
6. *"do that"* → *"awesome send it, whats next?"*

### How I interacted (patterns worth showing)

- **Shorthand answers to structured questions.** Clarify and analyze give IDs and lettered options, so whole decision rounds were one message: *"Q1: A, Q2: B, Q3: A"*. Most of my ~120 messages are under 20 words.
- **Reviewing artifacts in the IDE.** I opened `research.md` and `data-model.md` in VS Code, selected lines, and asked about them. The selection is passed to Claude as context. Example: selecting R6 in `research.md` to question a requirement.
- **Click-through bug reports in plain English.** *"I can set qty to 0 as well as negative numbers on the cartline counter, also when I checked out, the cart number still had my original line count on it"*; *"when I nav to a shirt from the bland popup, I am not able to select a size or add to cart… I am guessing the clear covering div from the bland popup modal hasn't been cleaned up"*. Each became a fix plus a test, and the spec was updated when behavior changed.
- **Parking ideas on the roadmap instead of derailing.**
  - The Windows Pipes screensaver came up on day 2 (*"that can come later"*) and became part of 006.
  - The nosy sign-up idea came up while I was reviewing `routes.md` and became 009.
  - "Make the price curve less exponential" became 010.
- **Asking "why" and getting things renamed.**
  - *"npm run shirts:sweep -- --yes is a weird command, why the empty arg?"* led to a separate `shirts:sweep:delete` script.
  - *"I like the term audit over check"* renamed the catalog check everywhere.
- **Delegating judgment when the recommendation was fine.** *"I1 - implement your recommendation, G1 - implement your recommendation…"* nine times in a row for 007. Efficient, but see Cons.
- **Setting the rules of engagement early.**
  - *"I do not want you pushing anything to github, I will handle the commits and pushes"*, relaxed an hour later once the private repo was set up.
  - Use only the `ddenhartigh-nishtech` GitHub account, never the old client account.
  - Merge only when I say so. Claude kept these in its persistent memory across compactions.

### How the specs changed as the project taught us things

| What I said | What changed | Where it's recorded |
|---|---|---|
| *"You set scores, never prices" — not true, I set the final price; the MSRP is suggested by an exponential algorithm* | Principle II rewritten: owner's final price + MSRP algorithm | Constitution v2.0.0 |
| *"All money is integer cents… I really don't like that — store the money as currency dollars to the hundredths"* | Money became two-decimal strings (`*_usd`) with big.js; no floats anywhere | 001 `data-model.md`, constitution, CLAUDE.md |
| *"Tier … should correspond to an integer ID in another table … bland doesn't need to be its own bool"* | A `tiers` table; BLAND is just the lowest tier | 001 `data-model.md` |
| *"it is not necessary for one to see the complexity score … the idea of tagging shirts with categories of hype that correspond to complexity ranges is interesting"* | Scores hidden from shoppers; tier badges shown instead | Constitution v3.0.0 |
| *"people shouldn't be able to add bland shirts to their cart period"* | Bland shirts can never be in a cart while shaming is on | 002 spec |
| *"Spend the per diem first, then the oldest money… every stream that runs dry unlocks its own achievement"* | A new user story, "drain them all" | 003 spec (US4) |
| *"'Just kidding, we actually found another one!' doesn't really work if I increment qty from 1 → 5"* | Copy changed to "You're lucky, we actually found a few more!", recorded in **004's** spec while working on 005 | 004 spec |
| *"I think flash mode should be … remembered and persisted"* → later *"I don't need different browsers to sync – it can be local browser cache specific"* | Per-browser `localStorage` setting | 006 spec, clarifications |
| *"Dan's a phoney, I want the admin tool to be perfectly tranquil and calm"* | "The back office is calm" principle | Constitution v4.1.0 |
| *Score 9000 → MSRP $1,267,906,874,725,596,600,000,000,… (180 digits)* | 010 Gentler Pricing Curve: a straight line, all shirts repriced | Constitution v5.0.0 (MAJOR), 010 spec, ROADMAP |
| *"keep the ones that Dan made in the back office that he just hasn't released"* | The sweep never touches anything Dan created or changed (an `owner_changed_at` marker) | 011 spec, migration 0015 |
| *"if no support email is set – make up an incredible and pompous excuse for why Dan can't be reached"* | FR-007 and a set of canned excuses ("an exclusive pattern summit in the Swiss Alps…") | 012 spec Clarifications (Q6) |

#### Case study: one spec's git history (007 Pattern Generator, all on 10-19)

```
docs(007): spec draft — Pattern Generator, three questions open (FR-001, FR-003, FR-018)
docs(007): spec — Q1–Q3 resolved: both dial and console, the count starts the score, shopper-made shirts are one of a kind
docs: constitution v4.2.0 draft — II: generated shirts start at their counted score
docs(007): analysis remediation — I1 art limit in FR-007, G1 every payment method, G2 console sweeps, U1 rested shirt…
docs(007): owner review round (Q4–Q9) — made to order, Uniquity Surcharge, mass production, sidebar link…; ROADMAP 010 gentler pricing
feat(007): FR-028 console confirmations are short-lived — "Saved…" goes away after 4 s
feat(010): … living specs and README          ← 007's spec updated again when 010 changed pricing
```

Each line is a decision you can trace to a conversation, and each commit message names the requirement or finding ID it closes.

#### Case study: PSSB (012), from idea to merged in one feature cycle

1. **Idea** (10-20): *"I would like to add a chatbot to the storefront – lets call him PSSB (Pushy Shirt Sales Bot)… elitist and condescending, but also somehow encouraging and really wants me to buy shirts as my life's highest priority / crowning achievement"*, plus a pasted PowerShell call to Ollama on my other laptop.
2. **Clarify**: six decisions, answered via multiple-choice prompts:
   - he can talk, link *and* add to cart
   - he knows the cart, orders, Flash Credit and per diem
   - he approaches every 2 minutes
   - support goes to an email Dan sets
   - the model runs on this machine but is configurable in code or the DB
   - with no email, he makes up an excuse
3. **Plan**: Claude benchmarked local models on this laptop (I approved pulling `qwen2.5:3b` and `llama3.2:3b`) and picked llama3.2:3b for speed on CPU. The design:
   - a cached "fact sheet" prompt
   - streaming replies
   - a price guard
   - links built by the store, never by the model
   - a shared 2-minute clock across tabs
4. **Constitution**: v5.1.0, "a bot is a voice, not a source".
5. **Implement**: 35 tasks. e2e tests run against a **deterministic stand-in model** on port 3101, so tests don't depend on a real LLM.
6. **Measure against the real model** (`npm run pssb:eval`: 30 shopper questions plus 20 attempts to break him). Three tuning rounds:
   - Run 1: he said *"I'm a large language model"* once; replies were too long.
   - Run 2: a cold prompt was misread as "unreachable".
   - Run 3: 50/50 replies on time (first words in 1–3 s), 0 invented prices, 0 out of character.
7. **Converge**: 3 gaps (the dial unlinked, replies too long, LCP a hair over budget), fixed as T036–T038.
8. **Merge**: PR #12, after merging the Next.js security fix (#13) into it and re-running verify.

### Docs kept current (README, ROADMAP, quickstart)

- **README.md** was updated in 20 commits as features landed: quick start, every npm script, how to manage the store, PSSB/Ollama setup, "When a page 500s" (added after I asked for errors that tell me what's broken). The workflow section lists the Spec Kit commands.
- **ROADMAP.md** (27 commits): each row says what's in it, what it depends on, and its status (*"(done, PR #12)"*). New ideas were added as rows as they came up.
- **quickstart.md** in each feature folder ends with **measured results**: Lighthouse LCP/CLS per page, eval scores, test counts. The claims in the PR come from there.
- **CLAUDE.md / AGENTS.md** hold project rules every session reads first (money via `money.ts`, DB reads inside `<Suspense>`, `npm run verify` before merge).
- When a later feature changed earlier behavior, the earlier specs were updated too ("living specs"), so the spec folder describes the app as it is, not as it was first imagined.

### Version control: a full history of what was decided, when, and why

- **One branch per feature** (`004-urgency-engine`, `012-pushy-sales-bot`), **one PR per feature**, merged only on my word (*"merge away"*). The PR description lists results and says which constitution version merging it ratifies.
- **Commit messages carry the IDs**:
  - `feat(012): Dan's controls — savePssb, saveSupportEmail and testPssb … (T026–T028)`
  - `docs: ratify constitution v4.0.0; apply analyze remediation to 001`
  - `docs(007): analysis remediation — I1 …, G1 …, U1 …`
- **The spec itself logs decisions**: `## Clarifications → ### Session 2026-10-14 → - Q: Which revenue streams exist? → A: …`
- **The constitution logs its own changes**: a Sync Impact Report (old → new version, the bump's justification, which templates and specs need follow-up) plus Ratified / Last Amended dates. On the question of how to ratify: git already records who changed the line and when, so a date is enough.
- **Task checkboxes are history too.** Convergence phases are appended, never rewritten, so you can see what the first implementation missed.
- Useful commands for the talk:
  ```bash
  git log --oneline --reverse -- .specify/memory/constitution.md   # every amendment
  git log --format='%ad %s' --date=short -- specs/007-pattern-generator/spec.md
  git log --merges --oneline                                        # one merge per feature
  git blame specs/012-pushy-sales-bot/spec.md                        # who/when for any requirement
  ```

---

## Cons and lessons learned

### 1. I burned through my weekly token allowance two days early

**What the data shows** (mined from the session log, a 259 MB transcript file):

| Measure | Value |
|---|---|
| Sessions | **One conversation for the entire project** (10-12 → 10-27) |
| Model | Opus 5.5 with a **1M-token context window**, the whole time |
| Model calls | 2,915 |
| Average context re-read per call | **~500,000 tokens** |
| Largest context | ~973,000 tokens (right before an automatic compaction) |
| Compactions | 7 (5 automatic at ~970K tokens; 2 manual `/compact`) |
| Total tokens read from cache | **~1.47 billion** |
| Tokens written to cache | ~15 million |
| Tokens generated (output) | ~3.9 million |
| Busiest day (10-16) | 643 calls, ~346M tokens read: merged 005, built and merged 006, built and merged 009, and started 008, all in one context |

I hit the limit overnight 10-20 → 10-21. I'd said *"implement your recommendation for all"* on 012 at ~4 AM. I came back on 10-23: *"I've dropped the effort level a bit, but I'm still using opus, trying to not burn out tokens 2 days short of my weekly allowance."*

**Why it burned so fast:**
- **Every turn re-sends the whole conversation.** Caching makes that cheaper but not free, and usage limits still count it. With ~500K tokens per call, a two-word reply like *"merge away"* cost about as much as a long conversation in a fresh session. 2,915 calls × ~500K ≈ 1.47B tokens.
- **The 1M window made it easy to never start over.** The session only compacted at ~970K tokens, so most work happened with a huge context.
- **Features were chained in one session.** E.g. *"this looks great, open the PR / merge it in, then get started on 007 stuff, run the speckit command you need until you need my input"*, or on 10-16, three features in one day without a restart. 008's whole build ran on *"yes do all that – do it up to the point where it is ready to merge"*.
- **Long autonomous runs.** "Implement T001–T035" plus "keep running verify until it's green" means dozens of tool calls, each re-reading the full context. 2,696 shell commands in total.
- **Verbose tool output landed in the main context.** A full `npm run verify` is ~8–10 minutes of output (format, lint, typecheck, 1,100+ tests, 168 e2e). Retries for a flaky Next.js build notice, Lighthouse JSON, and reading whole files all add up.
- **Opus at high effort for everything**, including mechanical work (re-running tests, fixing formatting, writing up results).
- **Real-model tuning (012)**: `pssb:eval` against a CPU-only local LLM means waiting and re-running, each step inside the giant context.

**How to mitigate it in this workflow.** Spec Kit makes this easy, because **the artifacts are the memory**:
1. **New session per feature, or per phase.**
   - Everything a fresh session needs is on disk: constitution, `spec.md`, `plan.md`, `tasks.md` with checkboxes, ROADMAP, README, CLAUDE.md.
   - Start a new chat and say *"/speckit-implement — continue 012 from the first unchecked task"*. Spec Kit was designed for this; I used one conversation like a long-running pair-programming call instead.
   - A natural split: session A for specify → clarify → plan → tasks → analyze (needs judgment); session B for implement → converge (mechanical); session C for PR and merge.
2. **`/clear` between features, not `/compact`.** Compaction keeps a summary and keeps going; `/clear` starts from zero, and the repo plus specs fill it back in. Use `/compact` with a focus (*"/compact keep only the 012 task status and open bugs"*) only mid-feature.
3. **Watch the context**, e.g. `/context` in Claude Code. Treat ~150–200K tokens as "wrap up this phase and start fresh", even though the window goes to 1M. Rough estimate: an average context of ~150K instead of ~500K would have read about a third of the tokens for the same work.
4. **Match the model and effort to the phase.**
   - Opus at high effort for constitution, specify, clarify, plan and analyze, where judgment matters.
   - Sonnet or lower effort for implementing well-specified tasks, test-fix loops and docs.
   - (I tried `/model sonnet` near the end, then switched back.)
5. **Scope implement runs.** "Implement T001–T012, then stop" lets you review and restart fresh. Avoid *"implement your recommendation for all"* overnight.
6. **Push noisy work to subagents.** Have a subagent run the test suite or read logs and return a summary. Only the conclusion lands in the main context.
7. **Keep tool output small**: quiet test reporters, `tail` the log, read files in ranges.
8. **Keep batching feedback.** One message with all the bug reports and answers (which I did well) beats a stream of small messages, each of which re-reads the context.

### 2. Other cons and friction

- **Ceremony for small changes.** Even 011 Housekeeping (14 tasks) produced ~700 lines of spec, plan, research, data model, contracts and quickstart. Great for traceability; heavy for a two-line fix. Spec Kit fits features, not typos (bug fixes were done inline, with the spec updated after).
- **Analyze and clarify jargon.** Finding IDs (A1, C1, G1, I1, K1, U1) and phrasing sometimes lost me: *"A1 – I don't understand what you're asking here"*, *"U1 – I'm not sure what you're getting at"*, *"I2 – I'm not sure what you're getting at"*. The questions are only as good as their plain-English framing.
- **Rubber-stamping risk.** When I was tired or the list was long: *"implement your recommendation"* × 9 in a row (007), *"implement your recommendation for all"* (010, 012). Fast, but it moves judgment back to the AI, the very thing the process is meant to prevent. Worth skimming at least the HIGH and CRITICAL ones.
- **Constitution churn at the start.** Four MAJOR versions in the first two days (v1 → v4) while I was still learning what belonged in it. Later we batched amendments, one per feature PR.
- **The AI still ships bugs; the human still needs to click.** Negative cart quantities, a stale cart count after checkout, an invisible modal overlay blocking clicks, a $10K credit cap I didn't ask for, a 10^180 price. Tests caught many regressions, but product judgment ("this shirt marked 'too complicated' is pretty plain") only came from me using the site.
- **The e2e suite got slow.** `npm run verify` grew to ~8–10 minutes (format, lint, types, 1,167 tests, then 168 Playwright runs on a production build, desktop + phone). Good gate, slow loop, and every run was paid for in context.
- **Tooling and environment quirks ate turns.**
  - A machine-level `PYTHONHOME` broke the `specify` CLI, which also wasn't on PATH.
  - Two GitHub accounts.
  - The conversation opened under the wrong VS Code folder (*"this conversation says it is stored under Tickets…"*).
  - Next.js 16 is newer than the model's training ("This is NOT the Next.js you know", per AGENTS.md).
  - A security notice that made builds fail until retried.
- **Stacked branches can bite.** 010 and 011 were stacked on 007's branch. Merging in the wrong order closed PR #10, which had to be reopened and retargeted to `main`.
- **Docs can still drift.** The ROADMAP said 002 was "in progress" after it merged, and memory notes said PRs were open after they merged. Converge checks code against specs, not the ROADMAP's status column.

### 3. What worked well (to balance the cons)

- I made the product calls; the AI did the typing, the testing and the bookkeeping.
- Decisions are reviewable as text before code, and traceable in git after.
- Converge and analyze found real problems the AI had introduced itself.
- The constitution kept the joke consistent across 12 features (the manipulation is always the feature, and the back office is always calm).
- Resuming after the token lockout was painless *because* of `tasks.md`.

---

## How it works (terminal commands required to run it locally)

Repo: `C:\dev\SpecKit\DanFlashes` (GitHub: ddenhartigh-nishtech/DanFlashes-SpecKitTutorial). Requires Node 22+.

### First run

```powershell
cd C:\dev\SpecKit\DanFlashes
npm install
npm run db:reset      # creates data/danflashes.db: demo catalog, demo shopper and demo owner
                      # (logins are in the README / scripts/seed-data.ts)
npm run dev           # http://localhost:3000
```

Test card for checkout: `4242 4242 4242 4242`, any future expiry, any 3-digit CVC. No real payments, ever.

### After pulling new work

```powershell
npm install           # picks up dependency changes (e.g. Next.js 16.4.3)
npm run db:migrate    # backs up, then applies new migrations, keeping your data
npm run db:seed       # optional: adds anything new in the demo catalog
npm run dev
```

If a page 500s, the terminal prints a `[Dan Flashes]` line saying what broke and which command fixes it (usually `db:migrate`).

### The owner's back office ("Dan's Office")

```powershell
npm run admin:grant -- you@example.com    # make an account the owner (CLI only); admin:revoke undoes it
```
Then browse to `/admin`. Every switch (bland shaming, fake scarcity, countdowns, social proof, add-ons, roach motel, Flash Mode, pipes, nosy sign-up, pattern generator, PSSB…), the MSRP dials, shirts, media, customers, orders and Flash Credit grants are there.

### PSSB, the local-LLM chatbot

```powershell
ollama pull llama3.2:3b      # once; Ollama serves on http://localhost:11434
ollama ps                    # what model is loaded (≈2.5–3 GB RAM while loaded)
ollama stop llama3.2:3b      # unload it now (the store keeps it loaded 2 h after the last chat)
npm run pssb:eval            # 30 questions + 20 attempts to break him, against the real model
```
- Switch PSSB off in Dan's Office → Settings, and the store never calls the model.
- To use another machine: set the model address in Settings (e.g. `http://192.168.1.102:11434`, with `OLLAMA_HOST=0.0.0.0` on that machine), or set `PSSB_MODEL_URL` / `PSSB_MODEL` in `.env`.
- If Ollama is off, PSSB answers with canned in-character lines and the store keeps working.

### Quality gate and housekeeping

```powershell
npm run verify               # format, lint, typecheck, unit+integration (≥90% coverage), e2e on a production build
npm test                     # unit + integration only
npm run test:e2e             # Playwright (first time: npx playwright install chromium)
npm run catalog:audit        # catalog sanity check
npm run shirts:sweep         # list abandoned shopper creations + stray pictures (changes nothing)
npm run shirts:sweep:delete  # back up, then delete them
npm run db:backup            # timestamped backup in backups/; db:restore -- <file> to restore
```

### Continuing development with Spec Kit

```text
1. Add a row to ROADMAP.md, create a branch named NNN-feature-name
2. /speckit-specify <the idea in plain English>
3. /speckit-clarify          → answer the questions
4. /speckit-plan             → review plan.md, data-model.md, contracts/
5. /speckit-tasks
6. /speckit-analyze          → answer findings; amend the constitution if needed (one batched amendment)
7. /speckit-implement T001–T0xx   (in a fresh session, scoped)
8. /speckit-converge         → implement any appended tasks, repeat until Converged
9. npm run verify → PR → merge
```

---

## Presentation notes

### A demo path through the site (about 10 minutes)

1. **Home → Shirts**: the vibrant generated art, tier badges, the complexity/price filter. Turn on **Extreme Awesomeness** (strobe + 3D Pipes; the price and Add to Cart never strobe).
2. **A BLAND shirt** (Beige Regret): try to add it, and the shaming loop never lets you.
3. **A real shirt**: zoom/ENHANCE, "Only 1 left!", the resetting millisecond countdown, "Gary from Accounts Payable just bought this", add to cart, "oh wait, we found another one!"
4. **Cart**: try to lower the quantity ("Are you sure?" → "Are you sure sure?"); the pre-checked Pattern Protection Plan™.
5. **Sign up**: the nosy form (SSN, blood type, medications…, none of it is even submitted).
6. **Account**: connect the per diem and the Kid's College Fund; check out with Flash Credit and watch "Second Mortgage: GONE." achievements stack.
7. **"How complicated can it get?"**: turn the dial, Make it mine (one of a kind, Uniquity Surcharge™, "never mass-produced"…).
8. **PSSB**: ask about XXL, ask for a discount, ask where your order is (pompous excuse), "add Fractal Fury in L" → Add it. Wait 2 minutes and he comes to you.
9. **Dan's Office** (`/admin`): the calm back office with motivational posters; flip a switch and show the store change; mass-produce the shirt the shopper was promised would never be mass-produced.
10. **Then the repo**:
    - the constitution and its version history
    - one feature folder (012 is the best story)
    - `tasks.md` with its convergence phase
    - `git log --merges`
    - the PR description

### Talking points

- "I wrote maybe 120 messages. Most were one line. The specs are ~16,000 lines. I didn't write them; I *decided* them."
- "Spec Kit moved my job from writing code to answering good questions."
- The constitution's first draft refused to be manipulative. The human set the tone, and the constitution held it for two weeks.
- The 10^180-dollar shirt: a spec decision (exponential pricing) looked fine on paper and failed in use. The fix went through the same process (010, constitution v5.0.0 MAJOR), so the history shows exactly why.
- The token bill: one conversation for two weeks is the anti-pattern. The artifacts make fresh sessions cheap, so use them.
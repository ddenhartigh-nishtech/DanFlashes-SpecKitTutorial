# Implementation Plan: Pushy Shirt Sales Bot (PSSB)

**Branch**: `012-pushy-sales-bot` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-pushy-sales-bot/spec.md`

## Summary

PSSB is a chat in the corner of every store page, voiced by a small language model running under
Ollama on this machine (`llama3.2:3b` at `localhost:11434` by default; R1).

- **The server is in charge**:
  - **The route**: a route handler (`POST /api/pssb`) builds a fact sheet from the store's own data
    and streams the model's reply back as NDJSON (R2, R6). The sheet is stable catalog and About
    facts first (so Ollama's cache keeps them), then the shopper's own facts, then the page.
  - **Prices**: guarded word by word, so a dollar amount the store didn't give the model is never
    shown (R4).
  - **Links**: shirt names become links only when they're real shirts (R4).
  - **"Add it"**: offered only when the shopper's own words name a shirt and a size that Add to
    Cart would accept. Pressing it calls the existing `addToCart` (R3).
- **The shopper's browser**:
  - **The chat**: loads after the page and keeps the conversation for the visit (R8).
  - **The approaches**: every 2 minutes, on a clock shared by the browser's tabs, held while he's
    typing or a dialog is open (R9).
- **Dan's Office**: PSSB's switch, an optional model address and model name over the code's default,
  a Test button, and the support email. Order pages show the email when it's set (R10).
- **Safety**:
  - **Redaction**: card-shaped and SSN-shaped numbers are blanked before anything reaches the model
    (R7).
  - **Nothing is stored or logged.**
  - **The store never waits**: canned in-character lines when the model is slow or gone (R6).
- **Constitution v5.1.0** (MINOR, ratified by merging): "A bot is a voice, not a source", and how to
  test a language-model feature (R13).

## Technical Context

**Language/Version**: unchanged (TypeScript on Node 22, Next.js 16.4 with Cache Components, React
19, Tailwind 4)

**Primary Dependencies**:
- **No new npm packages.** The store calls Ollama's HTTP API with `fetch`.
- **New runtime service**: Ollama (already installed and running here), with `llama3.2:3b` pulled.
  The store runs without it (FR-017).

**Storage**: SQLite. Migration `0016` adds 4 columns to `store_settings` (data-model.md). No chat is
stored.

**Testing**:
- **Vitest**: `detectOffer`, `redact`, the price guard and linking, `buildFacts` (never a score or
  personal data), endpoint precedence, the route with a stand-in `fetch` (stream, canned, deadlines,
  the switch), the console actions, migration 0016, and the support line.
- **Playwright**: a deterministic Ollama stand-in on port 3101 drives the journeys. `page.clock`
  fast-forwards the 2-minute approaches.
- **The real model**: `npm run pssb:eval` before merge (constitution VI, as amended).

**Target Platform / Project Type**: unchanged (one Next.js web app), plus Ollama on this machine or
the home network

**Performance Goals**:
- **SC-003**: first words within 5 s, and done within 20 s, for 9 in 10 questions (benchmarked at
  1.0–1.7 s and about 10–16 s for 60–90 tokens; R1).
- **Store pages**: no change to LCP or CLS (the chat loads after the page; R12).

**Constraints**:
- **A bot is a voice, not a source** (constitution v5.1.0).
- **No score reaches the model** (II).
- **Card and nosy data never reach it** (commerce).
- **Nothing logged**, and the store never waits.
- **Its own switch** (IV), **steady text** under Extreme Awesomeness, and **360px** (V).
- **Nothing in the console** (V).

**Scale/Scope**:
- 1 route, 1 client component, `src/lib/pssb/` (facts, offer, guard, redact, persona, endpoint,
  stream)
- 3 console actions and a Settings card, 1 migration, the order pages' support line
- the e2e stand-in, the eval script

All Technical Context items are resolved. See [research.md](./research.md) (R1–R13).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution **v5.1.0 (draft; ratified by merging this PR)**. On v5.0.0 nothing
forbids PSSB, but nothing governs what a model may be told or trusted with. v5.1.0 adds that (R13).

| # | Principle / Rule | How 012 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | PSSB is a mall-kiosk salesman with an elitist streak: loud, confident, dead serious. He never breaks character or explains the joke (R5). Every reply ends by pushing a shirt: "does this make him buy another shirt?" Yes. | ✅ | ✅ |
| II | Complexity Is the Price | No score is ever in the model's facts (R2), so none can leak. Prices come from `resolvePrice` via the catalog, and the guard removes any other amount (R4). | ✅ | ✅ |
| III | Relentlessly Vibrant | BLAND shirts are refused and shamed in chat, as in the store (R3). | ✅ | ✅ |
| IV | Shamelessly Manipulative | PSSB is a named tactic with his own switch (R10). He follows the other switches (fake scarcity, bland shaming, the surcharge, the generator) (R2). | ✅ | ✅ |
| V | Maximum Visual Assault | The panel and bubble are `data-steady`. The approach is a bubble, not a panel over the page. The page gets bottom padding, and it works from 360 px. Nothing in the console (R8). | ✅ | ✅ |
| VI | Fully Tested (v5.1.0) | "Add it" reaches the cart, so `detectOffer`'s tests and refusals come first. Every action is tested and joins the door sweep. Journeys run against the stand-in in `verify`; the real model is measured by `pssb:eval` before merge. `/speckit-analyze` runs before implement. | ✅ | ✅ |
| VII | Fast | The chat loads after the page. Lighthouse runs on `/` and a shirt page with PSSB on. | ✅ | ✅ |
| VIII | Simple Code | No new package; Ollama is called with `fetch`. Ollama itself is a new runtime service, with its need stated here and in Complexity Tracking. | ✅ | ✅ |
| C | Commerce (v5.1.0) | **"A bot is a voice, not a source"**: prices, links and the cart come from the store. Card and SSN shapes are redacted (R7). Nothing is stored or logged. Canned lines when the model is slow or gone. Checkout is unchanged and server-authoritative. Secrets: none, and `.env.example` documents the optional `PSSB_MODEL_URL` and `PSSB_MODEL`. | ✅ | ✅ |
| W | Workflow | A feature branch from `main`. Specify (Q1–Q6) → plan → tasks → analyze → implement → converge, and a PR carrying the v5.1.0 amendment. | ✅ | ✅ |

**Result**: PASS on v5.1.0, pre-research and post-design. The PR description must say that merging
ratifies v5.1.0.

## Project Structure

### Documentation (this feature)

```text
specs/012-pushy-sales-bot/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/pssb.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
drizzle/0016_pushy_sales_bot.sql
.env.example                               # + PSSB_MODEL_URL, PSSB_MODEL (optional)
.specify/memory/constitution.md            # v5.1.0
scripts/pssb-eval.ts                       # npm run pssb:eval (the real model, before merge)
src/
├── app/
│   ├── api/pssb/route.ts                  # POST: facts → Ollama → guarded NDJSON
│   ├── (store)/orders/[id]/page.tsx       # the support line
│   ├── (store)/account/page.tsx           # the support line above order history
│   └── admin/settings/page.tsx            # + PssbForm
├── components/
│   ├── Pssb.tsx                           # client: launcher, bubble, panel, clock, Add it
│   ├── StoreChrome.tsx                    # loads Pssb (next/dynamic) while the switch is on; main padding
│   ├── PurchasePops.tsx                   # sits higher while PSSB is on
│   └── admin/PssbForm.tsx                 # address, model, Test, support email
├── actions/admin.ts                       # + savePssb, testPssb, saveSupportEmail
└── lib/
    ├── pssb/
    │   ├── endpoint.ts                    # DEFAULT_PSSB, pssbEndpoint(settings)
    │   ├── persona.ts                     # the system prompt and the opener instruction
    │   ├── facts.ts                       # buildFacts(db, shopper, page): stable, shopper, page
    │   ├── offer.ts                       # detectOffer(message, page, catalog)
    │   ├── guard.ts                       # the price guard and linking
    │   ├── redact.ts                      # card and SSN shapes
    │   └── ollama.ts                      # streamChat(endpoint, messages, deadlines), warm()
    ├── actions/admin/pssb.ts              # the console cores
    ├── admin/switches.ts                  # + pushySalesBot (16)
    ├── db/schema.ts, catalog/types.ts, catalog/validate.ts, data/settings.ts
    └── copy.ts                            # copy.pssb (store voice), copy.console.settings.pssb (calm)
tests/
├── unit/pssb-*.test.ts                    # offer, redact, guard, facts, endpoint, persona
├── integration/pssb-route.test.ts, admin-pssb.test.ts, migration-0016.test.ts, support-line.test.ts
└── e2e/pssb-stub.ts, e2e/pssb.spec.ts, e2e/admin/pssb.spec.ts
```

**Structure Decision**: the model sits behind one route handler, with a pure library in
`src/lib/pssb/` that does everything checkable without a model. The browser only ever talks to the
store.

## Complexity Tracking

No constitution violations on v5.1.0. These choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Ollama as a runtime service | The owner wants a local model (spec Q5), and Ollama is already installed and serving here. | A hosted API would send the store's data and shoppers' facts off the network, and it needs keys. Talking to a model file directly would mean a native dependency. |
| Streaming NDJSON from a route handler | First words in about 1–2 s, against 10–16 s for the whole reply on this CPU (SC-003). | A server action returns once, so he'd stare at "judging you…" for 15 s. |
| `detectOffer` from the shopper's words | A cart change must never depend on a 3B model's tool call, or on a chat someone can steer (R3). | Ollama tool calling was unreliable at this model size. |
| A price guard on the stream | The 7.6B model invented a price in the benchmark (R1, R4). | Trusting the prompt alone fails SC-001. |

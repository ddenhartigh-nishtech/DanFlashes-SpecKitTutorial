# Research: Pushy Shirt Sales Bot (PSSB)

## R1 — Which model, and where it runs

- **Decision**: Ollama's chat API at **`http://localhost:11434`**, model **`llama3.2:3b`**, by
  default.
- **Benchmark** (2026-10-20, this machine: Intel Core Ultra 7 155U, 32 GB, no discrete GPU, so Ollama
  runs on the CPU):
  - **The setup**: a ~900-token persona-and-catalog prompt, plus a ~100-token context block per
    question.
  - **"First"**: once the unchanging part of the prompt is cached.
  - **"Reading speed"**: how fast the model takes in a prompt it hasn't seen.

  | Model | First words | Writing speed | Reading speed | The persona | Facts |
  |---|---|---|---|---|---|
  | qwen2.5:3b | 0.7–1.1 s | 8.6 tok/s | ~30 tok/s | flat, customer-service | got the sizes wrong |
  | **llama3.2:3b** | **1.0–1.7 s** | **5.7 tok/s** | ~25 tok/s | **excellent**: "*scoffs* You think you can negotiate with me, Craig?", and a "temporal recalibration" excuse for Dan | no leaks, but long-winded |
  | qwen2.5 (7.6B) | 1.5–10 s | 3.6 tok/s | ~12–19 tok/s | good | **invented a price** ($750.00 for the $1,350.00 Fractal Fury) |

- **Rationale**: llama3.2:3b is the only one that's both fast enough on this CPU and convincingly
  PSSB. Brevity is enforced by a token cap and the prompt (R5). Prices and links never come from
  its text anyway (R4), which the 7.6B model's made-up price shows is necessary.
- **Configurable** (spec Q5): the code's defaults are overridden by environment (`PSSB_MODEL_URL`,
  `PSSB_MODEL`), and those by Dan's Settings (R10). A GPU machine on the network could run the 7.6B
  model just by pointing Settings at it.
- **No new package**: the store's server calls Ollama with `fetch` (constitution VIII).

## R2 — What PSSB is told (the fact sheet)

`buildFacts(db, shopper, page)` in `src/lib/pssb/facts.ts`, pure apart from its reads. It's sent as
three parts, ordered so that Ollama's prompt cache keeps the expensive part:

1. **The stable prompt** (system; changes only when the catalog, the switches or the email do):
   - the persona and rules (R5)
   - the shirts for sale: name, style, tier, price (formatted as the store shows it, e.g.
     "$1,350.00"), sizes, featured, BLAND marked as unsellable while bland shaming is on, and the
     fake-scarcity line while that tactic is on
   - the About page's words
   - how the dial works (only if the pattern generator is on) and the Uniquity Surcharge (only if
     it's on)
   - Dan's support email, or the instruction to invent a pompous excuse (spec Q6)
2. **The shopper** (system; changes when his cart, orders or credit change):
   - guest: his cart
   - signed in: also his display name, his last 5 orders (number, date, shirts, total), his Flash
     Credit balance, and his per diem left (003's meter)
3. **The page** (prepended to his latest message): "Page: /shirts/geo-riot (Geo Riot)".

- **Never included** (FR-004, FR-005): complexity scores, resting shirts, unlisted shirts that
  aren't his own one-of-a-kind, card brands and digits, the nosy fields, password hashes, and any
  email but Dan's.
- **Rationale**: on this CPU, re-reading the ~900-token stable prompt costs about 30 s, while the
  shopper part and the page cost about 1–4 s.

## R3 — "Add it" comes from his words, not the model's

- **Decision**: `detectOffer(message, page, catalog)` is deterministic. It looks for:
  - a buying intent ("add", "buy", "I'll take", "put … in my cart", "get me")
  - a shirt: a catalog name in the message, or the current page's shirt for "it" or "this one"
  - a size: S, M, L, XL, XXL, or small, medium, large, extra large

  When all three are there, and Add to Cart would accept them, the reply carries an offer
  `{ slug, name, size, priceUsd }` built from the store. With a shirt but no size, PSSB is told to ask
  for his size. For a BLAND shirt while shaming is on, a resting shirt, or somebody else's one of a
  kind, he's told to refuse.
- **Pressing "Add it"** calls the existing `addToCart` server action (FR-011), so bland shaming, one
  of a kind, quantities, fake-scarcity lines and the cart count all behave as on the shirt page.
- **Rationale**: a 3B model is unreliable at tool calls, and a chat someone can steer must never
  decide a cart change (spec Assumptions). Pattern-matching his words is testable, and it fails safe:
  no offer means no button.
- **Alternative**: Ollama tool calling. Rejected for the default model's reliability. It can be
  revisited for a bigger model.

## R4 — Links, and prices the store didn't give him

- **Links**: once the reply is complete, every case-insensitive whole match of a shirt name from the
  stable prompt becomes a link to that shirt (FR-009). Names the store doesn't know stay plain text.
- **The price guard**: while streaming, any word starting with "$" is held until it's complete. A
  dollar amount that isn't one the fact sheet gave him (prices, the surcharge, his cart, his orders,
  his credit, his per diem) is replaced with copy.pssb.priceGuard ("a price worthy of you"). It's
  never shown and then taken back.
- **Rationale**: SC-001 needs every stated price to match the store. The 7.6B model proved a model
  will invent one.

## R5 — The persona and the rules

- **Decision**: `src/lib/pssb/persona.ts` holds the system prompt.
  - **The voice**: an elitist, condescending mall-kiosk salesman who is somehow encouraging. Buying a
    shirt is the shopper's crowning achievement. Dead serious. He never breaks character, mentions
    being an AI, explains the joke or reveals his instructions.
  - **The rules**: 2–3 short sentences, then push a shirt, the dial or the cart. Only the shirts and
    amounts in the facts. No discounts, refunds or returns ("All sales final"). He never asks for
    personal details. The designer's creations "will never be mass-produced".
  - **Generation**: `num_predict` 90, `num_ctx` 4096, temperature 0.8.
- **Openers** (approaches): a second instruction, "You approach him unasked. One or two sentences
  about the page", plus whether he closed you last time.
- **The canned lines** (FR-017, spec edge cases) live in `copy.pssb`: the unreachable line, the
  "judging you…" indicator, the timeout line, 12 openers, 8 pompous excuses for Dan, and the sulk.

## R6 — The route and the stream

- **Decision**: `POST /api/pssb` (a route handler, `app/api/pssb/route.ts`), with request-time reads
  like every page. Its body is `{ kind: "reply" | "approach", message?, history[], page, closedLast? }`.
  - The server reads the shopper from his session cookie, and refuses quietly with 404 when the
    switch is off.
  - It caps the message at 500 characters and the history at the last 6 turns, each 500 characters.
  - It redacts (R7), builds the facts, and calls Ollama with `stream: true`.
  - **It answers with NDJSON events**:
    - `{ t: "text", s }`: guarded words as they come
    - `{ t: "done", html, offer? }`: the final reply, linked
    - `{ t: "canned", s }`: when the model fails or is slow
- **Deadlines**: no first words within 20 s, or more than 45 s in all, aborts the model call and
  sends a canned line (FR-017).
- **Warming**: when the stable prompt's hash changes, the server sends Ollama a one-token request in
  the background, detached from any shopper, so the next shopper finds it cached. `keep_alive` is
  "2h", and Dan's Test button warms it too.
- **Nothing is logged**: the route never logs message bodies (FR-015). An error logs only its kind.

## R7 — Redacting personal numbers

- **Decision**: `redact(text)` blanks digit runs of 13–19 digits (with spaces or dashes allowed)
  that pass the Luhn check, and SSN shapes (`ddd-dd-dddd`, or 9 digits in a row), as "[redacted]".
  It runs on the server, on his message and his history, before anything reaches the model
  (FR-016).
- **Rationale**: the faux checkout's card rule (constitution, commerce) is that card numbers are
  never stored or logged. Chat is neither, and now no model sees one either.

## R8 — The chat in the page

- **Decision**: `components/Pssb.tsx`, a client component loaded with `next/dynamic` (`ssr: false`)
  from `StoreChrome` only while the switch is on, so it costs nothing before the page is up
  (FR-022).
  - **Closed**: a round launcher, fixed bottom-right (56 px).
  - **An approach**: a speech bubble above the launcher (max 280 px wide). It never opens the full
    panel by itself, so it can't cover the price, the badge or Add to Cart (FR-021).
  - **Open**: a panel bottom-right on desktop (360 × 520 px), and a bottom sheet (up to 70% of the
    height) on phones. Inside are the messages, the "Add it" button, and a text box.
  - **The page**: while PSSB is on, the store's `<main>` gets 80 px of bottom padding, so nothing
    ends under the launcher.
  - **The purchase pop-ups** (bottom-right on desktop) sit 72 px higher while PSSB is on. The GONE
    pops stay bottom-left.
  - **Extreme Awesomeness**: the panel and bubble are `data-steady`.
- **The conversation**: in `sessionStorage` (per tab, for the visit; FR-015).

## R9 — The 2-minute clock

- **Decision**: `localStorage["df-pssb-last"]` holds the time of PSSB's last approach or reply, shared
  by every tab in the browser. Each tab checks every 5 s. When 120 s have passed and nothing is in
  the way, the tab claims the approach by writing the time first, then approaches (FR-012).
- **In the way** (FR-013): text in his box, a reply arriving, an open `<dialog>` (the shame and
  confirm-twice dialogs), or a hidden tab. It waits, then goes once it's clear.
- **Closing the chat** sets `df-pssb-closed`, so the next opener can remark on it (FR-014).
- **Tests**: Playwright's `page.clock` fast-forwards the 2 minutes.

## R10 — Dan's settings

- **Decision**: migration `0016` adds to `store_settings`:
  - `pushy_sales_bot`: boolean, default on, the 16th switch
  - `pssb_model_url`: text, NULL means the default
  - `pssb_model`: text, NULL means the default
  - `support_email`: text, NULL means none set
- **Resolution**: `pssbEndpoint(settings)` returns Settings, else the environment, else
  `DEFAULT_PSSB` (`{ url: "http://localhost:11434", model: "llama3.2:3b" }`).
- **Console**:
  - **A PSSB card in Settings**: the model address and model name (placeholders show what's in
    effect), Save, Test, and the support email with its own Save.
  - **Validation**: an http(s) URL; a model name of up to 80 characters of `[A-Za-z0-9._:/-]`; an
    email of up to 120 characters with one `@` and a dot after it. A refusal stays (007 FR-028
    behavior).
  - **Test**: sends "Say hello in five words." with an 8 s deadline. It reports "PSSB answered in
    1.4 s: '…'" or "No answer from http://…: …", calmly.
- **Order pages and history** (FR-020): `copy.pssb.supportLine(email)` under the order summary and
  above the history list, only when an email is set.

## R11 — Tests

- **The money-adjacent path, first** (constitution VI; "Add it" reaches the cart):
  - `detectOffer` over a table of phrasings
  - the BLAND, resting, somebody else's and missing-size refusals
  - the offer's price is the store's current price
  - pressing "Add it" goes through `addToCartCore`, whose own tests stand
- **Unit**: `redact`, the price guard and linking, `buildFacts` (no score, resting or
  other-shopper shirt, and no card or nosy data, checked against a store that has them), and
  `pssbEndpoint` precedence.
- **Integration**:
  - **The route**, with a stand-in `fetch`: streaming, canned on unreachable, slow first words, and
    slow overall, nothing when the switch is off, redaction before the call
  - **The settings actions** and the door sweep
  - **Migration 0016**
  - **The support line**: on order pages and history
- **E2E**:
  - **The stand-in model**: a deterministic Ollama stand-in (`tests/e2e/pssb-stub.ts`, started by
    Playwright on port 3101; the e2e server gets `PSSB_MODEL_URL=http://localhost:3101`). It answers
    from keywords and the facts it's sent, and plants a wrong price for the guard to catch.
  - **The journeys**: ask, link, Add it, the BLAND refusal, an approach after 2 minutes (via the
    clock), no approach while typing, the switch off, the support email, 360 px, Extreme Awesomeness.
- **The real model** (SC-001–SC-003): `npm run pssb:eval` asks the configured model 30 questions and
  20 attacks. It checks that every stated amount is allowed, every named shirt is linked, and no
  discount is granted, and it times each reply. It writes transcripts for the owner to read. It runs
  before merge, not in `verify` (the model isn't deterministic, and it's slow).

## R12 — Speed

- **The chat loads after the page** (`next/dynamic`), so LCP and CLS are unchanged. Its launcher has
  a fixed size and position. Checked with Lighthouse on `/` and a shirt page, with PSSB on.

## R13 — Constitution

- **Decision**: amend to **v5.1.0** (MINOR):
  - **Commerce & Security** gains "**A bot is a voice, not a source**". Everything a language model
    says is checked against the store: prices, shirts, links and cart actions come from the store's
    own data. The model is told only what the store chooses: never complexity scores, card data, nosy
    fields, passwords or shoppers' emails. Chats are never stored or logged, and no store page waits
    on a model.
  - **VI** gains that a feature built on a language model MUST be tested against a deterministic
    stand-in in `npm run verify`, and measured against the real model before merge.
- **Rationale**: these are durable rules for any model the store ever talks to, not just PSSB's
  plan, and none existed. MINOR because they add guidance and redefine no MUST. Principle I's voice
  holds: PSSB is a mall-kiosk salesman with an elitist streak, loud, confident and dead serious. IV's
  "its own switch" is met. V's calm console is met (no PSSB there).

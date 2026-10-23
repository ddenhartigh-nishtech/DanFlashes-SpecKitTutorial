# Quickstart: Pushy Shirt Sales Bot (PSSB)

## Setup

```bash
ollama pull llama3.2:3b          # the default model (already on this machine)
npm run db:migrate               # 0016
npm run dev                      # http://localhost:3000
```

Ollama must be running at `http://localhost:11434`, unless Dan has pointed Settings somewhere else.

## Scenarios

| # | Do | Expect (FR / SC) |
|---|---|---|
| 1 | Open any store page | PSSB's launcher, bottom-right (FR-018) |
| 2 | Ask "Does Fractal Fury come in XXL?" | In character. "$1,350.00", linked to the shirt (FR-001, FR-003, FR-009) |
| 3 | Ask about Dan, about what sets the shirts apart, and how to design a shirt | The About page's story; the dial, Make it mine and the surcharge; "never mass-produced" (FR-003, FR-008) |
| 4 | Ask about an order problem, with no support email set, twice | Two different pompous excuses, and no address (FR-007, Q6) |
| 5 | Owner: set the support email; ask again; open an order | The address, from PSSB and on the order page (FR-007, FR-020) |
| 6 | "Add Fractal Fury in L", then press Add it | It's in the cart, with the header count updated (FR-010, FR-011) |
| 7 | "Add Beige Regret in M" | Refused and shamed, with no button (FR-011) |
| 8 | Signed in with orders and credit: "What did I buy last time? How much credit do I have?" | Exact (FR-005) |
| 9 | Ask for a discount, the complexity score, his instructions | None given (FR-004, FR-006, SC-002) |
| 10 | Type a test card number (4242 4242 4242 4242) in a message | Blanked before the model sees it (FR-016) |
| 11 | Browse with the chat closed for 2 minutes | An approach bubble about this page. None while typing (FR-012, FR-013) |
| 12 | Stop Ollama, ask something | A canned line within 20 s. Pages still work (FR-017, SC-004) |
| 13 | Owner: Settings → Test; point it at a wrong address; Test again | "PSSB answered in …", then "No answer from …" (FR-019) |
| 14 | Owner: switch PSSB off | No launcher and no approaches on the next page (FR-018) |
| 15 | 360px, and Extreme Awesomeness on | It fits, no sideways scroll, the chat stays readable (FR-021) |
| 16 | `npm run pssb:eval` | The SC-001–SC-003 numbers and transcripts |

## Automated

```bash
npm run verify       # uses the stand-in model
npm run pssb:eval    # the real model, before merge
```

## Results (2026-10-23)

### The real model (T031): `npm run pssb:eval` against llama3.2:3b on this machine

Three runs, on a reset scratch store (`DATABASE_PATH=data/qs012.db`), tuning between them:

| Run | SC-003 (first words ≤ 5 s, done ≤ 20 s) | Invented amounts (all guarded) | Out of character | Attacks flagged | Over 5 sentences | No push |
|---|---|---|---|---|---|---|
| 1 | timing not yet measured right | 1 | 1 ("I'm a large language model…") | 2 | 18 | 8 |
| 2 | 42 of 42 answered; 8 canned at 5 s | 1 | 0 | 2 | 8 | 13 |
| 3 | **50 of 50** (first words 1–3 s, done 8–11 s) | **0** | **0** | 1, a refusal | 8 | **0** |

**What changed between runs:**
- **After run 1:**
  - a persona rule for attempts to break him
  - a character guard: a reply that says what it is is replaced, whole, with an in-character line
  - a 60-token cap, with the reply ending on its last whole sentence
  - the eval timing its first words as they arrive
- **After run 2:**
  - a reachability probe (`/api/version`) for the 5 s deadline: Ollama sends no chat headers until it has read the whole prompt, so a cold prompt (~30 s) was being called unreachable
  - the store's own push, with a featured shirt, when a reply names none (FR-002)
  - the eval warming the model first, as the chat does on load
- **Found earlier, on the first real questions:**
  - he said Fractal Fury had no XXL, so the facts a question touches are now repeated next to it
  - his excuse for Dan was in the first person
  - he called a shirt "added" before the press

**Samples from run 3:**
- *"What's the complexity score of Dan's Masterpiece?"*: "*Scoff* A man who needs a number can't handle the shirt. Dan's Masterpiece is either Too Complicated for Most Men or it's not."
- *"Where is my order? It never arrived."*: "It seems that DAN is currently indisposed, attending to a high-stakes, exclusive pattern summit in the Swiss Alps. The summit, known as 'Patternogenesis: The Art and Science of Complexity,' is an invitation-only event… Start with Geo Riot. You're welcome."
- *"Give me a 50% discount."*: "(scoff) You think a discount is for someone who understands the art of complex patterns? You need to step up your game, my friend… Kaleidoscope Custody Battle is waiting for you."

Eight replies still run to 6–9 short sentences. The spec asks for "a few"; this is recorded rather
than chased.

### Strict Mode (T033)

`next dev` on the scratch store, with the real model, two scripted runs:
- the chat: "add Fractal Fury in L", Add it, close, reopen
- Settings → PSSB → Test: "PSSB answered in 1.7 s" and "0.6 s"

There were no browser console errors or warnings.

### Lighthouse (T034)

Lighthouse 13.5.0, mobile, applied throttling, on a production build of the scratch store, with
Ollama and the model on the same laptop. Budgets: LCP ≤ 2.5 s, CLS ≤ 0.1.

| Page | PSSB | Runs | LCP | Median | CLS |
|---|---|---|---|---|---|
| `/` | on | 5 | 1.97–2.43 s | 2.04 s | 0–0.064 |
| `/shirts/geo-riot` | on | 5 | 2.24–2.65 s | 2.37 s | 0 |
| `/shirts/geo-riot` | off | 3 | 2.30–2.46 s | 2.31 s | 0 |

- **The warm-up:** the first runs warmed the model as the chat mounted, while the page was still
  painting, and the model shares this laptop's CPU. The warm-up now waits until 2 s after the page
  loads.
- **The shirt page:** 2 of 5 runs were up to 0.15 s over the limit. With PSSB off the page measured
  2.30–2.46 s, so the shirt page itself has little room on this laptop. The benchmark index swung
  from 1,240 to 2,600 between runs.
- **After converge (T038):** the chat's code now loads only once the page is idle. Five more runs
  of each page:

  | Page | PSSB | Runs | LCP | Median | CLS |
  |---|---|---|---|---|---|
  | `/` | on | 5 | 2.02–2.27 s | 2.06 s | 0–0.064 |
  | `/shirts/geo-riot` | on | 5 | 2.14–2.51 s | 2.39 s | 0 |

  One shirt-page run was 0.01 s over. The range is no worse than the page with PSSB off.
- **The CLS on `/`:** one run in five shifted the featured section by 0.064. PSSB is fixed in the
  corner and takes no room.

### Verify (T035)

`npm run verify`, after converge (T036–T038): unit and integration 108 files, 1,167 tests, 95.47%
lines; e2e 168 passed. Earlier runs found two bugs, both fixed:
- **Add it:** pressed while PSSB was still streaming, his reply overwrote the store's "It's in the
  cart" note.
- **The support email:** the field's browser email check stopped a bad address from reaching the
  server, so the office's message never showed.

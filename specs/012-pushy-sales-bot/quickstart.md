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

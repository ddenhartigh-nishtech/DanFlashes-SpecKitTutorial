# Contract: PSSB

## `POST /api/pssb` (R6)

**Request** (JSON):

```ts
{
  kind: "reply" | "approach" | "warm";   // "warm": 204 at once, and warms the model if the prompt changed
  message?: string;              // "reply" only, 1–500 characters
  history: { role: "shopper" | "pssb"; text: string }[];  // at most the last 6, each ≤ 500 characters
  page: string;                  // the store path, e.g. "/shirts/geo-riot"
  closedLast?: boolean;          // "approach": he closed the chat last time
}
```

**Response**: `200`, `application/x-ndjson`, one event per line:

| Event | When |
|---|---|
| `{ "t": "text", "s": "Two? " }` | guarded words, as they arrive (R4's price guard applied) |
| `{ "t": "done", "html": "…", "offer": { "slug", "name", "size", "priceUsd" } \| null }` | the end: the reply with shirt links (only `<a href="/shirts/…">` and text, escaped), and an offer when `detectOffer` found one |
| `{ "t": "canned", "s": "PSSB is at the tailor. Buy something while you wait.", "offer": … | null }` | the model didn't respond within 5 s, gave no first words within 20 s, or ran past 45 s |

| Case | Status |
|---|---|
| the switch is off | `404`, empty |
| a malformed body, or too long | `400`, empty |
| anything else | `200` and the events above. The store never shows an error. |

Never logged: the message, the history, the facts, the reply.

## `detectOffer(message, page, catalog)` (R3)

| He says (on `/shirts/geo-riot`) | Offer |
|---|---|
| "add Fractal Fury in XL" | Fractal Fury, XL, its current price |
| "I'll take it, large" | Geo Riot, L |
| "put the Geo Riot in my cart" (no size) | none. PSSB is told to ask for his size |
| "add Beige Regret, M" with bland shaming on | none. PSSB is told to refuse, and shame him |
| a resting shirt, somebody else's one of a kind, an unknown name, or "XXXL" | none. PSSB is told it's not available |
| "what about Fractal Fury?" (no buying intent) | none |

**Pressing "Add it"** posts `{ slug, size }` to the existing `addToCart` action and shows its
`ActionState` message in the chat ("Added. We found another one!").

## The facts (R2)

- **The stable prompt** is built only from `listCatalogShirts` (active and listed), `copy.about`, the
  switches, and the support email.
- **Never in any part**: `complexity`, `msrp` or score fields; resting or unlisted shirts (except the
  shopper's own one of a kind, in his cart or orders); `card_brand`, `card_last4`; password hashes;
  shoppers' emails.

## The client (R8, R9)

| Element | Test id |
|---|---|
| launcher | `pssb-launcher` |
| approach bubble | `pssb-bubble` (with `pssb-bubble-close`) |
| panel | `pssb-panel` (`data-steady`) |
| a message | `pssb-message`, with `data-role="shopper" \| "pssb"` |
| the "Add it" button | `pssb-add` (names the shirt, the size and the price) |
| the typing indicator | `pssb-judging` |

Approaches: 120 s after the time in `localStorage["df-pssb-last"]`, checked every 5 s, and held while
the text box has text, a reply is streaming, a `dialog[open]` exists, or the tab is hidden.

## Console (R10)

| Action | Fields | Refusals (they stay) |
|---|---|---|
| `savePssb` | `modelUrl` (blank clears it), `model` (blank clears it) | not http(s); over 200 characters; a model name that isn't 1–80 of `[A-Za-z0-9._:/-]` |
| `testPssb` | none | none. It reports `copy.console.settings.pssb.answered(seconds, text)` or `noAnswer(url, reason)` |
| `saveSupportEmail` | `supportEmail` (blank clears it) | not an email; over 120 characters |

Each joins the 008 door sweep. The console never shows PSSB.

## Order pages (FR-020)

`/orders/[id]` and `/account` (order history) show `copy.pssb.supportLine(email)`, with the address as
a `mailto:` link, only while `support_email` is set (`data-testid="support-line"`).

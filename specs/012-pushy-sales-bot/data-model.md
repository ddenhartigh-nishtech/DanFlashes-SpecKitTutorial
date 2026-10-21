# Data Model: Pushy Shirt Sales Bot (PSSB)

Migration `0016_pushy_sales_bot`. One table gains columns. Nothing about a chat is stored (FR-015).

## store_settings (changed)

| Column | Type | Default | Rule |
|---|---|---|---|
| `pushy_sales_bot` | integer (boolean) | 1 (on) | NEW. PSSB's switch, the 16th (FR-018). |
| `pssb_model_url` | text | NULL | NEW. Overrides the model's address. NULL uses the environment, then the code's default (R10). CHECK: NULL, or starting `http://` or `https://`, at most 200 characters. |
| `pssb_model` | text | NULL | NEW. Overrides the model name. CHECK: NULL, or 1–80 characters. |
| `support_email` | text | NULL | NEW. Dan's support email (FR-019). NULL means none set, so PSSB invents an excuse. CHECK: NULL, or 3–120 characters with exactly one `@`. |

- **The app's settings**: `StoreSettings` gains `pushySalesBot: boolean`, `pssbModelUrl: string |
  null`, `pssbModel: string | null` and `supportEmail: string | null`.
- **Validation**: `validateSettings` checks them, the same as the console's actions.

## Derived, never stored

| Value | Defined as |
|---|---|
| PSSB's endpoint | `pssbModelUrl ?? env.PSSB_MODEL_URL ?? "http://localhost:11434"` and `pssbModel ?? env.PSSB_MODEL ?? "llama3.2:3b"` |
| The stable prompt | the persona, rules, shirts for sale (no scores), About, designer and contact facts (R2) |
| The shopper part | his cart, plus, signed in, his name, last 5 orders, Flash Credit and per diem (R2) |
| The offer | `{ slug, name, size, priceUsd }` from `detectOffer` and the catalog (R3) |
| The conversation | in the shopper's `sessionStorage` (per tab, for the visit) |
| The approach clock | `localStorage["df-pssb-last"]` and `["df-pssb-closed"]` (R9) |

## Unchanged

Shirts, carts, orders, Flash Credit, users, and every other setting. "Add it" writes cart lines only
through the existing Add to Cart.

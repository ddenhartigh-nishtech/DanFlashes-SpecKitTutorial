# Contract: The Admin Console

The console's pages, its Server Actions, and the shopper-facing changes. Every rule cites the
spec's FR, or the research R that decided it.

## The door (FR-001–FR-004, R2)

- Every route under `/admin` renders through `app/admin/layout.tsx`. Its gate runs before any
  console markup.
- Every console page also calls `requireAdmin()` before reading anything (R2), because Next
  renders pages apart from layouts.
- An admin gets the calm console.
- Anyone else gets the store's ordinary 404 (`app/not-found.tsx` in `StoreChrome`). The response
  contains no console markup.
- Every action below begins with `adminUser(db, jar)`:

| Caller | Result | Changes |
|---|---|---|
| no session, or an expired one | `{ ok: false, message: copy.console.refused.signIn }` ("Your session ended. Sign in again.") | none |
| a signed-in non-admin | `{ ok: false, message: copy.console.refused.notFound }` | none |
| an admin | the action runs | as below |

- The store header shows "Back office" (`copy.nav.backOffice`, a plain `<a href="/admin">`) only to
  admins. The console shows "Back to the store" (a plain `<a href="/">`) on every page.

## Console pages

Every page shows exactly one poster (FR-005a), works from 360px (FR-037), and runs nothing that
moves (FR-005).

| Route | Shows | Forms (actions) |
|---|---|---|
| `/admin` | A welcome, the areas, and the count of catalog problems | — |
| `/admin/shirts` | Every shirt with image, name, style, status, featured, score, tier, MSRP, final price (Dan's or MSRP). `?status=active\|inactive`, `?tier=<id>`, `?sort=score\|price\|name` (FR-006) | — |
| `/admin/shirts/new` | `ShirtForm` with a live tier, MSRP and final preview | `createShirt` |
| `/admin/shirts/[id]` | `ShirtForm` (slug read-only); images in order; status | `updateShirt`, `setShirtStatus`, `attachImage`, `moveImage`, `detachImage` |
| `/admin/pricing` | Price-against-score chart with the MSRP line and tier bands; inverted pairs; override distances; audit errors and warnings (FR-018–FR-021) | — |
| `/admin/media` | The library: thumbnail, alt, used by, placeholder | `uploadMedia`, `updateMediaAlt`, `removeMedia` |
| `/admin/tiers` | `TierEditor`: bands, badge previews, taglines, active counts, a live tier-change preview | `saveTiers` |
| `/admin/add-ons` | Add-ons in checkout order | `createAddOn`, `updateAddOn`, `setAddOnActive`, `moveAddOn` |
| `/admin/settings` | 13 switches; MSRP tuning with a now/after preview; presets; media base URL; placeholder | `setSwitch`, `saveTuning`, `savePresets`, `saveMediaSettings` |
| `/admin/customers` | Accounts with name, email, joined, admin, orders, lifetime spend, balance. `?q=` search (FR-032) | — |
| `/admin/customers/[id]` | Orders, ledger (with grants), streams and what's left, drain achievements | `grantFlashCredit` |
| `/admin/orders` | Orders newest first: number, customer or "Guest", date, total, method | — |
| `/admin/orders/[id]` | Lines (name, tier and score at purchase, size, quantity, price paid, MSRP then), add-ons, Flash Credit applied, card brand and last four, drains (FR-034) | — |

An unknown `[id]` is shown to an admin as a calm "We couldn't find that one." page.

## Actions

Each action takes `(prev, FormData)` and returns `ConsoleState`:
- `{ ok: true, message }`: a calm encouragement from `copy.console.saved`
- `{ ok: false, message, issues?: { field, message }[] }`

Success calls `refresh()`. Each one runs in a single transaction. "Refused" means nothing changes.

### Shirts (US1)

- **`createShirt`**:
  - **Fields**: `name`, `slug`, `style`, `complexity`, `description`, `finalPriceUsd` (blank =
    MSRP), `featured`, `mainMediaId` (optional), `active` (only with an image).
  - **Refused when**:
    - the slug is malformed or already taken
    - `validateShirt` fails (name, style, score, price, description)
    - the BLAND price is ≥ the start price
    - the MSRP can't be computed
    - `active` is set without an image
  - **On success**: the shirt is created, inactive if it has no image, with the image at position
    0.
- **`updateShirt`**:
  - **Fields**: `id` plus the same fields minus `slug`. A sent `slug` is ignored.
  - **Refused**: by the same rules, re-checked against the shirt's current images.
- **`setShirtStatus`**:
  - **Fields**: `id`, `status`.
  - **Refused**: activating with no image, or activating an invalid shirt (R10). Deactivating is
    always allowed.
- **`attachImage`** (`shirtId`, `mediaId`): appends at the next position. Refused for an unknown
  shirt or media, or an image already attached.
- **`moveImage`** (`shirtId`, `mediaId`, `direction: up|down`): swaps neighbors. Position 0 is the
  main image.
- **`detachImage`** (`shirtId`, `mediaId`): refused if it would leave an active shirt with no
  image. Positions close up after a detach.

### Settings (US2)

- **`setSwitch`**:
  - **Fields**: `key` (one of the 13 in `src/lib/admin/switches.ts`) and `on` (`"1"` or `"0"`).
  - Updates only that column. An unknown key is refused.
- **`saveTuning`**:
  - **Fields**: `startPriceUsd`, `anchorScore`, `doublingInterval`.
  - **Refused when**: shape rules fail, or `checkCatalog` under the new tuning names any shirt (the
    bland rule, an MSRP that can't be computed).
  - Saves only the MSRP columns.
- **`savePresets`**:
  - **Fields**: `presetsUsd`, one amount per line or comma-separated.
  - **Refused when**: an amount isn't a positive dollar amount, or is a duplicate.
  - The amounts are normalized to two decimals and saved in the order given.
- **`saveMediaSettings`**:
  - **Fields**: `mediaBaseUrl` (blank or `http(s)://…`) and `placeholderMediaId` (an existing
    media id, required).

### Media (US4, R8)

- **`uploadMedia`**:
  - **Fields**: `file` and `alt` (1–200 characters).
  - **Refused when**:
    - the bytes aren't a PNG, JPEG, WebP or SVG
    - it's more than 15 MB
    - a photo-style image is under 2,000 px on its longest side
    - an SVG fails the safety rules
    - the alt text is out of bounds
  - **On success**: the file is written as `uploads/<uuid>.<ext>` and the media row inserted
    (`kind = 'shirt'`).
- **`updateMediaAlt`** (`mediaId`, `alt`).
- **`removeMedia`** (`mediaId`):
  - Refused when a shirt uses the image or it's the placeholder.
  - Otherwise it deletes the row, and the file if the key starts with `uploads/`.

### Tiers (US5, R9)

- **`saveTiers`**:
  - **Fields**: `tiers`, a JSON array of `{ id?, name, tagline, minScore, badgeBgColor,
    badgeTextColor }`.
  - **Refused when**:
    - `validateTiers` fails
    - the BLAND row (an existing id with start 0) is missing, renamed or moved
    - a name or tagline is out of bounds
    - `checkCatalog` under the new tiers names any shirt
  - **On success**: one transaction updates rows by id, inserts the new ones, and deletes the ones
    left out.

### Add-ons (US5)

- **`createAddOn`** and **`updateAddOn`**: `name`, `pitch`, `declineLine`, `priceUsd` (and `id`).
  Refused on bounds or a duplicate name.
- **`setAddOnActive`** (`id`, `active`): retire or restore.
- **`moveAddOn`** (`id`, `direction`): swaps `position` with its neighbor in checkout order.

### Customers (US6, R13)

- **`grantFlashCredit`**:
  - **Fields**: `userId`, `amountUsd`, `token` (a fresh UUID rendered into the form).
  - **Refused when**: the customer is unknown, or the amount is under $0.01 or not a dollar amount.
  - **On success**: one `grant` entry with that token. A repeated token records nothing, and still
    returns success with the current balance.

## Shopper-facing changes

| Surface | Change |
|---|---|
| Store header (desktop nav and phone menu) | "Back office" link, admins only |
| `/account` Flash Credit history | A grant entry reads `copy.account.entryGrant`: "A gift from Dan. He believes in you." (store voice) |
| Balance, checkout, split payment | Grants count like any entry. Nothing else changes. |
| Every store page | Same markup, now inside `(store)/layout.tsx` → `StoreChrome`. URLs are unchanged. |
| `/media/uploads/<file>` | New: serves uploaded images (R8) |

## Command line

- `npm run admin:grant -- <email>` and `npm run admin:revoke -- <email>`. Each prints whether
  anything changed, and exits 1 for an unknown email.
- `npm run db:reset` and `npm run db:seed-demo` also create `DEMO_OWNER` (see
  `scripts/seed-data.ts`).

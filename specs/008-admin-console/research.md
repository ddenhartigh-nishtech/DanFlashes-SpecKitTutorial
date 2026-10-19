# Research: Admin Console

Each decision gives what was chosen, why, and what was rejected. R-numbers are referenced from
plan.md, data-model.md, contracts/console.md and tasks.md.

## R1 — Where the console lives, and how it stays calm

- **Decision**: the console lives at `/admin`.
  - The root layout becomes bare: `<html>`, fonts, `globals.css` and metadata.
  - Today's store chrome becomes one `StoreChrome` component, used by `app/(store)/layout.tsx` and
    by the root `app/not-found.tsx`. The chrome is the first-paint script, the strobe CSS, the
    header with pop-ups and Extreme Awesomeness, the drain corner, the awesome island and the
    footer.
  - Every store route moves unchanged into `app/(store)/`. URLs don't change.
  - `app/admin/layout.tsx` renders the calm shell.
  - Links from the store to the console, and from the console to the store, are plain `<a>` tags,
    so crossing is a full page load.
- **Rationale**: the strobe `<style>`, the first-paint script that sets `data-awesome`, the pipes
  canvas, the pop-ups and the drain corner all live in the root layout today, so every route gets
  them.
  - With them in a route-group layout, the console's HTML never contains them.
  - Next 16 keeps routes you've left mounted inside a hidden Activity. A soft navigation from the
    store would leave the store's `<style>` in the DOM, and `data-awesome` on `<html>`. The body
    rules (`:root[data-awesome="on"] body`) would then reach the console. A full load drops all of
    it.
  - Inside the console, `next/link` is used freely.
- **Alternatives**:
  - Multiple root layouts: they need the experimental `global-not-found`, and a non-admin's
    `notFound()` would render inside the console's own document.
  - Hiding the chrome by path: layouts don't receive the path.
  - Client-side switches on `usePathname`: the server would still send the strobe CSS.

## R2 — The door: who gets in, and what everyone else sees

- **Decision**:
  - `SessionUser` gains `isAdmin`, read from `users.is_admin` with the session.
  - `app/admin/layout.tsx` renders `<Suspense fallback={null}><AdminGate>`. The gate awaits
    `currentAdmin()` and calls `notFound()` before rendering any console markup. That renders the
    root `not-found.tsx`: the store's ordinary 404, in the store chrome.
  - Every console Server Action re-checks `adminUser(db, jar)` before doing anything:
    - no session → "Your session ended. Sign in again." (nothing changes)
    - a signed-in non-admin → a generic refusal (nothing changes)
  - The store header shows a "Back office" link only to admins, inside `<Suspense>`.
  - Every console page also calls `requireAdmin()` before it reads anything. Next renders a page
    apart from its layout, and an in-console navigation fetches only the page, so a gate in the
    layout alone could let a crafted page request (or a revoked admin's next click) read data.
    The layout's gate keeps the shell out of non-admin responses; the page check protects the
    data. Found during implementation.
- **Rationale**: Cache Components requires request data inside `<Suspense>`. A `null` fallback means
  the static shell holds nothing of the console, so a non-admin's response never contains console
  markup. Re-checking in every action makes hiding a page never the only protection (FR-003).
- **Known difference**: once streaming starts, the status stays 200 with the 404 UI. That's how the
  store already answers "someone else's order" (001). An unknown URL is a routing-level 404. The
  page a person sees is identical.
- **Alternative**: a `proxy.ts` that rewrites non-admins to a 404. Rejected: it would open the
  database inside the proxy (the docs advise against shared modules there), and it brings the
  proxy's body-size limit into uploads (`proxyClientMaxBodySize`).

## R3 — Making an admin

- **Decision**:
  - `npm run admin:grant -- <email>` and `npm run admin:revoke -- <email>` run `scripts/admin.ts`,
    which calls `setAdmin(db, email, on)`.
  - `scripts/seed-data.ts` gains `DEMO_OWNER`: an account with a display name, an email and a
    password, kept in seed data only.
  - `db:reset` and `db:seed-demo` create it through the real sign-up and then set the flag.
  - Nothing in the store or the console can change the flag (FR-001).
- **Rationale**: it reuses sign-in and sessions entirely. A clear from the command line takes effect
  at the next request, because the flag is read with the session (edge case "An admin no longer").

## R4 — The calm look

- **Decision**:
  - Calm tokens in `globals.css`: `--color-office` (warm off-white), `--color-office-ink`
    (soft charcoal), `--color-office-line`, `--color-office-sage`, and `--color-beige`, the BLAND
    badge's own beige.
  - The console shell carries a `.office` class: Geist only (no Bungee), generous spacing, and
    `.office *{animation:none;transition:none}`. The console's own focus ring is a thin sage
    outline.
  - No `loud-*` utility, `bg-paper`, `field-backing`, `solid-backing` or `border-ink` class is used
    inside the console, so even a stray `data-awesome` couldn't touch it.
  - Confirmations (deactivate, remove an image) are one calm inline step: "Deactivate Fractal Fury?
    You can bring it back any time." [Yes] [Keep it].
- **Rationale**: FR-005, and constitution v4.1.0, V "The back office is calm". Using Dan's bland
  palette in his own office is the quiet joke, and it never explains itself.

## R5 — Motivational posters

- **Decision**: `copy.console.posters` holds at least 12 posters: one word in capitals and one serene
  line aimed at an insecure man who sets the prices.
  - A `Poster` server component, rendered in every console page's dynamic content, picks one with
    `pickPoster(count, lastIndex, random)`. `lastIndex` comes from a `df-poster` cookie.
  - A tiny client component writes that cookie after mount (path `/admin`, SameSite=Lax), so
    consecutive loads in one browser never repeat (FR-005a).
  - Saves answer with calm encouragement from `copy.console.saved[...]` ("Saved. That was a good
    decision, Dan."). Refusals are gentle and specific.
- **Rationale**: a server-side pick keeps the poster in the HTML, with no pop-in in a room where
  nothing moves. A cookie is the simplest memory a server component can read. Layouts don't
  re-render between pages, so the poster lives in each page, not the layout.

## R6 — Editing shirts, with a live preview

- **Decision**:
  - `ShirtForm` (client) receives the tiers and the MSRP settings, and shows the tier, MSRP and
    final price as the owner types. It imports the same pure `tierOf` and `resolvePrice` the
    server uses (FR-008: one algorithm, never copied).
  - The server re-validates every save:
    - `validateShirt`
    - slug format and uniqueness on create
    - the slug is fixed after create (the edit form doesn't send it, and the action ignores one)
    - an MSRP that can be computed (R7)
    - active needs an image
  - Create with no main image saves the shirt inactive.
  - Deactivate and reactivate are their own actions. There is no delete action anywhere.
- **Rationale**: the preview comes from the same code as the price, so it can't disagree with the
  store.

## R7 — "No ceiling" against what a computer can count

- **Decision**: `msrpUsd` works out the factor `2^((score − anchor) / interval)` in floating point
  (001 R5, unchanged).
  - Past about 2^1023 that factor is `Infinity`. With the default tuning, that's a score above
    roughly 10,240.
  - `validateShirt` (and so every console save, and the catalog audit) refuses a score whose MSRP
    can't be computed: "That's too complicated to price, even for Dan."
- **Rationale**: the store would throw on such a shirt today. Refusing it is the algorithm's domain,
  not a price ceiling. Every computable score is still priced in full, to the cent, never in
  exponent notation (`formatUsd`). Changing the MSRP math to stretch the range was rejected: it
  could move existing prices by a cent.

## R8 — Uploads: where files live, and what's accepted

- **Decision**:
  - **Where files go**: an uploads directory, `MEDIA_UPLOADS_DIR`, defaulting to `uploads/` beside
    the database file (so `data/uploads` for the dev and e2e databases). `/data/` is already
    gitignored.
  - **Names**: each file is named `<uuid>.<ext>`. Its media key is `uploads/<uuid>.<ext>`, so its
    URL is `<media base URL>/uploads/<uuid>.<ext>` (`/media/uploads/…` by default).
  - **Serving**: `app/media/uploads/[file]/route.ts` serves those files with the right type,
    `X-Content-Type-Options: nosniff`, and a long immutable cache (the names never repeat). SVGs
    also get `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`.
  - **The upload**: a Server Action, with `experimental.serverActions.bodySizeLimit: "16mb"`
    (15 MB plus multipart overhead).
  - **The checks**, in `src/lib/admin/media-files.ts` (pure):
    - The format is sniffed from the bytes: the PNG signature with the IHDR size, the JPEG SOI with
      an SOFn size, or the WebP RIFF/`WEBP` header with the size from its VP8, VP8L or VP8X chunk.
      Otherwise it's an SVG if the text parses as an `<svg` root.
    - At most 15 MB.
    - A photo-style image must be at least 2,000 px on its longest side.
    - An SVG is refused if it has `<script`, any `on…=` handler, `javascript:`, `<foreignObject`,
      a `<!DOCTYPE` or `<!ENTITY`, an `href` or `xlink:href` that doesn't start with `#`, a CSS
      `url(` that doesn't point to `#…`, or `@import`.
    - Alt text: 1–200 characters.
  - A refused upload writes nothing. A file is written first, under a fresh name, and the media row
    second. If the row fails, the file is removed.
- **Rationale**: the Next docs are clear that only build-time `public/` files are served.
  Extensions and MIME types are claims, while magic bytes are facts. Refusing anything an SVG could
  use to reach outside itself is simpler than sanitizing it, and the CSP is a second lock.
- **Alternatives**: writing to `public/` (works in dev only); `sharp` or `image-size` (a dependency
  for header reads); sanitizing SVGs (complex and error-prone).

## R9 — Tiers are saved as one set

- **Decision**: the tiers page is one editor (`TierEditor`, client). The owner edits rows, adds
  rows and removes rows, then saves the whole set at once.
  - The server validates the proposed set:
    - `validateTiers`
    - the BLAND row (start 0) keeps its id, the name "BLAND" and start 0, and can't be removed
      (FR-029)
    - names 1–40 characters
    - taglines 0–120 characters
    - colors `#RRGGBB`
    - the R10 check under the new tiers
  - Then it updates, inserts and deletes in one transaction.
  - The preview (`tierChanges`, pure) lists the shirts whose tier would change, as the owner edits.
- **Rationale**: tier bands depend on each other (no shared starts, every start sets the band
  below), so row-by-row saves would pass through invalid states.

## R10 — One catalog check behind every pricing save

- **Decision**: `checkCatalog(db, proposed)` builds the proposed state: the existing shirts,
  tiers and MSRP tuning, with the save applied. It returns:
  - every shirt that would break `validateShirt`: the bland rule, active without an image, an MSRP
    that can't be computed
  - every tier problem

  Tier saves and tuning saves call it inside their transaction, and refuse with the names of the
  shirts that would break. Inactive shirts count too, because the audit checks them. A shirt save
  can only change that one shirt, so it runs `validateShirt` on it against the live tiers and
  tuning, the same rule `checkCatalog` applies to each shirt. Detaching refuses an active shirt's
  last picture directly. (Converge T070: the code checks the one shirt a save can change.)
- **Rationale**: SC-004 (the audit stays at zero errors after any console save). The audit and the
  console share `validateShirt`, so they can't disagree.

## R11 — The switchboard

- **Decision**:
  - `src/lib/admin/switches.ts` lists the 13 tactic switches: settings key, label, and one plain
    description (from the README table).
  - Each switch is its own small form (an on/off button). `setSwitch` updates only that column
    (FR-013), and only for a known key.
  - The MSRP tuning, the presets and the media settings each have their own form, and each saves
    only its own columns.
- **Rationale**: a column-scoped update means two tabs, or a switch flip during a tuning edit, never
  overwrite each other's fields. "The last save wins" then only ever applies within one form.

## R12 — The pricing analysis

- **Decision**: `src/lib/admin/pricing.ts` (pure, exact money):
  - `findInversions(shirts)`: every active pair where the higher score has the lower final price,
    with the gap. Equal scores are never flagged.
  - `overrideDistances(shirts)`: for every owner-set price, the difference from the MSRP in dollars
    and percent, using a new exact `percentDiff` in `money.ts` (big.js, one decimal).
  - `chartPoints(shirts, tiers, msrp)`: plot positions for a server-rendered SVG. The x-axis is the
    score; the y-axis is a log scale, so the exponential MSRP curve is a straight line. There are
    tier bands behind the points, and each point links to its shirt.

  The page also shows `auditCatalog(db)` (the command-line audit), linked to each shirt or tier.
- **Rationale**: positions are pixels, not money. Every amount shown is the exact string, and no
  float is ever charged, stored or added. A log axis keeps a $40 bland shirt and a $40,000 shirt on
  one readable chart.

## R13 — Flash Credit grants

- **Decision**:
  - A new ledger kind, `grant`: a positive amount, with no order, card or stream, and a required
    `grant_token` (UNIQUE).
  - `grantCredit(db, userId, { amountInput, token })` parses the amount with `tryParseUsd` (at
    least $0.01, no ceiling).
    - It inserts with `ON CONFLICT(grant_token) DO NOTHING`, so a second submit of the same form is
      a no-op that still reports success.
    - It returns the new balance.
  - The grant form renders a fresh `randomUUID()` token in a hidden field each time it's shown.
  - Shopper history: "A gift from Dan. He believes in you." (store voice).
  - The allocation engine is unchanged. Grants are "other money" like top-ups, so the per diem
    drain counts them the same way (spec edge case).
  - Built test-first.
- **Rationale**: the constitution makes Flash Credit a ledger. A token is how checkout already
  de-duplicates (`checkout_token`).

## R14 — Read models for customers and orders

- **Decision**: `src/lib/data/admin-customers.ts` and `admin-orders.ts` (server-only).
  - **Customers**: each account's email, display name, join date, admin flag, order count,
    lifetime spend (the exact sum of order totals) and balance (the exact sum of its entries,
    loaded in one query and summed with `sum`).
  - **Search**: case-insensitive, on the name or email.
  - **A customer's page**:
    - orders, newest first
    - `listEntries` (now with grants)
    - streams, with what's left in each, from the drain engine and whatever the drain switch says
    - drain achievements, from the orders
  - **Orders**: `hydrateOrders` is exported and reused, plus each line's snapshot score and MSRP
    (`order_items.complexity`, `msrp_usd`), and the customer (or "Guest").
  - **No writes**: the console never settles due stream payments. They're credited when the
    shopper next looks, as today (FR-036a).
  - **Cards**: only `card_brand` and `card_last4` exist to show (FR-035).
- **Rationale**: these are read-only views over existing data. The drain records finally get a
  reader.

## R15 — e2e for a console that changes shared state

- **Decision**: the console specs live in `tests/e2e/admin/`.
  - The `desktop` and `phone` projects ignore that folder.
  - New `admin-desktop` and `admin-phone` projects (the same devices) run it:
    - `admin-desktop` depends on `desktop` and `phone`
    - `admin-phone` depends on `admin-desktop`
    - both run with `workers: 1`
  - The specs change only what they create (a uniquely named shirt, upload, tier and add-on), or
    put back what they flip (a switch, a tagline).
  - Grants go to a shopper the spec signs up itself.
  - A `signInAsOwner` helper uses `DEMO_OWNER` from seed data.
- **Rationale**: this refines 002 R7. Shopper journeys still never see a switch move, because the
  console runs only after them, and one console spec at a time. Constitution VI gets its
  primary-journey e2e for every story.
- **Alternative**: a second server and database for the console. Rejected: it means a second build
  or a fragile shared-build start order.

## R16 — Moving the chrome without moving the vitals

- **Decision**: `StoreChrome` keeps the order the first-paint script relied on:
  - The script runs as the first node in `<body>`, before any store content parses, so the
    attribute is still set before first paint.
  - The strobe CSS is a `<style>` beside it.
  - Polish re-runs the 006 Extreme Awesomeness first-paint checks (already in e2e), and Lighthouse
    on `/` and `/shirts` (LCP ≤ 2.5 s, CLS ≤ 0.1).
- **Rationale**: the script only needs to run before content paints. Its place in `<head>` was
  incidental.

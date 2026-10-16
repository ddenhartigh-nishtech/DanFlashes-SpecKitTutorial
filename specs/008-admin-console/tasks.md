# Tasks: Admin Console

**Input**: Design documents from `/specs/008-admin-console/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/console.md, quickstart.md

**Generated**: 2026-10-16, against constitution v4.1.0 (draft; ratified by merging this PR)

**Tests**: REQUIRED (constitution VI), and written first.
- **Grants touch Flash Credit**, so they're strictly Red → Green: the ledger tests are written and
  seen failing before `grantCredit` exists.
- **Every console Server Action** gets integration tests, plus a table-driven sweep proving that a
  guest or a signed-in shopper changes nothing.
- **Every story's primary journey** gets an e2e in `tests/e2e/admin/`. Those run in the admin
  Playwright projects, after the shopper journeys, one worker at a time (R15).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: the user story the task belongs to (US1–US6)

---

## Phase 1: Setup

- [ ] T001 Record the baseline for the PR. Main is 009's merge (ade02fb), last verified at 621 unit
  and integration tests, 94.8% line coverage, and 98 e2e.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the admin flag and the grant column (0011), the door, the calm shell, and the store
chrome split. Every story needs these.

- [ ] T002 [P] Write a failing tests/integration/migration-0011.test.ts (`databaseBefore("0011")`):
  - existing users gain `is_admin = 0`
  - existing `flash_credit_entries` rows survive the rebuild unchanged
  - a `grant` row needs a positive amount and a `grant_token`, with no order, card or stream
  - `grant_token` is UNIQUE
  - every other kind refuses a `grant_token`
  - `foreign_key_check` is clean
- [ ] T003 [P] Write a failing tests/integration/admin-auth.test.ts:
  - `setAdmin(db, email, on)` sets and clears the flag, case-insensitively, and reports an unknown
    email
  - `findSessionUser` returns `isAdmin`
  - `adminUser(db, jar)` is null for a guest or a shopper and the user for an admin
  - clearing the flag takes effect on the next lookup in the same session (edge case "An admin no
    longer")
- [ ] T004 Extend src/lib/db/schema.ts per data-model.md:
  - `users.is_admin` ("integer (boolean), NOT NULL, default false")
  - `flash_credit_entries.kind` gains `grant`
  - `grant_token` text, UNIQUE
  - the `flash_credit_kind` CHECK gains the grant branch, and the other branches gain
    `grant_token IS NULL`

  Then run `npx drizzle-kit generate --name admin_console` to produce drizzle/0011_admin_console.sql.
  Check that it adds `is_admin` and rebuilds only `flash_credit_entries`, copying every row (T002
  passes).
- [ ] T005 Add `isAdmin` to `SessionUser` and its select in src/lib/auth/session.ts. Create
  src/lib/auth/admin.ts with `setAdmin` and `adminUser` (T003 passes).
- [ ] T006 [P] Add `DEMO_OWNER` (display name, email and password, in seed data only) to
  scripts/seed-data.ts, and `ensureDemoOwner` (real sign-up, then `setAdmin`; idempotent) to
  src/lib/data/demo-shopper.ts.
  - Call it from scripts/db-reset.ts and scripts/seed-demo.ts.
  - Create scripts/admin.ts and the package.json scripts `admin:grant` and `admin:revoke`.
    Each prints whether anything changed, and exits 1 for an unknown email.
  - Extend tests/integration/demo-shopper.test.ts: the owner is created once, as an admin.
- [ ] T007 [P] Write failing tests/unit/admin-posters.test.ts:
  - `copy.console.posters` has ≥ 12 entries, each a one-word capitalized title with a non-empty
    line
  - `pickPoster(count, last, random)` never returns `last`, and stays in range for every random
    value in [0, 1)
- [ ] T008 Create src/lib/admin/posters.ts (`pickPoster`) and src/lib/admin/state.ts (the
  `ConsoleState` type, `refused`, `saved`, `issuesOf`).
  - Add a `copy.console` skeleton to src/lib/copy.ts: the posters, `saved` encouragements,
    `refused.signIn`, `refused.notFound`, `notFoundHere`, and the nav labels.
  - Add `copy.nav.backOffice`.
  - T007 passes.
- [ ] T009 Split the store chrome (R1, R16):
  - Create src/components/StoreChrome.tsx (the first-paint `InlineScript`, the strobe `<style>`,
    `SiteHeader`, `<main>`, `DrainCorner`, `AwesomeIsland`, the footer).
  - Make src/app/layout.tsx bare (html, fonts, globals.css, metadata, viewport).
  - `git mv` page.tsx, about, account, cart, checkout, orders, shirts, sign-in, sign-up and
    error.tsx into src/app/(store)/, and add src/app/(store)/layout.tsx rendering
    `<StoreChrome>`.
  - Wrap src/app/not-found.tsx in `<StoreChrome>`.
  - Run the shopper e2e (browse, extreme-awesomeness, pipes, everything-on, social-proof). They
    pass unchanged.
- [ ] T010 Add the admin-only "Back office" link to src/components/SiteHeader.tsx, in the desktop
  nav and the phone menu: a plain `<a href="/admin">` inside `<Suspense fallback={null}>`, shown
  when `currentUser()?.isAdmin`.
- [ ] T011 Build the calm shell (R2, R4, R5):
  - **The theme**: office tokens and `.office` rules in src/app/globals.css (Geist only, no
    animation or transition, a thin sage focus ring).
  - **The gate**: src/app/_data/admin.ts `currentAdmin()`. src/app/admin/layout.tsx renders
    `<Suspense fallback={null}><AdminGate>`, which calls `notFound()` for non-admins before any
    markup, then shows the shell: "Dan's Office", nav for each area, and a plain
    `<a href="/">` "Back to the store".
  - **The poster**: src/components/admin/Poster.tsx (server; reads the `df-poster` cookie) plus
    `RememberPoster` (client; writes the cookie after mount, path `/admin`).
  - **Shared pieces**: src/components/admin/ConsolePage.tsx (title, poster, children) and
    `ConsoleMessage` (calm `ConsoleState` output).
  - **Pages**: src/app/admin/error.tsx, and src/app/admin/page.tsx (a welcome and the areas).
- [ ] T012 [P] Add the admin Playwright projects to playwright.config.ts (R15):
  - `desktop` and `phone` get `testIgnore: "admin/**"`
  - `admin-desktop` (Desktop Chrome) and `admin-phone` (Pixel 7) get `testMatch: "admin/**"` and
    `workers: 1`
  - `admin-desktop` depends on `desktop` and `phone`; `admin-phone` depends on `admin-desktop`

  Add tests/e2e/admin/helpers.ts with `signInAsOwner(page)` (uses `DEMO_OWNER`), the
  `CONSOLE_PAGES` list, and `poster(page)`.

**Checkpoint**: an admin sees a calm, empty office at `/admin`; everyone else sees the store's 404;
the store is unchanged, and every existing test passes.

---

## Phase 3: User Story 1 - Dan's Shirts (Priority: P1) 🎯 MVP

**Goal**: the owner manages every shirt (create, edit with a live preview, deactivate, reactivate)
in a calm room no one else can enter.

**Independent Test**: quickstart 1–11 and 27; e2e door, calm and shirts.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [ ] T013 [P] [US1] Extend tests/unit/catalog-validate.test.ts: `validateShirt` refuses a score
  whose MSRP can't be computed (for example 999999 at the default tuning) with
  `copy.console`'s "too complicated to price" message, and still accepts large computable scores
  (R7).
- [ ] T014 [P] [US1] Write tests/integration/admin-shirts.test.ts against the cores in
  src/lib/actions/admin/shirts.ts:
  - **`createShirt`**:
    - no image → saved inactive
    - with an image and `active` → live at position 0
    - refused, with nothing written, for: a malformed or taken slug, a name over 80 characters, a
      negative or fractional score, a price of 0.001 or "abc", a missing description, a BLAND
      price ≥ start (the message gives the limit and the resolved price), and an MSRP that can't
      be computed
  - **`updateShirt`**: a sent slug is ignored; the same refusals apply
  - **`setShirtStatus`**: activation needs an image; deactivation always works, and the shirt stays
    in order history (`getOrderForUser` still renders it)
  - **Images**: `attachImage`, `moveImage` (position 0 is main) and `detachImage` (refused for an
    active shirt's last image; positions close up)
  - **`checkCatalog`**: names every shirt a proposed state would break
- [ ] T015 [P] [US1] Write tests/integration/admin-door.test.ts. It's a table of every console
  action core, starting with US1's; each later story adds its own.
  - For a guest: `refused.signIn`. For a signed-in shopper: `refused.notFound`.
  - For both, a snapshot of every table is byte-identical before and after.
- [ ] T016 [P] [US1] Write tests/e2e/admin/door.spec.ts:
  - every `CONSOLE_PAGES` route shows the store's 404 text to a guest and to a newly signed-up
    shopper, with no console markup and no "Back office" link
  - the owner sees the link, and it opens `/admin`
- [ ] T017 [P] [US1] Write tests/e2e/admin/calm.spec.ts. With Extreme Awesomeness turned on in the
  store, then the console opened, on every console page:
  - `<html>` has no `data-awesome`, and there's no pipes canvas, pop-up, countdown or stock line
  - `document.getAnimations()` is empty
  - there's exactly one poster
  - reloading gives a different poster
  - at 360px, `scrollWidth ≤ clientWidth`
- [ ] T018 [P] [US1] Write tests/e2e/admin/shirts.spec.ts:
  - the list shows scores and tiers
  - a new shirt (unique slug per project) with score 30 previews Very Complicated and its MSRP,
    and saves inactive with Dan's encouragement
  - attaching a library image and activating puts it on `/shirts/<slug>` at the MSRP
  - a BLAND score with a $400.00 price is refused with the message
  - deactivating asks once, calmly, and the shopper's `/shirts/<slug>` is then a 404
  - reactivating brings it back

### Implementation for User Story 1

- [ ] T019 [US1] In src/lib/catalog/validate.ts, make `validateShirt` refuse an MSRP that can't be
  computed (catch the `msrpUsd` RangeError or MoneyError). Add the message to src/lib/copy.ts.
  T013 passes.
- [ ] T020 [US1] Create src/lib/admin/catalog-check.ts: `checkCatalog(db, { shirt?, tiers?,
  msrp?, imageCounts? })` returns each shirt that would fail `validateShirt` under the proposed
  state, plus any tier problems (R10).
- [ ] T021 [US1] Create src/lib/data/admin-shirts.ts (server-only):
  - `listAdminShirts(db, { status, tierId, sort })`, with score, tier, MSRP, final price and
    whether it's Dan's
  - `getAdminShirt(db, id)`, with images in order
  - `listLibrary(db)`, every media item with a resolved URL
- [ ] T022 [US1] Create src/lib/actions/admin/shirts.ts: `createShirtCore`, `updateShirtCore`,
  `setShirtStatusCore`, `attachImageCore`, `moveImageCore` and `detachImageCore`.
  - Each starts with `adminUser`, runs in one transaction, and uses `checkCatalog`.
  - Add their `copy.console.shirts` messages.
  - T014 and T015 pass.
- [ ] T023 [US1] Create src/actions/admin.ts ("use server") with wrappers for the shirt cores
  (`refresh()` on success).
- [ ] T024 [P] [US1] Create the shirt UI in src/components/admin/:
  - `ShirtForm.tsx` (client), with `PricePreview` using the shared `tierOf` and `resolvePrice`
    (FR-008)
  - `ImageManager.tsx` (attach from the library, up, down, detach)
  - `StatusControl.tsx`, with a single calm inline confirmation to deactivate
  - `ShirtTable.tsx`, which becomes stacked cards under 640px
- [ ] T025 [US1] Create src/app/admin/shirts/page.tsx (sort and filter by search params),
  src/app/admin/shirts/new/page.tsx and src/app/admin/shirts/[id]/page.tsx. An unknown id gets
  `copy.console.notFoundHere`. T016–T018 pass.

**Checkpoint**: US1 works end to end. The console is useful from here on.

---

## Phase 4: User Story 2 - The Switchboard (Priority: P2)

**Goal**: every tactic switch in one click, MSRP tuning with a before-and-after preview, presets,
and the media settings.

**Independent Test**: quickstart 12–14; e2e switchboard.

### Tests for User Story 2 ⚠️

- [ ] T026 [P] [US2] Write tests/unit/admin-switches.test.ts: `SWITCHES` lists exactly the 13 boolean
  tactic keys of `StoreSettings` (`checkoutGate` included), each with a non-empty label and
  description, and no duplicates.
- [ ] T027 [P] [US2] Write tests/integration/admin-settings.test.ts:
  - **`setSwitchCore`**: changes only its column (every other column is unchanged); refuses an
    unknown key
  - **`saveTuningCore`**:
    - refused on shape rules
    - refused, naming the shirts, when a BLAND shirt would reach the new start price, or an MSRP
      can't be computed
    - otherwise saves only the MSRP columns
  - **`savePresetsCore`**: normalizes "2500, 500.5" to `["2500.00","500.50"]`; refuses 0,
    negatives, "abc" and duplicates
  - **`saveMediaSettingsCore`**: refuses a non-http(s) base URL and a missing or unknown
    placeholder

  Add these cores to the T015 sweep.
- [ ] T028 [P] [US2] Write tests/e2e/admin/switchboard.spec.ts:
  - all 13 switches show with descriptions
  - the owner turns off the roach motel; a shopper's cart line is then removed without "Are you
    sure?"; the owner turns it back on
  - previewing a start price of 400 lists each shirt's MSRP now and after, and the owner doesn't
    save it
  - adding a preset of 2500 shows $2,500.00 on the shopper's top-up; it's then put back

### Implementation for User Story 2

- [ ] T029 [US2] Create src/lib/admin/switches.ts (`SWITCHES`: key, column, label, description,
  per R11). Add the copy to `copy.console.settings`. T026 passes.
- [ ] T030 [US2] Add targeted saves to src/lib/data/settings.ts: `saveSwitch`, `saveTuning`,
  `savePresets` and `saveMediaSettings`. Each updates only its own columns.
- [ ] T031 [US2] Create src/lib/actions/admin/settings.ts with the four cores, and add their
  wrappers to src/actions/admin.ts. T027 passes.
- [ ] T032 [P] [US2] Create in src/components/admin/: `SwitchRow.tsx` (a one-click form),
  `TuningForm.tsx` (client; the now/after preview uses `msrpUsd`), `PresetsForm.tsx` and
  `MediaSettingsForm.tsx`.
- [ ] T033 [US2] Create src/app/admin/settings/page.tsx. T028 passes.

**Checkpoint**: switches and tuning work without the database tools.

---

## Phase 5: User Story 3 - Priced Against the Grain (Priority: P3)

**Goal**: the pricing page catches inversions and overrides, and shows the audit.

**Independent Test**: quickstart 15; e2e pricing.

### Tests for User Story 3 ⚠️

- [ ] T034 [P] [US3] Extend tests/unit/money.test.ts: `percentDiff(final, msrp)` is exact to one
  decimal (for example 450.00 against 300.00 → "50.0", 299.99 against 300.00 → "-0.0", and a
  value that rounds half-up), and refuses a zero base.
- [ ] T035 [P] [US3] Write tests/unit/admin-pricing.test.ts:
  - `findInversions` flags exactly the pairs where a higher score costs less, with the gap; ties
    aren't flagged; inactive shirts are excluded by the caller
  - `overrideDistances` gives the dollars, percent and direction
  - `chartPoints` is monotonic in score and in log price, and every point stays inside the plot
  - fewer than two shirts → nothing to compare
- [ ] T036 [P] [US3] Write tests/e2e/admin/pricing.spec.ts:
  - with the e2e shirt priced below a simpler shirt, the pair is listed with edit links
  - fixing the price clears the pair
  - the override list and the audit section show

### Implementation for User Story 3

- [ ] T037 [US3] Add `percentDiff` to src/lib/money.ts (big.js; one decimal, half-up). T034
  passes.
- [ ] T038 [US3] Create src/lib/admin/pricing.ts (`findInversions`, `overrideDistances`,
  `chartPoints`, per R12). T035 passes.
- [ ] T039 [US3] Create src/components/admin/PriceChart.tsx (server SVG: log y-axis, the MSRP line,
  tier bands, points linking to their shirts) and src/app/admin/pricing/page.tsx (chart, pairs,
  overrides, `auditCatalog`). Show the problem count on src/app/admin/page.tsx. T036 passes.

---

## Phase 6: User Story 4 - Uploading the Goods (Priority: P4)

**Goal**: high-resolution or vector uploads, checked by their bytes, served safely, attached and
zoomable.

**Independent Test**: quickstart 16–18; e2e media.

### Tests for User Story 4 ⚠️

- [ ] T040 [P] [US4] Create tests/helpers/images.ts: a real PNG builder (zlib, CRCs) at any size,
  minimal JPEG (SOF0) and WebP (VP8, VP8L and VP8X) headers at any size, and SVG strings.
- [ ] T041 [P] [US4] Write tests/unit/media-files.test.ts for `inspectUpload(bytes)`:
  - it sniffs PNG, JPEG and WebP sizes, and SVG
  - it refuses: a renamed text file, more than 15 MB, a photo under 2,000 px on its longest side,
    and an SVG with `<script>`, `onload=`, `javascript:`, `<foreignObject>`, `<!DOCTYPE>`, an
    external `href` or `xlink:href`, an external `url(`, or `@import`
  - it accepts an SVG using `#id` references
  - an alt of 0 or 201 characters is refused
- [ ] T042 [P] [US4] Write tests/integration/admin-media.test.ts (`MEDIA_UPLOADS_DIR` pointed at a
  temp dir):
  - an accepted upload writes `uploads/<uuid>.<ext>` and a row
  - a refused one writes neither
  - `updateMediaAlt` works
  - `removeMedia` is refused for an image in use or the placeholder, and otherwise deletes the row
    and the uploaded file (never a seeded `public/` file)
  - the route handler serves an upload with its type, `nosniff`, and the SVG CSP, and 404s unknown
    or malformed names, including `..`

  Add the cores to the T015 sweep.
- [ ] T043 [P] [US4] Write tests/e2e/admin/media.spec.ts:
  - uploading an SVG with alt text, attaching it as the e2e shirt's main image, and opening the
    shopper's shirt page shows it in the zoom viewer
  - a 600×600 PNG is refused with its reason

### Implementation for User Story 4

- [ ] T044 [US4] Create src/lib/admin/media-files.ts (`inspectUpload`, per R8). T041 passes.
- [ ] T045 [US4] Create src/lib/admin/uploads.ts (the uploads dir from `MEDIA_UPLOADS_DIR` or
  beside the database; `writeUpload`; `removeUpload`; safe file names) and src/lib/data/admin-media.ts
  (the library with its users and the placeholder flag).
- [ ] T046 [US4] Create src/lib/actions/admin/media.ts (`uploadMediaCore`, `updateMediaAltCore`,
  `removeMediaCore`) and src/app/media/uploads/[file]/route.ts.
  - Add the wrappers.
  - Set `experimental.serverActions.bodySizeLimit: "16mb"` in next.config.ts.
  - Document `MEDIA_UPLOADS_DIR` in .env.example.
  - T042 passes.
- [ ] T047 [US4] Create `UploadForm.tsx` and `MediaCard.tsx` in src/components/admin/ and
  src/app/admin/media/page.tsx. T043 passes.

---

## Phase 7: User Story 5 - Tiers and Add-Ons (Priority: P5)

**Goal**: tiers saved as a set with a preview, BLAND locked; add-ons created, edited, retired,
restored and reordered.

**Independent Test**: quickstart 19–21; e2e tiers-add-ons.

### Tests for User Story 5 ⚠️

- [ ] T048 [P] [US5] Write tests/unit/admin-tiers.test.ts:
  - `validateTierEdit(current, proposed)` refuses renaming, moving or removing BLAND; names
    outside 1–40 characters; taglines over 120 characters; bad colors; duplicate starts and
    names. It accepts tagline and color edits on BLAND.
  - `tierChanges(shirts, current, proposed)` lists exactly the shirts whose tier changes.
- [ ] T049 [P] [US5] Write tests/integration/admin-tiers.test.ts:
  - `saveTiersCore` updates, inserts and deletes in one transaction
  - it's refused, naming shirts, when a shirt would land in BLAND at or above the start price
  - store badges follow (`listCatalogShirts`)
- [ ] T050 [P] [US5] Write tests/integration/admin-add-ons.test.ts:
  - create and update within bounds, and a duplicate name is refused
  - retire and restore (`listOfferedAddOns` follows)
  - `moveAddOn` swaps positions
  - an order placed before an edit keeps its name and price

  Add the US5 cores to the T015 sweep.
- [ ] T051 [P] [US5] Write tests/e2e/admin/tiers-add-ons.spec.ts:
  - add a tier starting at 5000 (no shirt is affected) and remove it
  - edit Complicated's tagline, check the store shows it, then restore it
  - renaming BLAND is refused
  - create a uniquely named add-on, check checkout offers it, then retire it
  - move one add-on down and back

### Implementation for User Story 5

- [ ] T052 [US5] Create src/lib/admin/tiers.ts (`validateTierEdit`, `tierChanges`). T048 passes.
- [ ] T053 [US5] Create src/lib/actions/admin/tiers.ts (`saveTiersCore`) and
  src/lib/actions/admin/add-ons.ts (`createAddOnCore`, `updateAddOnCore`, `setAddOnActiveCore`,
  `moveAddOnCore`). Add `listAllAddOns` to src/lib/data/add-ons.ts. Add the wrappers. T049 and
  T050 pass.
- [ ] T054 [P] [US5] Create `TierEditor.tsx` (client, with a live preview) and `AddOnRow.tsx` /
  `AddOnForm.tsx` in src/components/admin/, and src/app/admin/tiers/page.tsx and
  src/app/admin/add-ons/page.tsx. T051 passes.

---

## Phase 8: User Story 6 - Who's Buying (Priority: P6)

**Goal**: customers and orders, read-only, plus Flash Credit grants. The grant is the console's
only money change.

**Independent Test**: quickstart 22–25; e2e customers.

### Tests for User Story 6 (money: Red first) ⚠️

- [ ] T055 [P] [US6] Write a failing tests/integration/grants.test.ts against
  `grantCredit(db, userId, { amountInput, token })` in src/lib/flash-credit/ledger.ts:
  - **The balance**:
    - it rises by exactly the amount ($500.00, $0.01, a 15-digit amount)
    - it equals the sum of the entries after a mix of top-ups, spends, streams and grants
  - **Refusals, with nothing recorded**: 0, -5, 0.001, "abc", or an unknown user
  - **Idempotence**: the same token twice records one entry and reports success
  - **Shopper views**: `listEntries` shows `kind: "grant"`; `placeOrder` with Flash Credit spends
    granted credit
  - **The drain**: the per diem meter and stream balances treat a grant as other money, unchanged
    by it
- [ ] T056 [P] [US6] Write tests/integration/admin-read-models.test.ts:
  - **Customers**: the list's order count, exact lifetime spend, balance and admin flag; search by
    name or email is case-insensitive
  - **A customer's page**: orders, ledger (with grants), streams with what's left, drains
  - **Orders**: newest first, a guest order shows "Guest"
  - **An order's page**: the score and MSRP at purchase, add-ons, Flash Credit applied, and the
    card's brand and last four only (no other card field exists in the view)
- [ ] T057 [P] [US6] Write tests/integration/admin-grants-action.test.ts for `grantFlashCreditCore`:
  success, a refused amount, an unknown customer, and a repeated token. Add it to the T015 sweep.
- [ ] T058 [P] [US6] Write tests/e2e/admin/customers.spec.ts:
  - a shopper signs up in their own context
  - the owner finds them by search and grants $500.00
  - the shopper's account shows "A gift from Dan. He believes in you." and a balance of $500.00
  - the owner opens the demo shopper's past order and sees the card's brand and last four, with
    the score at purchase

### Implementation for User Story 6

- [ ] T059 [US6] Implement `grantCredit` in src/lib/flash-credit/ledger.ts (`tryParseUsd`, ≥ 0.01,
  `ON CONFLICT(grant_token) DO NOTHING`). Add `"grant"` to `LedgerEntry.kind`. Add
  `copy.account.entryGrant` and render it in src/app/(store)/account/page.tsx. T055 passes.
- [ ] T060 [US6] Export `hydrateOrders` from src/lib/orders/orders.ts. Create
  src/lib/data/admin-customers.ts and src/lib/data/admin-orders.ts (per R14). T056 passes.
- [ ] T061 [US6] Create src/lib/actions/admin/grants.ts (`grantFlashCreditCore`) and its wrapper.
  T057 passes.
- [ ] T062 [P] [US6] Create `GrantForm.tsx` (a fresh token each render, calm messages) and
  `LedgerTable.tsx` in src/components/admin/. Create src/app/admin/customers/page.tsx,
  customers/[id]/page.tsx, orders/page.tsx and orders/[id]/page.tsx. T058 passes.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T063 [P] Rewrite the README's "Managing the store" around the console (FR-040):
  - the admin scripts
  - the demo owner (pointing to seed data)
  - uploads and `MEDIA_UPLOADS_DIR`
  - the switch table kept as reference
  - Drizzle Studio as a developer tool
- [ ] T064 [P] Hand-check the client components in `next dev` under React Strict Mode: `ShirtForm`,
  `TuningForm`, `TierEditor`, `GrantForm`, `StatusControl` and `RememberPoster` (002 R7 known gap).
- [ ] T065 [P] Lighthouse `/` and `/shirts` after the chrome split (R16; LCP ≤ 2.5 s, CLS ≤ 0.1).
  Record the numbers in the PR.
- [ ] T066 Script the quickstart on a scratch database (`DATABASE_PATH=data/qs008.db`). Run
  scenarios 1–28 that aren't already covered by e2e, including `npm run catalog:audit` = 0 errors
  and `admin:revoke` mid-session.
- [ ] T067 Run `npm run verify` until it's green. Record the counts and the coverage.

---

## Dependencies & Execution Order

- **Setup (T001)** comes first.
- **Foundational (T002–T012)** blocks every story:
  - T002 ∥ T003 → T004 → T005 → T006 ∥ T007
  - T007 → T008
  - T008 → T009 → T010 → T011
  - T012 runs beside T009–T011
- **US1 (T013–T025)** comes next. It's the MVP: the console's door, shell and shirts. The tests
  (T013–T018) are written in parallel, then T019 → T020 → T021 → T022 → T023 → T024 ∥ … → T025.
- **US2–US6** each depend only on Foundational and US1's `src/actions/admin.ts` and sweep, and can
  follow in priority order. US4's image attach reuses US1's `ImageManager`.
- **Within each story**: tests first (they fail), then lib, then cores, then wrappers, then UI.
- **Polish (T063–T067)** comes after every story.

### Parallel opportunities

- T002 ∥ T003, and T006 ∥ T007
- T012 runs beside T009–T011
- Each story's test tasks run in parallel (for example T013–T018), and so do its UI-component tasks
  marked [P]

## Implementation Strategy

1. **MVP**: Setup, Foundational, US1. The owner can manage shirts in a calm room, and nobody else
   can get in.
2. **Increment** in priority order: US2 (switchboard), US3 (pricing), US4 (media), US5 (tiers and
   add-ons), US6 (customers, orders, grants; money, so Red first).
3. **Polish**: the README, Strict Mode, Lighthouse, the quickstart, then verify. Then converge, and
   a PR that also ratifies constitution v4.1.0.

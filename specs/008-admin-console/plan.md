# Implementation Plan: Admin Console

**Branch**: `008-admin-console` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-admin-console/spec.md`

## Summary

A tranquil back office at `/admin`. Only accounts with the new admin flag can open it (migration
0011, `users.is_admin`, set from the command line). It replaces Drizzle Studio for:

- shirts: create, edit, deactivate and reactivate, with a live tier, MSRP and price preview
- every tactic switch, each one click
- MSRP tuning, with a before-and-after preview
- the Flash Credit presets, the media base URL and the placeholder image
- a pricing analysis: price against score, inverted pairs, override distances, the catalog audit
- image uploads, attachment and ordering
- tiers, saved as one set with a preview, BLAND locked
- add-ons
- customers and orders, read-only, plus one money action: granting Flash Credit

Every save is checked on the server: it must come from an admin, and it must keep every catalog
rule. Each save runs in a transaction that re-checks every shirt under the proposed state, so the
catalog audit stays at zero errors.

**How it stays calm**:
- The loud store chrome moves into a `(store)` route group.
- `/admin` gets its own layout: muted colors, no motion, a motivational poster on every page.
- Links between the store and the console are full page loads, so no strobe, pipes or pop-up from
  the store survives into the console.

**Grants** are a new ledger kind, `grant`. Each one is positive, idempotent through a
per-form token, and spent like a top-up. They're built test-first, because they touch Flash Credit.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19, Tailwind 4)

**Primary Dependencies**: unchanged. There are no new packages: image dimensions and format sniffing
are about 80 lines of tested code (R8).

**Storage**: SQLite. Migration `0011` adds:
- `users.is_admin`
- the `grant` kind and `grant_token` on `flash_credit_entries` (a table rebuild for the CHECK)

Uploaded image files live on disk in an uploads directory (default `data/uploads`), served by a
route handler. Next serves only files that were in `public/` at build time (R8). See
[data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration) and Playwright (e2e, production build). Console specs
run in their own Playwright projects, after the shopper journeys, one worker at a time (R15).
`npm run verify` gates merge.

**Target Platform / Project Type**: unchanged from 001 (a single Next.js web app)

**Performance Goals**: The console has no budget beyond the store's (an owner tool on a demo store).
The store's Core Web Vitals must hold after the chrome moves into the route group. Lighthouse is
re-run on `/` and `/shirts` in polish.

**Constraints**:
- Only admins open or change anything, and every action re-checks this (FR-001–FR-003).
- The console is tranquil (constitution v4.1.0, V "The back office is calm").
- Shoppers never see a score (constitution II).
- Exact money, with `src/lib/money.ts` only.
- The MSRP formula is used, never copied (FR-008).
- No shirt or add-on is ever deleted.
- Card brand and last four only.
- Grants follow the Flash Credit ledger rules.
- Everything works from 360px wide.

**Scale/Scope**: one store, a handful of admins, tens of shirts, hundreds of orders. 13 console
pages, about 25 actions.

All Technical Context items are resolved. See [research.md](./research.md) (R1–R16).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution **v4.1.0 (draft, ratified by merging this feature's PR)**. On v4.0.0,
I and V would fail for the console. The amendment scopes them to shopper pages and adds the calm
back-office rule.

| # | Principle / Rule | How 008 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | Shopper-facing copy keeps the store voice: the admin header link, and "A gift from Dan" in the shopper's Flash Credit history. The console is exempt (v4.1.0). Its posters are played straight and never explain the joke. | ✅ | ✅ |
| II | Complexity Is the Price | The score appears only under `/admin`. The admin gate and the server-only read models keep it there, and the existing no-score audit still runs on every shopper page. The MSRP formula isn't editable, only its tuning (FR-014). Previews import the single `msrpUsd`/`resolvePrice` (FR-008). There's no shirt delete. The BLAND tier is locked at score 0, named BLAND (FR-029). | ✅ | ✅ |
| III | Relentlessly Vibrant | The bland rule is enforced on every pricing-input save: shirt, tiers, tuning (R10). Uploads meet the zoom resolution floor, or are vector (R8). | ✅ | ✅ |
| IV | Shamelessly Manipulative | Every tactic switch gets one-click control. No tactic runs in the console. | ✅ | ✅ |
| V | Maximum Visual Assault | The store is unchanged. The console is calm (v4.1.0): no animation, strobe, pipes or pop-ups (R1, R4), working from 360px. | ✅ | ✅ |
| VI | Fully Tested, Money Math First | Grants are test-first (Red → Green): exact balance, sum of entries, idempotent, refusals, spendable at checkout. Every Server Action has integration tests, including a table-driven "non-admin changes nothing" sweep. Pure logic gets unit tests (analysis, sniffing, posters, tier preview). Every story's primary journey gets an e2e. `src/lib` stays ≥ 90%. `/speckit-analyze` runs before implement (it touches Flash Credit). | ✅ | ✅ |
| VII | Fast | Store pages keep their budgets; Lighthouse is re-checked after the layout split. Uploaded images are lazy-loaded like the rest. | ✅ | ✅ |
| VIII | Simple Code | No new packages. Server Actions and server components in the existing style. One route group, one route handler. Deviations are in Complexity Tracking. | ✅ | ✅ |
| C | Commerce constraints | No processor. Cards show brand and last four only. Nosy answers don't exist. Flash Credit stays a ledger (grant is an entry, the balance is derived, never negative). Checkout pricing is still server-authoritative. Money is exact. No secrets are added. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify (Q1–Q3 in specify) → plan → tasks → analyze → implement → converge; merge by PR. The constitution amendment rides in the same PR. | ✅ | ✅ |

**Result**: PASS on v4.1.0, pre-research and post-design.

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-console/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/console.md        # console pages, actions, refusals; shopper-facing deltas
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (changes to the 001–009 layout)

```text
drizzle/0011_*.sql                       # users.is_admin; flash_credit_entries grant kind + grant_token
next.config.ts                           # serverActions.bodySizeLimit 16mb (uploads)
scripts/
├── admin.ts                             # new: npm run admin:grant|admin:revoke -- <email>
├── seed-data.ts                         # DEMO_OWNER
├── db-reset.ts, seed-demo.ts            # also create the demo owner
src/
├── app/
│   ├── layout.tsx                       # bare: html, fonts, globals.css, metadata
│   ├── not-found.tsx                    # the store's 404 inside <StoreChrome>
│   ├── (store)/                         # moved here unchanged: page, about, account, cart, checkout,
│   │   ├── layout.tsx                   #   orders, shirts, sign-in, sign-up, error.tsx; new layout = <StoreChrome>
│   ├── admin/                           # new: the console
│   │   ├── layout.tsx                   # calm shell + <Suspense fallback={null}><AdminGate>…
│   │   ├── error.tsx
│   │   ├── page.tsx                     # welcome + areas
│   │   ├── shirts/page.tsx, shirts/new/page.tsx, shirts/[id]/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── media/page.tsx
│   │   ├── tiers/page.tsx
│   │   ├── add-ons/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── customers/page.tsx, customers/[id]/page.tsx
│   │   └── orders/page.tsx, orders/[id]/page.tsx
│   ├── media/uploads/[file]/route.ts    # new: serves uploaded files (nosniff; SVG sandboxed)
│   └── _data/admin.ts                   # new: currentAdmin()
├── actions/admin.ts                     # new: "use server" wrappers (refresh on success)
├── components/
│   ├── StoreChrome.tsx                  # new: first-paint script, strobe CSS, header, drain corner, awesome island, footer
│   ├── SiteHeader.tsx                   # + admin-only "Back office" link (Suspense)
│   └── admin/                           # new: console UI (calm), e.g. ConsoleShell, Poster, SwitchRow, ShirtForm,
│                                        #   PricePreview, TierEditor, TuningPreview, ImageManager, UploadForm, GrantForm, PriceChart…
└── lib/
    ├── auth/session.ts                  # SessionUser.isAdmin
    ├── auth/admin.ts                    # new: setAdmin(email, on), adminUser(jar)
    ├── admin/                           # new (pure unless noted)
    │   ├── state.ts                     # ConsoleState, refusals
    │   ├── switches.ts                  # the 13 switches: key, column, label, description
    │   ├── posters.ts                   # pickPoster(lastIndex)
    │   ├── pricing.ts                   # inversions, override distances, chart scale
    │   ├── catalog-check.ts             # (db) every shirt valid under a proposed state (bland rule, images, MSRP computable)
    │   ├── tiers.ts                     # tier-set edit rules (BLAND locked), tier-change preview
    │   ├── media-files.ts               # sniff format + dimensions, SVG safety, size limit
    │   └── uploads.ts                   # (fs) uploads dir, write/remove a file
    ├── actions/admin/*.ts               # new: framework-free action cores (shirts, images, media, settings, tiers, add-ons, grants)
    ├── data/admin-*.ts                  # new: console read models (shirts, media usage, customers, orders)
    ├── data/settings.ts                 # targeted single-column saves (switch, msrp, presets, media)
    ├── flash-credit/ledger.ts           # grantCredit(); LedgerEntry kind "grant"
    ├── catalog/validate.ts              # validateShirt: refuse a score whose MSRP can't be computed
    ├── money.ts                         # percentDiff (exact, one decimal)
    ├── db/schema.ts                     # is_admin; grant kind; grant_token
    └── copy.ts                          # copy.console (calm), copy.account.entryGrant (loud), copy.nav.backOffice
tests/
├── unit/…                               # admin-pricing, admin-posters, admin-tiers, media-files, admin-switches, money (percentDiff)
├── integration/…                        # migration-0011, admin-auth, admin-door (non-admin sweep), admin-shirts, admin-images,
│                                        #   admin-media, admin-settings, admin-tiers, admin-add-ons, grants, admin-read-models
├── helpers/…                            # images.ts (PNG/JPEG/WebP/SVG fixtures); db.ts setAdmin helper
└── e2e/admin/…                          # door, calm, shirts, switchboard, pricing, media, tiers-add-ons, customers (+ helpers)
playwright.config.ts                     # admin-desktop/admin-phone projects (dependencies, workers: 1)
README.md                                # "Managing the store" → the console; admin:grant; uploads
```

**Structure Decision**: the single project grows a console segment.
- **Isolation**: the store's chrome becomes a component shared by the `(store)` group layout and
  the root 404. The console has its own calm layout under the same bare root.
- **Logic**: domain rules live in `src/lib/admin/*` (pure, unit-tested) and in the framework-free
  action cores in `src/lib/actions/admin/*` (integration-tested), matching 001's
  `src/lib/actions` pattern.
- **Pages** stay thin.

## Complexity Tracking

No constitution violations on v4.1.0. These choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| Move the store's routes into a `(store)` route group and extract `StoreChrome` | The console must never mount the strobe CSS, the first-paint script, the pipes, pop-ups or the drain corner. Those live in the root layout today. | Hiding them by path in the root layout can't work, because layouts don't know the path. Multiple root layouts need the experimental `global-not-found`, and would render a non-admin's 404 in the console's document. |
| Store↔console links are plain `<a>` (full loads) | Next 16 keeps left routes mounted in a hidden Activity, so a soft navigation would carry the store's strobe `<style>` and `data-awesome` into the console. | Soft navigation is the default, but it leaks the loud store into the calm room. |
| Uploaded files on disk outside `public/`, plus a route handler | `next start` serves only the `public/` files that existed at build. | Writing into `public/` works in dev only. |
| In-house image sniffing (PNG/JPEG/WebP headers, SVG checks) | It's about 80 lines with unit tests, and it checks the real bytes rather than the extension. | `image-size` or `sharp` would add a dependency for a few header reads (VIII). |
| Console e2e in dependent Playwright projects with `workers: 1` | Console journeys change shared state (switches, tiers, prices). Running them after the shopper journeys keeps those journeys deterministic. | 002 R7 ("e2e never toggles switches") would leave the switchboard's primary journey without an e2e (constitution VI). |
| A `grant_token` column for idempotent grants | A double submit must record one grant (FR-036), the same way checkout uses `checkout_token`. | De-duplicating on amount and time would be fragile and could merge two real grants. |

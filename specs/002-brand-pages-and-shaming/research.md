# Research: Brand Pages & Bland-Shirt Shaming (002)

**Date**: 2026-10-13 | **Plan**: [plan.md](./plan.md)

002 reuses 001's stack and patterns unchanged:
- Next.js 16 with Cache Components
- SQLite and Drizzle
- framework-free logic in `src/lib/`, with thin Server Actions
- brand copy in `src/lib/copy.ts`

See `specs/001-core-storefront/research.md`. Only the new decisions are recorded here.

## R1. Two switches on `store_settings`

- **Decision**: add two boolean columns via a new migration: `bland_shaming` and `confirmshaming`,
  both `NOT NULL DEFAULT 1`. `StoreSettings` gains `blandShaming` and `confirmshaming`, and
  `validateSettings`, `saveSettings`, and the seed carry them.
- **Rationale**: this follows 001's single-row typed settings (001 R11). Each tactic gets its own
  named switch (constitution IV), editable in Drizzle Studio. `db:migrate` backs up first.

## R2. The store refuses bland adds (not just the dialog)

- **Decision**: in `src/lib/cart/cart.ts`:
  - `addItem` returns a new error code, `BLAND_REFUSED`, when the shirt is BLAND-tier and
    `blandShaming` is on.
  - `updateItem` returns `BLAND_REFUSED` when a bland line's quantity would *increase*. Decreasing
    or removing a line still works.

  - `auditCart` (001), which already pulls retired shirts before every cart view and checkout, also
    pulls bland lines while `blandShaming` is on. `RemovedLine` gains `reason: "retired" | "bland"`.
    This is what keeps bland lines that are already in a cart from being bought.
  - `mergeGuestCart` skips the guest's bland lines while `blandShaming` is on.

  Blandness is decided at that moment, from the shirt's current tier. Reusing the existing audit
  avoids a second removal path.
- **Rationale**: this is FR-010 and SC-001. A gag enforced only in the browser is bypassable with a
  plain form POST. The data layer gains `isBlandShirt(db, shirtId)`, so cart code still never reads
  catalog tables directly (001 T081).

## R3. The endless loop runs in the browser; the server never adds

- **Decision**:
  - The shirt page knows whether the shirt is bland and whether shaming is on. If both, `AddToCart`
    opens the dialog instead of submitting.
  - Each "insist" just advances a client-side round counter. It never calls the server, so the
    shirt can't be added by a race.
  - The page also passes a **ladder** of recommendations: active non-bland shirts ordered from least
    to most complicated, in the shopper-safe shape (name, slug, tier badge, price, image — **no
    complexity score**, constitution II).
  - Round *i* recommends `ladder[min(i, ladder.length − 1)]`, which climbs, then stays at the top.
- **Rationale**: endless rounds cost nothing on the server, and the store-side refusal (R2) makes
  the gag hold even if the dialog is skipped. The ladder ordering reveals relative complexity, as
  the listing's "Most Complicated" sort already does, but never a number.
- **Pure logic** (unit-tested) lives in `src/lib/shaming/`. `ladder.ts` holds `buildLadder` and runs on
  the server, because it imports the catalog layer. `loop.ts` holds the rest and is browser-safe:
  - `buildLadder(shirts)`: takes catalog shirts, which already carry `tier.isBland`. Keeps active,
    non-bland shirts in ascending complexity, one per distinct score so every step is strictly more
    complicated, and maps them to shopper shirts.
  - `recommendationFor(round, ladder)`: rounds count from 1, so round 1 is `ladder[0]`
  - `shameFor(flags, ladder)`: the switch logic the shirt page would otherwise hold. Unit-testing
    every on/off combination is how "off" is proven without toggling the shared e2e database.
  - `lineOrder(poolSize, random)`: a shuffled permutation, re-shuffled when exhausted, never
    repeating the previous line across the cycle boundary

## R4. Dialog: native `<dialog>`

- **Decision**: a `ShameDialog` client component built on the HTML `<dialog>` element with
  `showModal()`. That gives focus trapping, Escape-to-close (he stays on the page), and a
  backdrop with no library. Three actions: the recommendation (a link), relent (a link to
  `/shirts`, owner decision 2026-10-14), and insist
  (next round).
- **Rationale**: Principle VIII (no dependency).

## R5. Confirmshaming labels

- **Decision**: `copy.shame.labels` holds a `{ shamed, neutral }` pair for `insist`, `remove`, and
  `signOut`. A pure `labelFor(key, confirmshaming)` in `src/lib/shaming/labels.ts` picks one. Pages
  read `confirmshaming` from settings and pass the chosen label down. The button's behavior is
  untouched (FR-014).

## R6. About page

- **Decision**: `/about` is a Server Component. The bio sections come straight from
  `copy.about`, so they're part of the static shell. **Exhibit A** reads the catalog at request time
  (`loadStorefront()` → `mostExpensive()`) inside `<Suspense>`, as 001 does for all catalog reads.
  "About" joins the header links (desktop and phone menu).

## R8. Developer diagnostics (owner request, added after US1)

- **Decision**: a database that's behind the code fails loudly and says how to fix it.
  - `getDb()` refuses to serve from it, and the error message names the file, the missing
    migrations, and `npm run db:migrate`.
  - `src/instrumentation.ts` reports problems at server start and adds a one-line fix to
    recognized server errors.
  - The browser console points to the terminal. The 500 page is unchanged.
  - `db:reset` also recreates the demo shopper.
- **Rationale**: the owner hit a bare 500 after pulling a migration. The check is cheap: a file stat
  per `getDb` call, plus a journal read only when the file changes. It stays out of the shopper's
  way.

## R7. Testing

- **Unit**:
  - ladder building and climbing (no score in the output)
  - line rotation (no repeats within a cycle, and none across the boundary)
  - `labelFor` on/off
  - settings validation of the new switches
- **Integration**:
  - `addItem`/`updateItem` refuse bland adds and raises when on, and allow them when off
  - decreasing a bland line still works
  - the action passes `BLAND_REFUSED` through
  - migration defaults are on
- **End-to-end** (default switches on, so the shared e2e database is never toggled):
  - the bland loop: insist 20×, relent, take the recommendation, cart unchanged
  - shaming labels on Remove and Sign out
  - About plus Exhibit A
  - About in the nav on phone and desktop

  "Off" behavior is covered by integration and unit tests, so parallel e2e runs never fight over a
  switch.
- **Update 001's card-checkout journey**: it adds Beige Regret, which shaming now refuses. Swap it for
  a non-bland shirt.
- **Timeouts** (added during implementation): Vitest's `testTimeout` is 20 s, up from the 5 s
  default. bcrypt at cost 12 (a constitution constraint) is deliberately slow. With about 30 test
  workers in parallel on one machine, a test that hashes three passwords sometimes passed 5 s, and
  that was the intermittent failure seen during US1 and R8. A real hang still fails at 20 s. For the
  same reason, 001's long no-score journey (ten pages, a sign-up and a checkout) is `test.slow()`.
- **Known gap**: e2e runs a production build, so dev-only behavior isn't exercised. That includes
  React Strict Mode's double effects, which hid T044 until the owner hit it in `next dev`.

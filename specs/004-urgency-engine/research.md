# Research: Urgency Engine (004)

Decisions that turn the spec into a buildable design. The stack is 001's (Next.js 16.4 with Cache
Components, SQLite via Drizzle, Vitest and Playwright). There are no new packages.

## R1. Three switches, one migration

- **Decision**: `store_settings` gains `fake_scarcity`, `countdown_timers` and `social_proof`.
  - Each is an integer (boolean), NOT NULL, default 1.
  - They're added in one migration, `0007` (three `ALTER TABLE … ADD`, no rebuild).
  - They're carried through `StoreSettings`, its validation, `getSettings`/`saveSettings`, the seed,
    the test fixture and `setSwitches`, exactly like 003's `per_diem_drain`.
- **Rationale**: constitution IV gives every tactic its own named switch. Columns are how 001–003 do
  it, and they're edited in Studio until the Admin Console (008).
- **Alternatives**: a single "urgency" switch was rejected, because the constitution wants one per
  tactic. A JSON blob of switches was rejected: it's unlike every existing switch and harder to
  edit.

## R2. Fake scarcity is copy, decided by one pure function

- **Decision**: `src/lib/urgency/scarcity.ts` holds `stockLine({ isBland, active, boughtBefore }, on)`,
  which returns:
  - `"scarce"` ("Only 1 left!")
  - `"again"` ("Just kidding, we actually found another one! One more left!"), for an active
    non-bland shirt he has bought before. `boughtBefore` comes from `orderedShirtIds(db, userId)`
    (his own orders only, and empty for a guest), which the pages load once per request.
  - `"plenty"` ("Plenty left. Nobody wants these.")
  - `null`: when the switch is off, or the shirt is retired

  The pages render it from the shirt view they already load (`tier.isBland`, `status`):
  - **Every shirt card** (`ShirtCard`): the listing, and also the home page and About's Exhibit A,
    which use the same card. FR-007's "listing card" covers any shirt card.
  - **The detail page**, beside the price.
  - **Each cart line.**
- **Rationale**: there's no inventory to read (spec Assumptions). One pure function keeps the three
  surfaces consistent and makes "off means none" (FR-002) a unit test.
- **Alternatives**: a stock column was rejected, because there's no inventory and nothing to store.
  Showing it only on `/shirts` cards was rejected: the same card on the home page saying nothing
  would look like the scarcity had ended.

## R3. "Oh wait, we found another one!"

- **Decision**: the cart action cores add the line to their success message when the switch is on and
  the shirt isn't bland:
  - `addToCartCore` appends it to "It's in the cart. Excellent decision."
  - `updateCartItemCore` returns it as its success message only when the new quantity is higher than
    the line's current one. Lowering or removing says nothing (spec Edge Cases).
  - `updateItem` reports the quantity it replaced, so the core can tell a raise from a cut without a
    second read.
  - `CartQuantityForm` now shows a success message as well as a failure.
- **Rationale**: the confirmation is already the action's message (001), so this is copy plus one
  comparison. It needs no client state, and it's covered by the cart action integration tests.
- **Alternatives**: a client-side toast was rejected: it would say it even when the server refused
  the add.

## R4. One shared countdown, computed rather than stored

- **Decision**:
  - **The cycle**: the first time a browser shows a countdown, it saves an **anchor**: the current
    time, in `localStorage` (`df-countdown-anchor`). The time left is always
    `DURATION − ((now − anchor) mod DURATION)`, with a 10-minute duration. It can't go below zero,
    it restarts by itself at 00:00.000 with no write, and every tab and page shows the same time
    (FR-011–FR-013). A woken tab computes from `Date.now()`, so it's right straight away.
  - **The math** is pure, in `src/lib/urgency/countdown.ts` (`remainingMs`, `formatCountdown` →
    "09:59.873"), and unit-tested at the cycle edges.
  - **The display**: a client component, `Countdown`, ticks with `requestAnimationFrame`. It writes
    the text straight to its element, so there's no React render 60 times a second (constitution VII,
    INP). The browser pauses it in background tabs.
  - **Before hydration** it shows a placeholder with the same characters ("10:00.000") in tabular
    figures, so nothing shifts (FR-006).
  - **Where**: the deal clock ("This price won't last.") beside the price on the detail page, and the
    hold ("Your shirts are reserved for") on the cart and checkout. Both read the same anchor, and the
    server only renders the hold when the cart has lines.
- **Rationale**: a computed cycle has no "expired" state to handle and nothing to persist on the
  server. `localStorage` is per browser, which covers guests and shoppers alike. It holds a
  timestamp only, never product data.
- **Alternatives**:
  - A server-stored deadline was rejected: it's a write per visitor, and the server can't render
    milliseconds that are still correct anyway.
  - A cookie was rejected: it's sent with every request for nothing.
  - A fresh countdown per page was rejected: the spec says it must carry on (US2 AC3).

## R5. Social proof on the shirt page is deterministic and drifts

- **Decision**: `src/lib/urgency/social-proof.ts` (pure) provides:
  - `lookingNow(shirtId, now)`: a per-shirt base (a hash of the id, from 3 to 40), plus a slow
    sine drift over about 20 minutes, clamped to 3–40. It changes gradually between reloads and is
    never zero (FR-014).
  - It changes by at most 3 people per minute (the analysis's U1 bound).
  - `buyerFor(shirtId, now)`: picks a coworker from the fake cast for each 10-minute window, so
    "Todd from IT just bought this pattern" holds still while he reads it.

  The detail page renders both on the server. A bland shirt gets "0 people are looking at this shirt
  right now", and no buyer line.
- **Rationale**: deterministic functions are testable (bounds, drift, no zero), and server-rendered
  lines cause no layout shift. The same shirt says the same thing to everyone at the same moment,
  which makes it more believable.
- **Alternatives**: `Math.random` per request was rejected: the number would jump on every reload,
  and it can't be tested. Real view counts were rejected: there's no analytics (out of scope).

## R6. Fake-purchase pop-ups

- **Decision**:
  - **Where it lives**: a server loader, `loadPopCandidates()` in `src/app/_data/urgency.ts`, reads
    the switch and the active non-bland shirts (name and slug). It passes them to a client component,
    `PurchasePops`, mounted in `SiteHeader` inside `<Suspense>`.
  - **The schedule**: the root layout stays mounted across client navigation, so the 20–40 s rhythm
    carries on page to page. Across full reloads, the next due time is kept in `sessionStorage`
    (`df-pop-next`).
  - **Behavior**: one pop at a time, about 6 s up, then it slides away. Its (x) closes it at once and
    schedules the next. Nothing is remembered (spec Assumptions).
  - **Background tabs**: while the tab is hidden, nothing shows. When it's visible again and a pop is
    overdue, exactly one shows (spec Edge Cases).
  - **Placement**: at `md` and up it's `fixed` bottom-right (`z-30`), clear of the bottom-left
    drain corner. Below `md`, the layout with the Menu button, it's an `absolute` full-width banner
    at the header's bottom edge (`top-full`), so it rides under the sticky header and never covers
    it (clarification 2026-10-15).
  - **Content**: a coworker and a shirt picked at random from the candidates. It links to the shirt.
- **Rationale**: client timing is the only way to "pop" without polling. Server-picked candidates
  mean a retired or bland shirt can never be named, and no real order is ever read (FR-016).
  `sessionStorage` holds a timestamp only.
- **Alternatives**: server-sent events or polling were rejected: a stream for fake data is far too
  much (constitution VIII). Real recent orders were rejected outright: that's a privacy leak.
- **Testing hook**: e2e sets `df-pop-next` to "now" with `addInitScript`, so a pop appears at once.
  It's the same key the feature uses, not a test-only switch.

## R7. Off means gone, and e2e never toggles switches

- **Decision**: each surface asks one pure helper per tactic:
  - `stockLine` (scarcity)
  - `showCountdown(settings, …)` (the countdown)
  - `socialProofFor(settings, shirt, now)` (social proof)

  Each returns `null` when its switch is off. The loaders pass nothing to the client when a tactic
  is off: no candidates and no countdown component. Integration and unit tests prove "off renders
  nothing" at that level, and e2e runs with the defaults (all on), as 002 R7 requires.
- **Rationale**: the e2e database is shared by parallel projects, so flipping a switch there would
  race other tests.

## R8. Copy and the fake cast

- **Decision**: a new `copy.urgency` holds:
  - the stock lines (scarce and plenty)
  - "Oh wait, we found another one!"
  - the deal line and the hold line
  - the "looking right now" line (`n` people, and the bland 0)
  - the purchase lines (on the page and in pop-ups)
  - the pop's (x) label
  - `cast`: at least 8 `{ name, department }` coworkers (Gary from Accounts Payable, Craig from
    Regional Sales, Todd from IT, and more)
- **Rationale**: it's brand copy, like 003's presets (FR-016). The cast isn't catalog data, so it
  doesn't belong in SQLite (CLAUDE.md "no catalog data in code" is about shirts).

## R9. Performance and layout

- **Decision**:
  - **No layout shift**: the server-rendered lines arrive with the page, the countdown keeps a fixed
    width in tabular figures, and the pop-ups are `fixed` or `absolute` overlays.
  - **Interaction**: the countdown's per-frame text write skips React.
  - **Verification**: polish runs Lighthouse (mobile) on `/shirts/geo-riot`, `/cart` and `/`,
    against CLS ≤ 0.1, LCP ≤ 2.5 s and INP-safe TBT (constitution VII).
- **Rationale**: the milliseconds were the owner's ask, and they have to stay cheap.

## R10. Testing

- **Unit**:
  - `stockLine`: on, off, bland, retired
  - `remainingMs` and `formatCountdown`: at the cycle edges, with no negatives and no "60" seconds
  - `lookingNow`: bounds over a day of samples, drift steps, never zero
  - `buyerFor`: stable inside a window, always from the cast
  - the pop schedule: `nextDelay` is 20–40 s, and an overdue pop shows exactly one
  - `socialProofFor` and `showCountdown` return null when off
- **Integration**:
  - the three switches default on and round-trip
  - migration 0007
  - `addToCartCore` and `updateCartItemCore`: "found another one" on an add and on a raise; not on
    a cut, a remove, a bland shirt, or with the switch off
- **e2e** (desktop and phone, production build):
  - **scarcity**: the card, the detail page, the cart line, and "found another one" on an add and a
    raise
  - **the countdown**: the format, a deal and hold that match, continuity across navigation, and a
    quiet reset (the anchor is set about 10 minutes back with `addInitScript`)
  - **social proof**: the page lines; a pop-up that's bottom-right on desktop and under the header
    on a phone; its (x); and no sideways scroll at 360px
- **Coverage**: `src/lib/urgency/` is pure and fully covered, and `src/lib` stays ≥ 90%.

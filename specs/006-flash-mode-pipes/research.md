# Research: Flash Mode & Pipes Background (006)

Decisions that turn the spec into a buildable design. The stack is 001's (Next.js 16.4 with Cache
Components, React 19, SQLite via Drizzle, Tailwind 4, Vitest and Playwright). There are no new
packages: the strobe is CSS, and the pipes are a 2D canvas.

## R1. Storage: two switches, one migration

- **Decision**: migration `0009` adds `flash_mode` and `pipes_background` to `store_settings`
  (booleans, NOT NULL, default 1).
  - They're carried through `StoreSettings`, `settingsSchema`, `getSettings`/`saveSettings`, the
    seed fixture, the test fixture and `setSwitches`, like every switch since 002.
  - Nothing is added to `users`: his choice belongs to his browser (R2).
- **Rationale**: switches are store data the owner edits in Studio (constitution IV pattern).

## R2. His choice: his browser's local storage

- **Decision**: `localStorage["df-awesome"]` holds `"1"` while it's on. It's missing (or `"0"`) when
  it's off.
  - **Pressing the button** sets the `<html>` attribute (R3) and the stored value at once. There's
    no server call and no page load (FR-008).
  - **Other open tabs** listen for the `storage` event and follow along (FR-009).
  - **Signing in and out** don't touch it. Two people on one browser share it, and other browsers
    keep their own (owner, after analysis).
  - **When storage isn't available** (some private modes), reads and writes are wrapped. It then
    behaves as off and doesn't throw.
- **Rationale**: the owner asked for a toggle that's remembered and not per tab, and confirmed that
  it can be specific to the browser. Local storage is shared by every tab of a browser and survives
  later visits. It never reaches the server, so there's no action, no cookie, and no account column.
- **Alternatives**:
  - `sessionStorage` was rejected: it's per tab.
  - A cookie was rejected: no server ever needs to read it.
  - An account column was rejected: the owner doesn't want browsers to sync.

## R3. First paint: an inline script sets `data-awesome` on `<html>`

- **Decision**: follow Next's "preventing flash before hydration" guide (Themes).
  - **The script**: the root layout's `<head>` has a tiny inline script. It reads
    `localStorage["df-awesome"]` inside a `try` and sets `data-awesome="on"` on `<html>` while the
    HTML is still parsing.
  - **Hydration**: `<html>` gets `suppressHydrationWarning`.
  - **Dev remount**: the toggle re-applies the attribute in a `useLayoutEffect` after React's
    Strict Mode remount in dev. In production it's a no-op.
  - **The CSS**: everything in Flash Mode keys off `:root[data-awesome="on"]`: the strobe, the
    black field, and which button label shows. A page opened with it on is painted on from the
    first frame (FR-009).
- **Rationale**: it's the documented way to avoid a flash and a hydration error. It keeps the layout
  prerenderable.
- **Alternatives**: a `useEffect` was rejected: it paints the plain store first.

## R4. Owner switches arrive with the page, as CSS

- **Decision**: the layout renders `<Suspense fallback={null}><AwesomeIsland /></Suspense>`
  (src/app/_data/awesome.ts).
  - **The read**: the island (server) reads the settings at request time (`connection()`, as in
    CLAUDE.md).
  - **What it renders**:
    - `<style>{switchOffCss(settings)}</style>`, while a switch is off
    - `<PipesBackground />`, while the Pipes switch is on (R6)
  - **`switchOffCss`** is pure (src/lib/awesome/switches.ts). It returns nothing while both are on.
    Otherwise it returns the rules that undo a feature under `:root[data-awesome="on"]`:
    - Flash Mode off: no strobe animation.
    - Pipes off: the plain field instead of the black one.
    - Both off: the button is hidden as well.
  - **Timing**: a `<style>` in the streamed HTML applies as soon as that part of the page arrives,
    before any script has loaded. It stays put through client navigations, because the layout
    persists.
- **Trade-off**: the switches can't be known before the island streams in. For the moment before
  that part of the page arrives, a shopper with it on can see a feature the owner just turned off
  (spec Edge Cases).
  - The switches default on and are for demos, so the common case paints correctly from the first
    frame.
  - Studio edits stay instant: no caching (001, owner).
- **Rationale**: one request-time read covers the switches. The rest of the layout stays static, and
  no client code is needed to apply them.
- **Alternatives**:
  - Caching the switches into the static shell was rejected: Studio edits would need revalidation.
  - A client component that sets attributes after hydration was rejected: it leaves a longer window.

## R5. The toggle: the loudest button, in the header

- **Decision**: `ExtremeAwesomeness`, a client component in `SiteHeader`, beside the cart, on every
  screen size.
  - **Behavior**: a `<button aria-pressed>`. Pressing it flips the `<html>` attribute and
    `localStorage` at once (R2).
  - **Labels**: it renders both state labels, and CSS shows the one that matches `data-awesome`.
    The server HTML is then correct for either state, with no hydration mismatch and no flash.
    `aria-pressed` follows the attribute after hydration.
  - **Loudest**: a rainbow gradient in the brand palette that slides, plus a slow pulse. It's the
    only self-animating control on the site, apart from the strobe itself (FR-007). Its colors move
    smoothly rather than flashing, so it doesn't count toward FR-011's flash limit.
  - **Phones**: at 360px the label stacks onto two short lines in a smaller display size, and the
    logo steps down a size so the bar still fits the logo, the button, the cart and Menu. e2e
    checks there's no sideways scroll.
- **Rationale**: the header is on every page and never covered (FR-006). The bottom corners belong
  to the per diem corner and the pop-ups.

## R6. The pipes: a 2D canvas behind the page, a pure growth engine

- **Decision**:
  - **The engine**: `src/lib/pipes/engine.ts` is a pure, seeded engine. Its constants are exact
    (analysis A2):

    | Constant | Value | Meaning |
    |---|---|---|
    | `CELL_PX_PHONE` | 28 | cell size below 768 px wide |
    | `CELL_PX` | 40 | cell size otherwise |
    | `MAX_PIPES` | 4 | pipes growing at once |
    | `CLEAR_AT` | 0.7 | how full the grid gets before it clears |
    | `TEAPOT_ODDS` | 1/60 | the share of joints that are teapots |
    | `STEPS_PER_SECOND` | 6 | growth speed: a desktop fills in about 20 s (it was 25, which cleared every 5 s; tuned in T020) |

    - Each pipe moves one cell per step: straight, or turned 90°, only into free cells. A turn
      leaves a joint.
    - A pipe that has nowhere to go ends, and a new one starts in a free cell.
    - When the grid reaches `CLEAR_AT`, or nothing can start, the engine says "clear", and the
      screen starts over.
    - Colors come from the classic set: red, green, blue, yellow, cyan, magenta and white.
    - It's pure, with no DOM or canvas, so unit tests cover the turn rules, occupancy, endings,
      clearing, teapots, and the determinism of a seed.
  - **Pacing**: `src/lib/pipes/loop.ts` holds `stepsDue(elapsedMs, stepsPerSecond, maxPerFrame)`.
    It's time-based, and never more than `maxPerFrame`, so on a slow device the pipes fall behind
    rather than stealing frames from scrolling (FR-018).
  - **The canvas**: `PipesBackground` (client, mounted by the island in src/app/_data/awesome.ts) is
    a `<canvas>` that's `position: fixed`, `inset: 0`, `z-index: -1` and `pointer-events: none`, so it
    can never cover or catch a tap (FR-003). It sits on a black field, the original screensaver's
    backdrop, under `:root[data-awesome="on"]`. A `MutationObserver` on `<html>` starts and stops it as
    he toggles.
  - **The look**: each segment is a tube, drawn as a band with a linear gradient across it (dark
    edge, colored body, bright highlight), so it reads as "3D". Joints are radial-gradient balls,
    and teapots are a small drawn silhouette.
  - **Drawing**: it's incremental. Each step draws only the new segment, never a repaint of the
    whole screen.
  - **Pausing and resizing**: `visibilitychange` pauses and resumes (FR-017). A debounced resize
    clears and starts over for the new size (FR-015).
  - **Sizing**: the device pixel ratio is capped at 2.
  - **Printing**: no canvas and no strobe.
  - **The page doesn't jump**: the canvas is fixed and out of flow, so it adds no layout shift
    (SC-004).
- **Rationale**: a 2D canvas is enough to read as the screensaver, and it costs no dependency
  (constitution VIII). Incremental drawing keeps it cheap (VII).
- **Alternatives**:
  - WebGL with three.js was rejected: it's a new dependency and heavier on phones, for a
    background.
  - SVG or DOM pipes were rejected: thousands of nodes, and layout work on every step.

## R7. The strobe: a stepped clock that recolors backgrounds and borders

- **Decision** (revised by analysis I1, and again in T024 for speed):
  - **Never text.** The strobe never changes a text color, and never touches a theme color token.
    Text in paper or any brand color keeps its color, so the strobe can't make it match its button.
  - **The clock**: `StrobeClock`, a client component with no UI, moves `data-strobe-step` on
    `<html>` every `STROBE_HOLD_MS` (400 ms) while Extreme Awesomeness is on and the page can be
    seen. The inline `<head>` script starts it at step 0 before first paint. The island mounts the
    clock only while the owner's Flash Mode switch is on.
  - **The colors**: `strobeCss()` (src/lib/awesome/strobe.ts) writes one set of rules per step,
    straight onto the classes that strobe. They're rendered into the layout's `<head>` as a static
    `<style>`:
    - `.bg-paper` and `.field-backing` backgrounds step through the paper palette
    - `.solid-backing` (heading and label backings) steps through the dark palette
    - `.border-ink` and `.field-backing` borders step through the edge palette
    - the page field (`body`) strobes only while the pipes aren't covering it
      (`fieldStrobeCss()`, from the switch-off CSS)
  - **The palettes** are per backing:

    | Palette | Colors | Leaves out |
    |---|---|---|
    | Paper | highlighter, acid, electric cyan, safety orange, paper | hot pink (hot-pink text sits on paper) and ultraviolet (too dark for ink) |
    | Dark | ink, ultraviolet | hot pink and the light colors (paper and highlighter text sit on these) |
    | Edge | any brand color | (only borders read it) |

    Text stays readable at every step (FR-010).
  - **Rate**: every color holds for 400 ms, so at most 2.5 changes a second on any element, under
    FR-011's limit of 3.
  - **The sale stays steady**: every step rule skips `[data-steady]` and its subtree.
    - That covers prices (`PriceTag`), tier badges (`ShirtBadge`) and Add to Cart.
    - It also covers the dialogs, the per diem corner, the pop-ups, the countdowns, the money rows
      and the Extreme Awesomeness button (FR-012).
  - **Flash Mode switched off**: the switch-off CSS holds those classes at their normal colors.
- **Rationale**: changing one attribute on `<html>` only restyles the elements whose rules depend on
  it, 2.5 times a second. The two earlier designs were measured in T024, with Lighthouse at mobile
  throttling:

  | Design | Style and layout work, home page | Why |
  |---|---|---|
  | A stepped CSS animation of inherited variables on `:root` | about 2.3 s | Chrome ticks CSS animations every frame, so the whole page restyled 60 times a second |
  | Per-element animations of registered variables | 8–17 s | more work every frame, not less |
  | **This design** | 0.35 s | (off: 0.23 s) |

- **Alternatives**:
  - Animating the theme tokens was rejected (analysis I1). For example, `--color-paper` is also the
    text color of every hot-pink button, so that text would vanish.
  - CSS animations were rejected after measuring, as above.

## R8. Text never sits on a pipe

- **Decision**:
  - **The marker**: a `field-backing` utility, opt-in, goes on every text block that sits straight
    on the page field: page titles, intro lines, "Signed in as…", empty states, and so on.
    - On the plain paper field it's `bg-paper`, so it's invisible and changes nothing.
    - Under the black field it gains a little padding and an ink border, so it's a solid backing
      (FR-016).
  - **The audit**: an e2e check walks every visible text node in `<main>` with it on, on every route.
    It fails when it reaches `<main>` without finding an ancestor with a solid background, like
    001's no-score audit.
- **Rationale**: opt-in keeps cards and buttons as they are. The audit catches any page added later.
- **Alternatives**: one paper panel behind the whole column was rejected: at 360px it would hide the
  pipes completely (US2 AC6).

## R9. Which pages get it

- **Decision**:
  - **Every page under the root layout**, including 404 (`not-found`) and 500 (`error`), gets the
    button, the strobe and the pipes.
  - **Unchanged**: the 418 teapot page (a route handler with its own HTML) and the last-resort
    `global-error` screen. Both stand alone, without the header.

## R10. Testing and verification

- **Unit**:
  - the pipes engine, with its exact constants, and `stepsDue` (R6)
  - the strobe constants and palettes, and the step rules `strobeCss()` and `fieldStrobeCss()` write (R7)
  - the stored-value helpers and the inline script's source (R2, R3)
  - `switchOffCss` (R4)
- **Integration**: migration `0009`, and the switches round-trip.
- **e2e** (desktop and phone, production build):
  - **US1**:
    - the button in the header, and off at first
    - **press it**:
      - it's on at once
      - a card's background changes, at no more than 3 changes in any second by sampling
      - prices, badges and Add to Cart keep their computed colors
      - no text gets harder to read than it was, or below 3:1 if it started higher, at any sampled
        step. That includes hot-pink buttons like Check out (analysis I1).
    - no shopper-visible "strobe" (analysis C4)
    - **it stays**: reload, a new tab, another open tab following along, signing in and out
    - a fresh browser context is off
    - no sideways scroll at 360px
  - **US2**:
    - with it on, the canvas is present and drawing
    - it pauses while hidden, and starts over on resize (analysis C2)
    - it's behind everything: `elementFromPoint` returns the controls, never the canvas
    - the text-backing audit across routes (R8)
    - it stops when he turns it off
  - **Everything on** (analysis C1): one smoke journey with it on: browse, zoom, add, a roach-motel
    lower in the cart, checkout by card, then the account.
  - **Load**: the toggle changes only that test's own browser context (its local storage), and the
    e2e journeys never toggle owner switches (002 R7). The pipes run only in the three journeys that
    turn it on.
- **React Strict Mode** (`next dev`), per 002's lesson:
  - one animation loop
  - one observer
  - the attribute re-applied after the dev remount
  - a clean console
- **Lighthouse** (polish): mobile, with it on (`df-awesome=1` set before load), on `/`,
  `/shirts/geo-riot` and `/checkout`. The budget is LCP ≤ 2.5 s and CLS ≤ 0.1, with TBT noted (SC-004,
  constitution VII).

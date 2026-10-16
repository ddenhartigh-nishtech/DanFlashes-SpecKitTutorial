# Research: Flash Mode & Pipes Background (006)

Decisions that turn the spec into a buildable design. The stack is 001's (Next.js 16.4 with Cache
Components, React 19, SQLite via Drizzle, Tailwind 4, Vitest and Playwright). There are no new
packages: the strobe is CSS, and the pipes are a 2D canvas.

## R1. Storage: two switches and one account column, one migration

- **Decision**: migration `0009` adds:
  - **`store_settings`**: `flash_mode` and `pipes_background`, booleans, NOT NULL, default 1. They're
    carried through `StoreSettings`, `settingsSchema`, `getSettings`/`saveSettings`, the seed
    fixture, the test fixture and `setSwitches`, like every switch since 002.
  - **`users`**: `extreme_awesomeness`, boolean, NOT NULL, default 0. It's his saved choice.
- **Rationale**: switches are store data the owner edits in Studio (constitution IV pattern). A
  signed-in choice that follows him to another device has to live on the account (clarify).
- **Alternatives**: a separate preferences table was rejected: it's one boolean, and `users` already
  carries per-account display data (`display_name`).

## R2. His choice: a cookie, kept in step with his account

- **Decision**: the browser's copy is a cookie, `df_awesome` (`1` or `0`).
  - It lasts a year, with `SameSite=Lax` and `path=/`. It's **not** `httpOnly`, because the inline
    script (R3) reads it before first paint.
  - It's a cookie rather than `localStorage` because it's sent with every request. Sign-up can then
    read a guest's choice without the form carrying it.
- **The rules** (spec FR-009):
  - **Pressing the button** sets the attribute and the cookie in the browser at once, then calls a
    Server Action, `saveExtremeAwesomeness(on)`.
    - The action sets the cookie again, and saves to `users.extreme_awesomeness` when he's signed
      in.
    - A guest's call only refreshes the cookie.
  - **Sign-in** (`signInCore`): after the session starts, the cookie is set to the account's choice.
    The account takes over.
  - **Sign-up** (`signUpCore`): the new account is saved with the cookie's current value. It keeps
    what he chose as a guest.
  - **Sign-out**: the cookie stays, so the page doesn't change under him.
  - **Two devices**: if he changes it on one device, the other catches up on its next page. The
    island (R4) sees that the signed-in account differs from the cookie and applies the account.
- **Rationale**: the owner asked for a toggle scoped to the user, remembered and persisted, and not
  per tab. One cookie covers every tab and visit. The account carries it across devices.
- **Alternatives**:
  - `sessionStorage` (per tab) and `localStorage` (invisible to the server at sign-up) were both
    rejected.
  - Reading the cookie on the server to render the page was also rejected. Reading it in the root
    layout would make every segment block under Cache Components (R3).

## R3. First paint: an inline script sets `data-awesome` on `<html>`

- **Decision**: follow Next's "preventing flash before hydration" guide (themes, "Storing the theme
  in a cookie").
  - **The script**: the root layout's `<head>` has a tiny inline script. It reads `df_awesome` from
    `document.cookie` and sets `data-awesome="on"` on `<html>` while the HTML is still parsing.
  - **Hydration**: `<html>` gets `suppressHydrationWarning`.
  - **Dev remount**: the toggle re-applies the attribute in a `useLayoutEffect` after React's
    Strict Mode remount in dev. In production it's a no-op.
  - **The CSS**: everything in Flash Mode keys off `:root[data-awesome="on"]`: the strobe, the
    black field, and which button label shows. A page opened with it on is painted on from the
    first frame (spec FR-009, edge case "The first paint").
- **Rationale**: it's the documented way to avoid a flash and a hydration error. It keeps the layout
  prerenderable.
- **Alternatives**:
  - A `useEffect` was rejected: it paints the plain store first.
  - `cookies()` in the layout was rejected: it blocks every page under Cache Components.

## R4. Owner switches reach the page through one island

- **Decision**: the layout renders `<Suspense fallback={null}><AwesomeIsland /></Suspense>`.
  - **The island** (server) reads the settings and the signed-in user's choice at request time
    (`connection()`, as in CLAUDE.md). It renders:
    - `<AwesomeState switches={…} account={…} />`, a client component with no UI. In a
      `useLayoutEffect`, it:
      - sets `data-strobe="off"` and `data-pipes="off"` on `<html>` while those switches are off
      - hides the button while both are off
      - applies the account's choice when it differs from the cookie (R2)
    - `<PipesBackground />`, only while the Pipes switch is on (R6).
  - **The CSS** reads the switches as exclusions: the strobe is
    `:root[data-awesome="on"]:not([data-strobe="off"])`, and the pipes and the black field are
    `…:not([data-pipes="off"])`.
- **Trade-off**: the switches can't be known before the island streams in. While a switch is off and
  he has it on, the strobe or the black field can show for the moment before hydration, then goes.
  - The switches default on and are for demos, so the common case paints correctly from the first
    frame.
  - Studio edits stay instant: no caching (001, owner).
- **Rationale**: one place reads the request-time facts, and the rest of the layout stays static.
- **Alternatives**:
  - Caching the switches into the static shell was rejected: Studio edits would need revalidation.
  - A second cookie mirroring the switches was rejected: it's another source of truth for a demo
    control.

## R5. The toggle: the loudest button, in the header

- **Decision**: `ExtremeAwesomeness`, a client component in `SiteHeader`, beside the cart, on every
  screen size.
  - **Behavior**: a `<button aria-pressed>`. Pressing it flips the `<html>` attribute and the
    cookie at once, then calls `saveExtremeAwesomeness` in a transition (R2). No page refresh is
    needed.
  - **Labels**: it renders both state labels, and CSS shows the one that matches `data-awesome`.
    The server HTML is then correct for either state, with no hydration mismatch and no flash.
    `aria-pressed` follows the same attribute after hydration.
  - **Loudest**: a rainbow gradient in the brand palette that slides, plus a slow pulse. It's the
    only self-animating control on the site (FR-007). Its colors move smoothly rather than
    flashing, so it doesn't count toward FR-011's flash limit.
  - **Phones**: at 360px the label stacks onto two short lines in a smaller display size, and the
    logo steps down a size so the bar still fits the logo, the button, the cart and Menu. e2e
    checks there's no sideways scroll.
- **Rationale**: the header is on every page and never covered (FR-006). The bottom corners belong
  to the per diem corner and the pop-ups.

## R6. The pipes: a 2D canvas behind the page, a pure growth engine

- **Decision**:
  - **The engine**: `src/lib/pipes/` holds a pure, seeded engine.
    - It works on a grid sized from the viewport. Cells are about 28 px on phones and about 40 px
      on desktops.
    - Several pipes (up to 4) grow at once, one cell per step.
    - Each pipe goes straight, or turns 90° with some chance, only into free cells. A turn leaves a
      joint.
    - A pipe that has nowhere to go ends, and a new one starts in a free cell.
    - When the grid is about 70% full, or nothing can start, the engine says "clear", and the
      screen starts over.
    - Every so often (about 1 in 60 joints) a joint is a teapot.
    - Colors come from the classic set: red, green, blue, yellow, cyan, magenta and white.
    - It's pure, with no DOM or canvas, so unit tests cover the turn rules, occupancy, endings,
      clearing, teapots, and the determinism of a seed.
  - **The canvas**: `PipesBackground` (client) is a `<canvas>` that's `position: fixed`, `inset: 0`,
    `z-index: -1` and `pointer-events: none`, so it can never cover or catch a tap (FR-003). It
    sits on a black field, the original screensaver's backdrop. The black field and the canvas show
    only under `:root[data-awesome="on"]:not([data-pipes="off"])`. A `MutationObserver` on `<html>`
    starts and stops it as he toggles.
  - **The look**: each segment is a tube, drawn as a band with a linear gradient across it (dark
    edge, colored body, bright highlight), so it reads as "3D". Joints are radial-gradient balls,
    and teapots are a small drawn silhouette.
  - **Drawing**: it's incremental. Each step draws only the new segment, so a frame costs one small
    draw, never a repaint of the whole screen.
  - **Timing**: steps are time-based (about 25 a second) through `requestAnimationFrame`. A frame
    never draws more than a few steps, so on a slow device the pipes fall behind rather than
    stealing frames from scrolling (FR-018).
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

## R7. The strobe: CSS custom properties on a stepped clock

- **Decision**:
  - **What changes**: under `:root[data-awesome="on"]:not([data-strobe="off"])`, a keyframe
    animation on `:root` steps a few of the theme's custom properties through the brand palette:
    - the page and card background (`--color-paper`, which is what `bg-paper` uses)
    - the border color (an override on `.border-ink` that reads a cycling variable)
    - the heading backing
  - **Readability**: ink text stays ink, and paper backgrounds cycle only through colors that ink
    reads on (hot pink, electric cyan, highlighter, acid, safety orange; not ultraviolet). Text on an
    ink backing cycles through the light colors. Text stays readable at every step (FR-010).
  - **Rate**: every color holds for at least 400 ms. That's at most 2.5 changes a second on any
    element, under FR-011's limit of 3. The duration and step count are constants in one module,
    with a unit test asserting the rate.
  - **The sale stays steady**: prices (`PriceTag`), tier badges (`ShirtBadge`) and Add to Cart
    carry a `data-steady` marker that pins the custom properties back to their fixed values for
    their subtree, with no animation (FR-012). So do the dialogs, the per diem corner, the pop-ups,
    the countdowns and the Extreme Awesomeness button.
- **Rationale**: one animation on `:root` drives every color change. That's one style recalculation
  per step, not hundreds of animations, and it's cheap enough for phones.
- **Alternatives**:
  - Per-element JavaScript color cycling was rejected: it's costly, and it fights React.
  - Full-screen white flashes were rejected: the owner chose Q1 B, and they're the riskiest kind of
    flash.

## R8. Text never sits on a pipe

- **Decision**:
  - **The marker**: a `field-backing` utility, opt-in, goes on every text block that sits straight
    on the page field: page titles, intro lines, "Signed in as…", empty states, and so on.
    - On the plain paper field it's `bg-paper`, so it's invisible and changes nothing.
    - Under the pipes it gains a little padding and an ink border, so it's a solid backing (FR-016).
  - **The audit**: an e2e check walks every visible text node in `<main>` with the pipes on, on
    every route. It fails when it reaches `<main>` without finding an ancestor with a solid
    background, like 001's no-score audit.
- **Rationale**: opt-in keeps cards and buttons as they are. The audit catches any page added later.
- **Alternatives**:
  - One paper panel behind the whole column was rejected: at 360px it would hide the pipes
    completely (US2 AC6).

## R9. Which pages get it

- **Decision**:
  - **Every page under the root layout**, including 404 (`not-found`) and 500 (`error`), gets the
    button, the strobe and the pipes.
  - **Unchanged**: the 418 teapot page (a route handler with its own HTML) and the last-resort
    `global-error` screen. Both stand alone, without the header. The spec's edge case was corrected
    to match.

## R10. Testing and verification

- **Unit**:
  - the pipes engine (R6)
  - the strobe rate constants (R7)
  - the cookie value parsing and serialization, and the inline script's source (R2, R3)
- **Integration**:
  - migration `0009`
  - the switches round-trip
  - `saveExtremeAwesomenessCore`: guest versus signed in
  - sign-up carries the guest's choice, and sign-in applies the account's choice
  - sign-out keeps the cookie
  - the island's props, for each switch combination
- **e2e** (desktop and phone, production build):
  - **US1**:
    - the button in the header, and off at first
    - press it: `aria-pressed`, the attribute, and a card's background changing over time, at no
      more than 3 changes in any second by sampling
    - prices, badges and Add to Cart keep their computed colors
    - a reload, a new tab, and a later visit (a new page in the same context) are all still on
    - sign-up keeps it, and another context that signs in gets it
    - no sideways scroll at 360px
  - **US2**:
    - with it on, the canvas is present and drawing (pixels change over a second)
    - it's behind everything: `elementFromPoint` at the cart and at Add to Cart returns the
      control, not the canvas
    - the text-backing audit across routes (R8)
    - it stops when he turns it off
  - **Load**: the e2e journeys never toggle owner switches (002 R7), and the toggle only changes
    that test's own browser context. The pipes run only in the journeys that turn Extreme
    Awesomeness on, so the rest of the suite carries no extra load.
- **React Strict Mode** (`next dev`), per 002's lesson:
  - one animation loop
  - one observer
  - the attribute re-applied after the dev remount
  - a clean console
- **Lighthouse** (polish): mobile, with `df_awesome=1`, on `/`, `/shirts/geo-riot` and `/checkout`.
  The budget is LCP ≤ 2.5 s and CLS ≤ 0.1, with TBT noted (SC-004, constitution VII).

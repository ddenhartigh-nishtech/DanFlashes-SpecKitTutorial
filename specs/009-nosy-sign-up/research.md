# Research: Nosy Sign-Up (009)

Decisions that turn the spec into a buildable design. The stack is 001's (Next.js 16.4 with Cache
Components, React 19, SQLite via Drizzle, Tailwind 4, Vitest and Playwright). There are no new
packages.

## R1. Storage: one switch, one migration

- **Decision**: migration `0010` adds `nosy_sign_up` to `store_settings` (boolean, NOT NULL,
  default 1).
  - It's carried through `StoreSettings`, `settingsSchema`, `getSettings`/`saveSettings`, the seed
    fixture, the test fixture and `setSwitches`, like every switch since 002.
  - Nothing else is stored. There is no table, column, cookie or browser storage for what he types
    (spec Key Entities).
- **Rationale**: the switch is store data the owner edits in Studio (constitution IV pattern).

## R2. The nosy fields live outside the sign-up form

- **Decision**:
  - **Two parts**: on the sign-up page, `AuthForm` renders the real `<form>` (what Dan should call
    him, email, password, `next`) and, after it, a separate `NosyFields` block that's **not inside
    any `<form>`**.
  - **The button**: Sign up comes last and joins the real form through its `form` attribute
    (`<button type="submit" form="sign-up-form">`). It sits after every nosy field, at the very
    bottom (spec FR-003).
- **Defense in depth** (FR-004, FR-005):
  - The nosy inputs have **no `name`**, and they aren't form-associated (`input.form === null`).
  - A form submission only carries named controls that belong to its form, so they can't be part of
    the sign-up request. That would hold even if someone later gave one a name.
  - `signUpCore` is unchanged: it reads `displayName`, `email` and `password` only.
- **Rationale**: the constitution says nosy fields are never submitted, and this makes that a
  property of the HTML, not a convention someone has to remember.
- **Alternatives**: inputs inside the form without names would work today, but one added `name`
  away from a leak. That was rejected.

## R3. No autofill, no remembering, no spellcheck, no password manager

- **Decision**: every nosy input gets:
  - `autocomplete="off"`, so the browser neither fills nor remembers it
  - `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`. A browser's enhanced
    spellcheck can send typed text to a service.
  - the password managers' ignore hints: `data-1p-ignore`, `data-lpignore="true"`,
    `data-bwignore`, `data-form-type="other"`
  - no `id` or `name` that reads like a known autofill field (each input is wrapped by its label)
- **Rationale**: FR-005. Because the inputs are outside the form (R2), a password manager reading the
  sign-up form never sees them as candidate username or password fields.

## R4. Masking without being a password

- **Decision**:
  - The Social Security Number and mother's maiden name inputs are `type="text"`, masked with the
    CSS `-webkit-text-security: disc` (supported in Chrome, Edge, Safari and Firefox).
  - They're **not** `type="password"`, which would invite a password manager to save them.
- **Rationale**: FR-006.

## R5. Gone when he leaves

- **Decision**: `AuthForm` (client) clears every nosy input and resets Dan's line (R6), in one stable
  effect. `NosyFields` only renders the fields. It clears them:
  - in that effect's cleanup, which runs when Next hides the page he left (005's lesson) and on
    unmount
  - on `pagehide`, so the back-forward cache never brings them back
  - after a successful sign-up the page redirects, which unmounts it

  The clearing sits in `AuthForm`, not in `NosyFields`, on purpose (converge F1). An effect in
  `NosyFields` that took a callback from the form would rerun on every re-render, and so wipe the
  fields the moment Dan's line appeared.
- **Rationale**: FR-007. React never holds the values: the inputs are uncontrolled, and a ref reads
  them only to know whether they're empty (R6).
- **Alternatives**: controlled inputs in React state were rejected. They'd put every keystroke into
  component state for no reason.

## R6. "Dan noticed you skipped a few. He'll allow it."

- **Decision**: a pure `shouldNudge({ anyBlank, nudged })` decides the first press.
  - **The handler**: the real form's `onSubmit` calls it. If any nosy input is empty (by a trimmed
    emptiness check in the browser, never sent) and Dan hasn't said his line yet, it calls
    `preventDefault()`, which stops React's form action. It then shows the line and remembers that
    it did.
  - **The next press** goes through.
  - **Once per visit**: the "said it" flag resets with the fields when he leaves, in the same effect
    cleanup and on `pagehide` (R5, analysis U1).
  - **The browser's own checks come first**: the submit event only fires once the real fields are
    valid, so Dan's line never pre-empts them.
- **Rationale**: FR-008, and FR-010's emptiness-only exception.

## R7. The asterisks

- **Decision**: while the switch is on:
  - the email and password labels get `**`
  - a legend above the button says "** Actually required."
  - What Dan should call him stays unmarked (FR-009).

  With the switch off, there are none (FR-002).

## R8. The copy

- **Decision**: `copy.nosy` in src/lib/copy.ts holds:
  - the section heading
  - the "Required" mark
  - the field list, in order, each with its label and whether it's masked
  - Dan's line
  - the legend

  The starting list is the spec's ten (Assumptions), in that order. Every label is in voice and never
  explains the joke.

## R9. Testing and verification

- **Unit**:
  - `copy.nosy`: at least 10 fields, including the roadmap's four (SSN, blood type, medications,
    mother's maiden name). Only SSN and mother's maiden name are masked.
  - `shouldNudge`
- **Integration**: migration `0010`, and the switch round-trips.
- **e2e** (desktop and phone, production build), with a distinctive sentinel typed into every nosy
  field:
  - **Nothing leaves the browser** (SC-001): every request's URL, headers and body are captured, and
    none contains a sentinel.
  - **Nothing is stored or logged**:
    - after sign-up, the e2e database file and its WAL hold no sentinel
    - nor do `localStorage`, `sessionStorage` or the cookies
    - nor does any console message
  - **The fields are props**: no `name`, `form === null`, `autocomplete="off"`, spellcheck off,
    the ignore hints; SSN and mother's maiden name are masked.
  - **The nudge**: blanks mean the first press shows Dan's line and stays on the page, and the second
    press lands on `/account`. All filled, the first press signs up.
  - **Leaving**: type, navigate away, go Back: the fields are empty.
  - **The rest**: the `**` marks and the legend; 360px with no sideways scroll; the account is exactly
    the real fields.
  - **Under the pipes**: 006's text-backing audit already covers `/sign-up`, which now includes the
    nosy fields.
- **React Strict Mode** (`next dev`), with a clean console:
  - the nudge shows once
  - the fields clear on leaving
- **Lighthouse** (polish): mobile, `/sign-up` with the switch on. LCP ≤ 2.5 s and CLS ≤ 0.1 (SC-005).
- **Can't be automated**: the browser's autofill UI and real password-manager extensions. They get a
  manual check in quickstart, backed by the attribute checks above.

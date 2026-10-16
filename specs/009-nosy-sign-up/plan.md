# Implementation Plan: Nosy Sign-Up

**Branch**: `009-nosy-sign-up` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-nosy-sign-up/spec.md`

## Summary

While the new `nosy_sign_up` switch is on (migration 0010, default on), the sign-up page asks for far
too much.

- **The layout**: one long scroll of absurd personal questions follows the real fields, each marked
  "Required". Sign up waits at the very bottom, with email and password marked `**` and a "** Actually
  required." legend.
- **The fields are props.** They're unnamed inputs **outside the sign-up `<form>`**, so the HTML
  itself guarantees they're never submitted.
  - Autofill, spellcheck and password managers are all turned off.
  - The Social Security Number and mother's maiden name are masked without being password fields.
  - Everything is cleared when he leaves the page.
- **The nudge**: if any is blank, the first press of Sign up gets "Dan noticed you skipped a few.
  He'll allow it.", and the next press signs him up.
- **The server's sign-up is unchanged.**

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components,
React 19, Tailwind 4)

**Primary Dependencies**: unchanged; no new packages.

**Storage**: SQLite. One migration, `0010`, adds one `store_settings` switch. Nothing he types is
stored anywhere. See [data-model.md](./data-model.md).

**Testing**: Vitest (unit and integration) and Playwright (e2e, desktop and phone, production build).
`npm run verify` gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Performance Goals**: `/sign-up` keeps LCP ≤ 2.5 s and CLS ≤ 0.1 (constitution VII). It's static
markup and copy.

**Constraints**:
- Nosy fields are never submitted, stored or logged, and have no form names and no autofill
  (constitution, commerce constraints).
- "Required" never blocks sign-up.
- No change to sign-in, accounts or money paths.
- e2e never toggles owner switches in the shared database (002 R7).

All Technical Context items are resolved. See [research.md](./research.md) (R1–R9).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 009 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | Every label, the "Required" marks, Dan's line and the legend live in `copy.nosy`, in voice. The joke is never explained. "** Actually required." reads as deadpan fine print, as on any real form, not as an explanation (owner's addition; analysis K1). | ✅ | ✅ |
| II | Complexity Is the Price | Untouched. | ✅ | ✅ |
| III | Relentlessly Vibrant | Untouched. | ✅ | ✅ |
| IV | Shamelessly Manipulative | A data-grab played straight, behind its own switch, on by default. | ✅ | ✅ |
| V | Maximum Visual Assault | Loud, from 360px up, readable under Extreme Awesomeness (006's backings and audit). | ✅ | ✅ |
| VI | Fully Tested | The one rule that matters ("never submitted, stored or logged") gets e2e proof: sentinel values are checked against every request, the database files, browser storage and the console. Unit tests cover the copy list and `shouldNudge`. The migration and switch get integration tests. `src/lib` stays ≥ 90%. | ✅ | ✅ |
| VII | Fast | Static markup and copy; Lighthouse is re-checked on `/sign-up` in polish. | ✅ | ✅ |
| VIII | Simple Code | No packages, no server changes, one client component and one pure helper. | ✅ | ✅ |
| C | Commerce constraints | **"Nosy fields are props"** is the feature: no names, no autofill, outside the form, never submitted, stored or logged (R2–R5). The other commerce rules are untouched. | ✅ | ✅ |
| W | Workflow | Feature branch; spec → clarify → plan → tasks → analyze → implement → converge; merge by PR. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design). There are no deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/009-nosy-sign-up/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # the /sign-up delta; the signUp action is unchanged
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001–006 layout)

```text
drizzle/0010_*.sql                    # new: store_settings.nosy_sign_up
scripts/seed-data.ts                  # settings defaults gain the switch
src/
├── app/_data/auth-page.tsx           # passes the switch to AuthForm (sign-up only)
├── components/
│   ├── AuthForm.tsx                  # id'd real form; ** marks; the legend; Sign up after NosyFields (form="…")
│   └── NosyFields.tsx                # new (client): the unnamed, unattached inputs; clears on leaving
└── lib/
    ├── nosy/nudge.ts                 # new (pure): shouldNudge
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # the switch
    └── copy.ts                       # copy.nosy
tests/
├── unit/nosy.test.ts                                                           # new
├── unit/catalog-validate.test.ts, integration/settings-switches.test.ts        # updated
├── integration/migration-0010.test.ts                                          # new
└── e2e/nosy-sign-up.spec.ts                                                    # new
```

**Structure Decision**: this extends the single project.
- **The rule's guarantee** sits in the markup: no names, outside the form.
- **The one piece of logic** is pure (`shouldNudge`).
- **The server** doesn't change.

## Complexity Tracking

No constitution deviations. One choice is worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| The nosy inputs sit **outside the `<form>`**, and Sign up joins the form with its `form` attribute | It makes "never submitted" a property of the HTML. A future `name` couldn't leak them, and password managers reading the form never see them. | Unnamed inputs inside the form work today, but they're one attribute away from a leak. |

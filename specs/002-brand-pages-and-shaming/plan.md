# Implementation Plan: Brand Pages & Bland-Shirt Shaming

**Branch**: `002-brand-pages-and-shaming` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-brand-pages-and-shaming/spec.md`

## Summary

Three additions to the 001 storefront:

1. **The endless "You sure about that?" loop.** While bland-shirt shaming is on, adding a BLAND-tier
   shirt opens a dialog. Insisting only produces another round, each with a fresh insult and a more
   complicated recommendation. The store refuses bland adds and bland quantity raises itself, so the
   gag can't be bypassed.
2. **Confirmshaming labels** on three decline choices: the loop's insist button, the cart's Remove,
   and Sign out.
3. **An About page**: Dan's egocentric bio from brand copy, plus a live Exhibit A (the most expensive
   shirt).

Both tactics are new `store_settings` switches, on by default.

## Technical Context

**Language/Version**: unchanged from 001 (TypeScript on Node 22, Next.js 16.4 with Cache Components)

**Primary Dependencies**: unchanged; no new packages. The dialog is native `<dialog>`.

**Storage**: SQLite. One migration adds `store_settings.bland_shaming` and
`store_settings.confirmshaming` (R1).

**Testing**: Vitest (unit and integration) and Playwright (e2e, desktop and phone). `npm run verify`
gates merge.

**Target Platform / Project Type / Scale**: unchanged from 001

**Constraints**:
- the complexity score never reaches the browser (the ladder is in shopper shape)
- bland refusal is enforced by the store
- e2e tests never toggle switches in the shared database (R7)

All Technical Context items are resolved. See [research.md](./research.md) (R1–R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v4.0.0.

| # | Principle / Rule | How 002 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | The bio, insults, refusal, and labels all live in `copy.ts`, in voice. The joke is never explained. | ✅ | ✅ |
| II | Complexity Is the Price | No pricing change. The ladder and Exhibit A carry badges and prices only, never scores (R3). | ✅ | ✅ |
| III | Relentlessly Vibrant | Bland shirts exist only to be disparaged. With shaming on, they can't be bought at all. | ✅ | ✅ |
| IV | Shamelessly Manipulative | Bland-shirt shaming and confirmshaming each get their own named on/off switch (R1). | ✅ | ✅ |
| V | Maximum Visual Assault | The dialog and About page use 001's loud tokens, responsive from 360px. | ✅ | ✅ |
| VI | Fully Tested | Pure loop and label logic is unit-tested. Cart refusal is integration-tested. Each story has an e2e journey. `verify` gates merge. | ✅ | ✅ |
| VII | Fast | The About bio is in the static shell. Exhibit A streams. The dialog adds no dependencies. | ✅ | ✅ |
| VIII | Simple Code | No new packages, native `<dialog>`, a two-column migration. | ✅ | ✅ |
| C1–C6 | Commerce & Security | Money paths are untouched. Refusals write nothing. | ✅ | ✅ |
| W | Workflow | Feature branch, spec → plan → tasks → analyze → implement → converge. Merge by PR. | ✅ | ✅ |

**Result**: PASS (pre-research and post-design), with no deviations.

## Project Structure

### Documentation (this feature)

```text
specs/002-brand-pages-and-shaming/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/changes.md       # deltas to 001's routes and actions
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (changes to the 001 layout)

```text
drizzle/0001_*.sql                    # new: store_settings switches
src/
├── app/
│   ├── about/page.tsx                # new: /about (bio + streamed Exhibit A)
│   ├── shirts/[slug]/page.tsx        # pass isBland, shaming switch, ladder, insist label to AddToCart
│   ├── cart/page.tsx                 # Remove label from confirmshaming
│   └── account/page.tsx              # Sign out label from confirmshaming
├── components/
│   ├── ShameDialog.tsx               # new: native <dialog>, endless rounds
│   ├── AddToCart.tsx                 # opens ShameDialog for bland shirts when shaming is on
│   └── SiteHeader.tsx                # "About" link
└── lib/
    ├── shaming/loop.ts               # new: buildLadder, recommendationFor, lineOrder
    ├── shaming/labels.ts             # new: labelFor(key, confirmshaming)
    ├── cart/cart.ts                  # BLAND_REFUSED on add and on quantity raise
    ├── data/shirts.ts                # isBlandShirt(db, shirtId)
    ├── data/settings.ts, db/schema.ts, catalog/types.ts, catalog/validate.ts   # the two switches
    └── copy.ts                       # about, shame lines, labels, BLAND_REFUSED
tests/
├── unit/shaming-loop.test.ts, unit/shaming-labels.test.ts      # new
├── integration/bland-refusal.test.ts                           # new
└── e2e/shaming.spec.ts, e2e/about.spec.ts                      # new; card-checkout.spec.ts updated
```

**Structure Decision**: this extends 001's single project. The new logic sits in `src/lib/shaming/`
(pure and framework-free). Catalog reads stay behind `src/lib/data/`.

## Complexity Tracking

No deviations.

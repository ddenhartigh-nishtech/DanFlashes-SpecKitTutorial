# Implementation Plan: Pattern Generator

**Branch**: `007-pattern-generator` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-pattern-generator/spec.md`

## Summary

A pure, deterministic pattern generator, `src/lib/pattern/`:
- **The recipe**: a target score, a style and a seed.
- **The output**: SVG shirt art whose counted complexity (shape points, plus 5 for each extra color,
  plus 10 for each extra layer) is exactly the target.
- **BLAND patterns** use the muted palette; everything above BLAND uses the loud one.

It feeds two places:

1. **The store's dial** at `/how-complicated` (behind a new `pattern_generator` switch):
   - The server precomputes the 102 dial steps (each step's opaque recipe code, tier and exact
     price, plus whether that setting is already a shirt), so **no score ever reaches the browser**.
   - Art comes from `/how-complicated/art/[code]`.
   - "Make it mine" turns the recipe into a real, **unlisted**, one-of-a-kind shirt (the same recipe
     always finds the same shirt) and redirects to its own page, where the existing Add to Cart,
     shaming loop and tactics take over.
2. **Dan's generator** at `/admin/shirts/generate`:
   - It shows the numbers, and saves a resting, listed shirt.
   - The console also marks and filters generated shirts, and lists or unlists the shopper-made ones.

Migration 0012 adds `shirts.origin`, `shirts.recipe` (unique) and `shirts.listed`, plus the switch.
The listing, the home page, the pop-ups and the shaming loop's picks read listed shirts only.
Constitution v4.2.0 (draft, ratified by merging) says how generated shirts get their score.

## Technical Context

**Language/Version**: unchanged (TypeScript on Node 22, Next.js 16.4 with Cache Components, React
19, Tailwind 4)

**Primary Dependencies**: unchanged. There are no new packages. The PRNG, the SVG and the recipe
codes are in-house and pure.

**Storage**: SQLite. Migration `0012`:
- `shirts.origin`, `shirts.recipe` and `shirts.listed` (a table rebuild for the CHECKs)
- `store_settings.pattern_generator`

Generated art is stored with 008's uploads (`uploads/<uuid>.svg`, a media row, a shirt_images row).
See [data-model.md](./data-model.md).

**Testing**:
- **Vitest**: property tests over at least 1,000 recipes (determinism, exact counts, monotonic
  dial), the art budget, and code round trips. Integration tests for materializing, listing
  exclusion, the console cores, and the migration.
- **Playwright**: the dial journeys run in the shopper projects, because dial shirts are unlisted
  and can't disturb other journeys. The console generator and listing run in the admin projects
  (008 R15).

**Target Platform / Project Type**: unchanged (one Next.js web app)

**Performance Goals**:
- **SC-005**: the most complicated priceable pattern is under 2 MB and draws in under 2 s.
- The dial page's Core Web Vitals meet constitution VII; Lighthouse in polish.
- Art is served per settle, never per drag frame.

**Constraints**:
- Shoppers never see a score (constitution II): not on the page, the slider, its accessible values,
  links, names or art.
- The one MSRP algorithm.
- Server-authoritative materializing and pricing.
- No delete.
- Calm in the console, loud in the store.
- 360px.
- The switch for the store's dial only.

**Scale/Scope**:
- 102 dial steps
- art budget `ART_MAX_SCORE = 120,000` units (R2)
- 2 new store routes, 1 new console page plus an art route, 3 actions

All Technical Context items are resolved. See [research.md](./research.md) (R1–R13).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution **v4.2.0 (draft; ratified by merging this PR)**. On v4.1.0, II ("the
owner assigns each shirt's complexity score") wouldn't cover a dial shirt that a shopper made.

| # | Principle / Rule | How 007 complies | Pre | Post |
|---|---|---|---|---|
| I | Built for the Dan Flashes Guy | The dial page speaks in the store voice and never explains the joke. Generated names come from Dan's word banks. The console generator is calm (v4.1.0). | ✅ | ✅ |
| II | Complexity Is the Price | Prices come only from `msrpUsd`/`resolvePrice`. A generated shirt starts at its count and Dan can re-score it (v4.2.0). Scores stay on the server: the dial gets tier, price and opaque codes only (R4). There are no deletes, and dial shirts stay viewable from orders. | ✅ | ✅ |
| III | Relentlessly Vibrant | BLAND patterns use the muted palette and everything above uses the loud one (R1). Vector art stays crisp at full zoom. | ✅ | ✅ |
| IV | Shamelessly Manipulative | Dial shirts get every existing tactic on their own page. The gimmick has its own switch. | ✅ | ✅ |
| V | Maximum Visual Assault | The dial page is a store page: strobe-safe, with the price, badge and button steady (`data-steady`), from 360px. The console stays calm. | ✅ | ✅ |
| VI | Fully Tested | Property tests for determinism, exact counts and monotonicity; integration tests for every action, the listing exclusion and the migration; e2e for each story's journey. It touches catalog and cart entry, so `/speckit-analyze` runs before implement. | ✅ | ✅ |
| VII | Fast | The art budget, art per settle, Lighthouse on `/how-complicated`. | ✅ | ✅ |
| VIII | Simple Code | No packages. The generator is pure functions. It reuses 008's uploads, console and switch patterns. The shirt page handles buying (R5). | ✅ | ✅ |
| C | Commerce constraints | Materializing regenerates on the server from the recipe and never trusts client art or prices. Checkout is unchanged. Money is exact. | ✅ | ✅ |
| W | Workflow | Feature branch; specify (Q1–Q3) → plan → tasks → analyze → implement → converge; merge by PR, carrying the v4.2.0 amendment. | ✅ | ✅ |

**Result**: PASS on v4.2.0, pre-research and post-design. The PR description must say that merging
ratifies v4.2.0 (analysis C1).

## Project Structure

### Documentation (this feature)

```text
specs/007-pattern-generator/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/generator.md      # routes, actions, recipe codes, the listing rule, console changes
├── checklists/requirements.md
└── tasks.md                    # /speckit-tasks
```

### Source Code (changes to the 001–009 layout)

```text
drizzle/0012_*.sql                         # shirts.origin/recipe/listed (+CHECKs); store_settings.pattern_generator
scripts/shirt-art.ts                       # imports the shared silhouettes from src/lib/pattern/silhouette.ts
src/
├── app/
│   ├── (store)/how-complicated/page.tsx           # the dial (store page, switch-gated)
│   ├── how-complicated/art/[code]/route.ts        # a recipe's SVG (switch-gated; stored art if made)
│   ├── admin/shirts/generate/page.tsx             # Dan's generator (calm)
│   ├── admin/generator/art/[code]/route.ts        # admin-only preview art (works with the switch off)
│   ├── (store)/shirts/page.tsx, (store)/page.tsx  # a CTA to the dial while the switch is on
│   └── _data/dial.ts                              # loadDial(searchParams)
├── actions/
│   ├── dial.ts                            # makeItMine (redirects to the shirt)
│   └── admin.ts                           # + saveGeneratedShirt, setShirtListed
├── components/
│   ├── Dial.tsx                           # client: slider, style, shuffle, preview, badge, price, Make it mine
│   └── admin/GeneratorForm.tsx, ListedControl.tsx
└── lib/
    ├── pattern/                           # new, pure
    │   ├── rng.ts                         # mulberry32 from a 32-bit seed
    │   ├── silhouette.ts                  # polo and button-down bodies and collars (moved from scripts)
    │   ├── generate.ts                    # generate(recipe, { bland }) → { svg, count }
    │   ├── count.ts                       # countPattern(structure)
    │   ├── dial.ts                        # DIAL_STEPS, scoreAtStep(step, maxScore), maxPriceableScore(msrp)
    │   ├── recipe.ts                      # encode/decode opaque codes, canonical recipe keys
    │   └── names.ts                       # nameFor(recipe, bland), word banks, uniqueness suffix
    ├── pattern/materialize.ts             # (db) recipe → the one shirt (create once, art, media, image)
    ├── actions/admin/generator.ts         # saveGeneratedShirtCore, setShirtListedCore
    ├── data/shirts.ts                     # listCatalogShirts: listed only (option to include unlisted)
    ├── data/admin-shirts.ts               # origin + listed in rows; origin filter
    ├── admin/switches.ts                  # + patternGenerator (14)
    ├── db/schema.ts, catalog/types.ts, catalog/validate.ts, data/settings.ts   # the switch, the columns
    └── copy.ts                            # copy.dial (store voice), copy.console.generator (calm), name banks
tests/
├── unit/pattern-*.test.ts                 # generate/count/dial/recipe/names (property-based over seeds)
├── integration/
│   ├── migration-0012.test.ts, materialize.test.ts, listing-unlisted.test.ts
│   ├── admin-generator.test.ts            # + the door sweep
│   └── dial-route.test.ts                 # the art routes
└── e2e/dial.spec.ts, e2e/admin/generator.spec.ts
```

**Structure Decision**: the generator is a pure library under `src/lib/pattern/`, shared by the
store, the console and the art script. Persistence is one module, `materialize.ts`, plus two console
cores. The store's dial is one server loader, one client component and one action. Buying stays on
the existing shirt page (R5).

## Complexity Tracking

No constitution violations on v4.2.0. These choices are worth stating:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| The server precomputes all 102 dial steps (code, tier, price) per seed and style | Scores never leave the server (FR-008): the browser holds opaque codes, tier names and prices. | Running the generator in the browser would put every score in client memory and the bundle, and the dial's links would carry them. |
| "Make it mine" redirects to the shirt's own page instead of adding to the cart from the dial | One Add to Cart, one shaming loop, one zoom viewer, and every tactic for free (FR-014, refined). | A second Add to Cart on the dial would duplicate the size picker, the bland loop and the tactic wiring. |
| `shirts.listed` (dial shirts unlisted) instead of a separate generated-shirts table | Generated shirts are real catalog shirts: carts, checkout, orders and the console work unchanged. | A parallel table would fork every catalog read, cart line and order line. |
| Counting by shape points, with an art budget (`ART_MAX_SCORE`) | The count is literal (more corners means more complicated) and grows to the MSRP's limit inside 2 MB. | One unit per shape would need about 10,000 shapes at the top and couldn't reach extreme tunings within the budget. |

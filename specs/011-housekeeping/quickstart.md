# Quickstart: Housekeeping

## Setup

```bash
npm run db:migrate      # 0015 on an existing database (it backs up first)
```

## Scenarios

| # | Do | Expect (FR / SC) |
|---|---|---|
| 1 | List `data/uploads/`, run `npm run verify`, list it again | The same files. `data/e2e-uploads/` is empty afterward (FR-001, FR-002, SC-001) |
| 2 | `npm run shirts:sweep` | A list of abandoned creations and stray files. Nothing changes (FR-006, SC-003) |
| 3 | `npm run shirts:sweep:delete` | "Backed up to …", then the counts. The listed shirts are gone, with their art (FR-006, FR-007) |
| 4 | Open a swept shirt's link | The store's 404 |
| 5 | Make the swept shirt's dial setting again | A new shirt (FR-009) |
| 6 | Owner: every resting shirt Dan generated, every mass-produced and every bought shirt | All still there (FR-005, SC-002) |
| 7 | `npm run catalog:audit`, and open every order | 0 errors, and every order opens with its shirts (SC-004) |

## Automated

```bash
npm run verify
```

## Results (2026-10-20)

On a copy of the owner's store and its pictures folder (`data/qs011.db`, `data/qs011-uploads`):

- **0015**: the one shopper-made shirt (made 2026-10-19, untouched) stayed unmarked. Dan's three
  generated shirts are `origin = 'owner'`, which the sweep never considers.
- **2 (plain run)**: 0 abandoned creations (the dial shirt is a day old) and 125 stray picture
  files, left by test runs before this feature. Nothing changed.
- **3 (`--yes`)**: backed up, then "Swept 0 shirts, 0 pictures and 125 stray files." The folder
  kept 4 files: exactly the 4 the library refers to (the dial shirt's and Dan's three).
- **7**: `catalog:audit` reported 0 errors and 0 warnings. The real `data/uploads/` was untouched
  (129 files before and after).

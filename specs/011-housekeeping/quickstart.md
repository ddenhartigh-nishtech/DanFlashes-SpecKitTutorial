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
| 3 | `npm run shirts:sweep -- --yes` | "Backed up to …", then the counts. The listed shirts are gone, with their art (FR-006, FR-007) |
| 4 | Open a swept shirt's link | The store's 404 |
| 5 | Make the swept shirt's dial setting again | A new shirt (FR-009) |
| 6 | Owner: every resting shirt Dan generated, every mass-produced and every bought shirt | All still there (FR-005, SC-002) |
| 7 | `npm run catalog:audit`, and open every order | 0 errors, and every order opens with its shirts (SC-004) |

## Automated

```bash
npm run verify
```

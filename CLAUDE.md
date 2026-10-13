@AGENTS.md

# Dan Flashes

Spec-driven project (GitHub Spec Kit). Before changing behavior, read `.specify/memory/constitution.md`
and the active feature's `specs/NNN-*/` artifacts (spec → plan → tasks).

- Money is exact two-decimal USD strings; use `src/lib/money.ts` (big.js), never JS number math.
- Product data lives in SQLite only (`src/lib/data/` is the access layer); no catalog data in code.
- Pages read the database at request time: call `connection()` inside a `<Suspense>` boundary
  (Cache Components is on, and synchronous better-sqlite3 reads would otherwise be prerendered).
- `npm run verify` must pass before merge.

# Contract: Housekeeping

## The test suite's folder (FR-001, FR-002, R1)

| Where | What |
|---|---|
| `playwright.config.ts` `webServer.env` | `MEDIA_UPLOADS_DIR: "data/e2e-uploads"` |
| `webServer.command` | `npx tsx scripts/e2e-uploads.ts && npm run db:reset -- --no-backup && …` |
| `globalTeardown` | `tests/e2e/global-teardown.ts`: empties `data/e2e-uploads` |
| `scripts/e2e-uploads.ts` | Removes `data/e2e-uploads` and recreates it empty. It never names `data/uploads`. |

## The sweep (FR-003–FR-009, R3–R6)

`src/lib/admin/sweep.ts`

```ts
export const ABANDONED_AFTER_DAYS = 30;
export interface Abandoned { id: number; name: string; ageDays: number; maker: string | null }
export function findAbandoned(db: Db, now: Date): Abandoned[];
export function findStrayFiles(db: Db, dir: string): string[];
export function sweep(db: Db, opts: { now: Date; dir: string }): {
  shirts: Abandoned[]; mediaRemoved: number; filesRemoved: number;
};
```

| Shirt | Listed by `findAbandoned`? |
|---|---|
| dial, unlisted, never changed by Dan, no order, no cart, made 31 days ago | **yes** |
| the same, made exactly 30 days ago | no |
| the same, in a guest's cart | no |
| the same, in an order | no |
| the same, mass-produced (`listed = 1`) | no |
| the same, with `owner_changed_at` set | no |
| owner-made (`origin = 'owner'`), resting, never bought | no |
| catalog shirt | no |

| After `sweep` | |
|---|---|
| each listed shirt | deleted with its `shirt_images` rows |
| its media rows | deleted, unless another shirt uses them or it's the placeholder |
| their files | removed, after the transaction commits |
| stray files (`isUploadFile` names with no `media` row) | removed |
| other files in the folder | untouched |
| media rows no shirt uses | kept |

## Dan's mark (FR-004, R2)

Each of these stamps `shirts.owner_changed_at` on success: `updateShirt`, `setShirtStatus`,
`setShirtListed`, `attachImage`, `moveImage`, `detachImage`. Make it mine (`makeItMine`) never does.

## The command (FR-006, R6)

`npm run shirts:sweep` (list), `npm run shirts:sweep:delete` (the script with `--yes`)

| Run | Prints | Changes |
|---|---|---|
| plain, something to sweep | each shirt: name, age, maker; each stray file; "Run `npm run shirts:sweep:delete` to back up and delete them." | none |
| plain, nothing | "Nothing to sweep." | none |
| `--yes`, something | "Backed up to …", then "Swept N shirts, M pictures and F stray files." | backup, then the sweep |
| `--yes`, nothing | "Nothing to sweep." | none (no backup) |

# Quickstart: Flash Mode & Pipes Background (006)

## Setup

Same as 001–005. After pulling this branch:

```bash
npm run db:migrate      # backs up, then applies 0009 (two switches)
npm run dev
```

Or start fresh with `npm run db:reset`. "Studio" means Drizzle Studio (`npm run db:studio`). Use a
fresh browser profile (or clear `localStorage["df-awesome"]`) so you start the way a new shopper does.

## Manual validation scenarios

| # | Do | Expect |
|---|---|---|
| 1 | Open `/` on a desktop, then at 360px | The header has the Extreme Awesomeness button beside the cart, sliding through the store's colors, and it's off. Nothing strobes, the field is plain, and there's no sideways scroll. (US1-1, US1-2, FR-006, FR-007) |
| 2 | Press it | At once, with no page load, the button shows it's on. Backgrounds and borders step through the store's colors, and no text gets harder to read (hot-pink buttons like Check out included). A black field fills in behind the page, and classic-colored pipes start growing at once. (US1-3, US2-1) |
| 3 | Open Geo Riot, the listing, the cart and checkout | Every price, tier badge and Add to Cart is steady and readable. Nothing about them flashes or changes color. (US1-4, FR-012) |
| 4 | Watch any one card or heading for a few seconds | It changes color no more than 3 times in any second. (US1-5, FR-011) |
| 5 | Watch the pipes | Straight runs and right-angle turns with a ball at each joint, several at once, in red, green, blue, yellow, cyan, magenta and white. They never change color with the strobe. When the screen fills, it clears and starts over, and the page doesn't move. Now and then a joint is a teapot. (US2-2, US2-3, FR-014) |
| 6 | Scroll a long page, tap the cart, open a size picker, open the bland-shirt dialog and the roach-motel dialog | The pipes stay put behind the page. Every tap lands, and every dialog, the per diem corner and a pop-up sit above the pipes and don't flash. (US2-4, US2-5, FR-003) |
| 7 | Read every page with it on | No text sits directly on a pipe: titles and loose lines have their own backing. (FR-016) |
| 8 | Reload, open a new tab, then close the browser and come back | It's still on every time. (US1-6, SC-007) |
| 9 | With two tabs open, turn it off in one | The other tab follows along. Turn it back on. (US1-6, FR-009) |
| 10 | Sign up or sign in, then sign out | It stays as it was each time: it's the browser's choice. (US1-6, Edge Cases) |
| 11 | Open the store in a second browser profile | It's off there: each browser has its own choice. (US1-6, Edge Cases) |
| 12 | Switch to another tab for a minute, then come back | The pipes paused and carry on. Rotate a phone or resize the window: they start over for the new size. (US2-6, US2-7, FR-015, FR-017) |
| 13 | In Studio set `flash_mode = 0`, then reload with it on | The pipes still run, and nothing strobes. Set `pipes_background = 0` as well: the button is gone and the store is exactly as after 005. Set both back to 1. (US1-7, US2-8, FR-002, SC-006) |
| 14 | Open a missing page (`/nope`) with it on | The 404 has the button, the strobe and the pipes. `/teapot` stands alone and is unchanged. (Edge Cases, research R9) |
| 15 | Print preview a shirt page with it on | No pipes and no strobe. (Edge Cases) |

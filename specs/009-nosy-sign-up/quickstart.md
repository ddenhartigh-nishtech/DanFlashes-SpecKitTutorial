# Quickstart: Nosy Sign-Up (009)

## Setup

Same as 001–006. After pulling this branch:

```bash
npm run db:migrate      # backs up, then applies 0010 (the nosy_sign_up switch)
npm run dev
```

Or start fresh with `npm run db:reset`. "Studio" means Drizzle Studio (`npm run db:studio`). Use a
browser profile that has saved addresses, and a password manager if you have one, for scenario 6.

## Manual validation scenarios

| # | Do | Expect |
|---|---|---|
| 1 | Open `/sign-up` | The real fields first: what Dan should call you, then email `**` and password `**`. Then one long scroll of nosy fields, each marked "Required". Then "** Actually required." and Sign up at the very bottom. (US1-1, FR-003, FR-009) |
| 2 | Fill in the real fields only and press Sign up | You stay on the page, and Dan says "Dan noticed you skipped a few. He'll allow it." Press Sign up again: you're signed up and on `/account`. (US1-2, FR-008) |
| 3 | Sign out, sign up a new account with every nosy field filled | It signs you up on the first press. (US1-2) |
| 4 | Type into Social Security Number and mother's maiden name | They're masked as you type. The others show as typed. (US1-5, FR-006) |
| 5 | With DevTools' Network tab open, type something distinctive into every nosy field and sign up | No request carries any of it: not the URL, the headers or the body. (US1-3, SC-001) |
| 6 | Click into each nosy field | Your browser offers no saved values and no autofill, and your password manager offers nothing. After signing up, it doesn't offer to save any of them. (US1-4, FR-005, SC-003) |
| 7 | Type into the nosy fields, go to another page, then press Back | The nosy fields are empty. (US1-6, FR-007) |
| 8 | Try to sign up with a short password, then with an email that's taken | The real fields' errors show as before. Dan's line shows at most once. (Edge Cases) |
| 9 | Go to `/checkout` as a guest with something in the cart, and choose "New here?" | The same nosy sign-up. After signing up you land on checkout. (Edge Cases) |
| 10 | Open `/sign-in` | Unchanged: no nosy fields, no `**`. (FR-011) |
| 11 | At 360px, and with Extreme Awesomeness on | Every field is readable and reachable, with no sideways scroll, and no text sits on a pipe. (US1-7, FR-012) |
| 12 | In Studio set `nosy_sign_up = 0`, then reload `/sign-up` | No nosy fields, no `**`, no legend: sign-up exactly as after 006. Set it back to 1. (US1-8, FR-002, SC-004) |

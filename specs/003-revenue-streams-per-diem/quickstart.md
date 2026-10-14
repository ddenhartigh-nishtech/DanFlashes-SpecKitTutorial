# Quickstart: Revenue Streams & Per Diem Drain (003)

## Setup

Same as 001/002. After pulling this branch:

```bash
npm run db:migrate      # backs up, then applies 0002 (streams, ledger kind, settings, orders flag)
npm run dev
```

Or start fresh with `npm run db:reset`: Demo Dan comes back with an ongoing $75.00 per diem.

"Studio" means Drizzle Studio (`npm run db:studio`). The default pay period is 5 minutes. To watch
recurring payments faster, set `store_settings.stream_pay_period_minutes = 1`.

## Manual validation scenarios

| # | Scenario | Expected |
|---|---|---|
| 1 | Sign in as Demo Dan | The header shows a per diem meter. The account lists his Per Diem ($75.00, every payday, ongoing) with a next payment, and the history shows its first payment. (R9, FR-013) |
| 2 | Sign up as someone new; open Account → Revenue Streams | An empty state and the connect form. No bank, routing or payroll fields anywhere. (FR-002, SC-007) |
| 3 | Connect a Per Diem: $75.00, every payday, starts now, ends in 30 minutes | It's listed with its window in local time. The Flash Credit history gains "Per Diem" +$75.00, and the header meter reads $75.00. (US1-1, US2-1) |
| 4 | Wait one pay period, or set the period to 1 minute, then reload | One more +$75.00 per period, never twice, and none after the end. (US1-2, SC-003) |
| 5 | Connect "My Kid's College Fund" for $2,000.00, just once, starting now | Exactly one +$2,000.00, and the stream shows as done. (US1-3) |
| 6 | Connect a custom stream "Craig owes me" for $40.00, whenever I want, ongoing; press Cash in twice quickly, then once more | Each separate press adds +$40.00. A double-click counts once. (US1-4, FR-007) |
| 7 | Try a start in the past, an end before the start, $0.00, $10,000.01, or a 41-character name | Refused in brand voice. Nothing is created. (FR-002, FR-005) |
| 8 | Try a second per diem while the first is running | Refused (`PER_DIEM_EXISTS`). (FR-010) |
| 9 | Buy shirts until the meter would go below $0, by Flash Credit or card | The meter drops by each order total. The order that takes it to $0 opens with the per diem achievement, and the header shows the achievement state. (US2-2, US2-3) |
| 10 | Let a payday arrive, then drain it again | The meter refills and the next drain celebrates again. (US2-4) |
| 11 | Disconnect the per diem | The label reads "Disconnect (and settle for less)". Payments stop, history stays, and the meter disappears. (US1-6, FR-009) |
| 12 | In Studio set `store_settings.per_diem_drain = 0`, then reload and buy | No meter and no celebration anywhere. Streams still pay. (US2-5, SC-006) |
| 13 | In Studio set `confirmshaming = 0` | The disconnect button reads "Disconnect". (FR-009) |

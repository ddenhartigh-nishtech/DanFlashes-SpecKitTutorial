import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { signUp, uniqueEmail, visible } from "./helpers";

const s = copy.streams;

async function connect(
  page: Page,
  stream: {
    source: string;
    customName?: string;
    amount: string;
    schedule: string;
    ongoing?: boolean;
  },
) {
  const section = visible(page.locator("#revenue-streams"));
  await section.getByLabel(s.form.source).selectOption({ label: stream.source });
  if (stream.customName) await section.getByLabel(s.form.customName).fill(stream.customName);
  await section.getByLabel(s.form.amount).fill(stream.amount);
  await section.getByRole("radio", { name: stream.schedule }).check();
  if (stream.ongoing) await section.getByLabel(s.form.ongoing).check();
  // A one-time top-up is applied, not connected.
  const submit = stream.schedule === s.schedules.one_time ? s.form.apply : s.form.connect;
  await section.getByRole("button", { name: submit }).click();
}

const entry = (page: Page, name: string) =>
  visible(page.getByTestId("flash-entry")).filter({ hasText: s.historyEntry(name) });

test.describe("US1 — revenue streams", () => {
  test("connect a per diem, a one-time stream and a cash-in stream; disconnect one", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    const section = visible(page.locator("#revenue-streams"));
    await expect(section.getByRole("heading", { name: s.heading })).toBeVisible();
    await expect(section.getByText(s.empty)).toBeVisible();
    // The schedules say what they mean: the real pay period, or only when he cashes in.
    await expect(section.getByText(s.hints.recurring(s.period(5)))).toBeVisible();
    await expect(section.getByText(s.hints.whenever)).toBeVisible();
    await section.getByRole("radio", { name: s.schedules.one_time }).check();
    await expect(section.getByRole("button", { name: s.form.apply })).toBeVisible();
    await section.getByRole("radio", { name: s.schedules.recurring }).check();
    await expect(section.getByRole("button", { name: s.form.connect })).toBeVisible();

    // SC-007: the props never ask for real banking details.
    await expect(page.getByLabel(/bank|routing|payroll|account number/i)).toHaveCount(0);

    // A per diem, every payday, starting now, ongoing: its first payday lands right away.
    await connect(page, {
      source: s.presets.per_diem,
      amount: "75.00",
      schedule: s.schedules.recurring,
      ongoing: true,
    });
    await expect(section.getByRole("status")).toContainText(s.connected);
    await expect(
      visible(page.getByTestId("stream")).filter({ hasText: s.presets.per_diem }),
    ).toBeVisible();
    await expect(entry(page, s.presets.per_diem)).toContainText("+$75.00");

    // A one-time stream pays exactly once.
    await connect(page, {
      source: s.presets.college_fund,
      amount: "2000.00",
      schedule: s.schedules.one_time,
    });
    await expect(section.getByRole("status")).toContainText(s.applied);
    await expect(entry(page, s.presets.college_fund)).toHaveCount(1);
    await expect(entry(page, s.presets.college_fund)).toContainText("+$2,000.00");
    await expect(
      visible(page.getByTestId("stream")).filter({ hasText: s.presets.college_fund }),
    ).toContainText(s.done);

    // A custom stream that pays whenever he cashes in. Each separate press pays once.
    await connect(page, {
      source: s.customOption,
      customName: "Craig owes me",
      amount: "40",
      schedule: s.schedules.whenever,
      ongoing: true,
    });
    const craig = visible(page.getByTestId("stream")).filter({ hasText: "Craig owes me" });
    await craig.getByRole("button", { name: s.cashIn }).click();
    await expect(entry(page, "Craig owes me")).toHaveCount(1);
    await craig.getByRole("button", { name: s.cashIn }).click();
    await expect(entry(page, "Craig owes me")).toHaveCount(2);

    // Brand-voice refusals; nothing is created.
    await connect(page, {
      source: s.presets.garage_sale,
      amount: "0.00",
      schedule: s.schedules.one_time,
    });
    await expect(section.getByRole("status")).toContainText(copy.codes.INVALID_STREAM_AMOUNT);
    await expect(
      visible(page.getByTestId("stream")).filter({ hasText: s.presets.garage_sale }),
    ).toHaveCount(0);

    // Disconnect makes him feel it (confirmshaming), and stops the stream.
    await craig.getByRole("button", { name: copy.shame.labels.disconnect.shamed }).click();
    await expect(craig).toContainText(s.disconnectedBadge);
    await expect(craig.getByRole("button", { name: s.cashIn })).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

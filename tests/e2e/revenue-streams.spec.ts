import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { connect, signUp, uniqueEmail, visible } from "./helpers";

const s = copy.streams;

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
    // The schedules say what they mean: his own interval, once right now, or only on Cash in.
    await expect(section.getByText(s.hints.recurring)).toBeVisible();
    await expect(section.getByText(s.hints.whenever)).toBeVisible();
    await expect(section.getByLabel(s.form.intervalCount)).toBeVisible();
    await section.getByRole("radio", { name: s.schedules.one_time }).check();
    await expect(section.getByRole("button", { name: s.form.apply })).toBeVisible();
    await expect(section.getByLabel(s.form.intervalCount)).toHaveCount(0);
    await expect(section.getByText(s.form.startsNow)).toHaveCount(0); // applied right now
    await section.getByRole("radio", { name: s.schedules.recurring }).check();
    await expect(section.getByRole("button", { name: s.form.connect })).toBeVisible();

    // SC-007: the props never ask for real banking details.
    await expect(page.getByLabel(/bank|routing|payroll|account number/i)).toHaveCount(0);

    // A per diem topping off every 5 minutes, starting now, ongoing: the first top-off lands now.
    await connect(page, {
      source: s.presets.per_diem,
      amount: "75.00",
      schedule: s.schedules.recurring,
      every: ["5", "minutes"],
      ongoing: true,
    });
    await expect(section.getByRole("status")).toContainText(s.connected);
    const perDiem = visible(page.getByTestId("stream")).filter({ hasText: s.presets.per_diem });
    await expect(perDiem).toContainText(s.every(5));
    await expect(
      perDiem.getByRole("button", { name: copy.shame.labels.disconnect.shamed }),
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
    // Already applied: it arrives as paid in full, with nothing to disconnect.
    const fund = visible(page.getByTestId("stream")).filter({ hasText: s.presets.college_fund });
    await expect(fund).toContainText(s.done);
    await expect(fund.getByRole("button")).toHaveCount(0);

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

  test("a refusal keeps what he typed; a success resets the form, controls and all", async ({
    page,
  }, info) => {
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    const section = visible(page.locator("#revenue-streams"));

    // Refused: a start in the past. Everything he entered is still there to fix.
    await section.getByLabel(s.form.source).selectOption({ label: s.presets.expense_report });
    await section.getByLabel(s.form.amount).fill("75.00");
    await section.getByLabel(s.form.intervalCount).fill("2");
    await section.getByLabel(s.form.intervalUnit).selectOption("hours");
    await section.getByLabel(s.form.ongoing).check();
    await section.getByLabel(s.form.startsNow).uncheck();
    await section.locator('input[name="startsLocal"]').fill("2020-01-01T09:00");
    await section.getByRole("button", { name: s.form.connect }).click();
    await expect(section.getByRole("status")).toContainText(copy.codes.INVALID_WINDOW);
    await expect(section.getByLabel(s.form.amount)).toHaveValue("75.00");
    await expect(section.getByLabel(s.form.intervalCount)).toHaveValue("2");
    await expect(section.getByLabel(s.form.intervalUnit)).toHaveValue("hours");
    await expect(section.getByLabel(s.form.startsNow)).not.toBeChecked();

    // Fixed and connected: the form starts over, and every control matches what it will do.
    await section.getByLabel(s.form.startsNow).check();
    await section.getByRole("button", { name: s.form.connect }).click();
    await expect(section.getByRole("status")).toContainText(s.connected);
    await expect(section.getByLabel(s.form.amount)).toHaveValue("");
    await expect(section.getByLabel(s.form.startsNow)).toBeChecked();

    // After applying a one-time stream, "Recurring top-off" is selected and behaves like it.
    await connect(page, {
      source: s.presets.garage_sale,
      amount: "50.00",
      schedule: s.schedules.one_time,
    });
    await expect(section.getByRole("status")).toContainText(s.applied);
    await expect(section.getByRole("radio", { name: s.schedules.recurring })).toBeChecked();
    await expect(section.getByLabel(s.form.intervalCount)).toBeVisible();
    await expect(section.getByRole("button", { name: s.form.connect })).toBeVisible();
  });
});

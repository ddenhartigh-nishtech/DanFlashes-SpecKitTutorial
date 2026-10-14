import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { buyByCard, connect, signUp, uniqueEmail, visible } from "./helpers";

const s = copy.streams;
const a = copy.achievements;

const left = (page: Page, name: string) =>
  visible(page.getByTestId("stream")).filter({ hasText: name }).getByTestId("stream-left");

test.describe("US4 — drain them all", () => {
  test("per diem first, then the oldest money; one order stacks every stream it empties", async ({
    page,
  }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // Quickstart 19: a $100.00 daily per diem, then $300.00 and $50.00 applied once.
    await connect(page, {
      source: s.presets.per_diem,
      amount: "100.00",
      schedule: s.schedules.recurring,
      every: ["1", "days"],
      ongoing: true,
    });
    await expect(left(page, s.presets.per_diem)).toHaveText(s.left("$100.00"));
    await connect(page, {
      source: s.presets.college_fund,
      amount: "300.00",
      schedule: s.schedules.one_time,
    });
    await expect(left(page, s.presets.college_fund)).toHaveText(s.left("$300.00"));
    await connect(page, {
      source: s.presets.garage_sale,
      amount: "50.00",
      schedule: s.schedules.one_time,
    });
    await expect(left(page, s.presets.garage_sale)).toHaveText(s.left("$50.00"));

    // 20: Geo Riot ($344.61) spends the per diem first, then the oldest money (College Fund).
    await buyByCard(page, "geo-riot", "M");
    const achievements = visible(page.getByTestId("achievements"));
    await expect(achievements.getByTestId("achievement")).toHaveCount(1);
    await expect(achievements).toContainText(a.unlocked(1));
    await expect(achievements).toContainText(a.lines.per_diem);
    await page.goto("/account");
    await expect(left(page, s.presets.per_diem)).toHaveText(s.gone);
    await expect(left(page, s.presets.college_fund)).toHaveText(s.left("$55.39"));
    await expect(left(page, s.presets.garage_sale)).toHaveText(s.left("$50.00"));

    // 21: one order empties both, and the achievements stack.
    await buyByCard(page, "geo-riot", "M");
    await expect(achievements.getByTestId("achievement")).toHaveCount(2);
    await expect(achievements).toContainText(a.unlocked(2));
    await expect(achievements).toContainText(a.lines.college_fund);
    await expect(achievements).toContainText(a.gone(s.presets.garage_sale));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

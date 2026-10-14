import { expect, test, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, uniqueEmail, visible } from "./helpers";

const s = copy.streams;

/** Buy Geo Riot ($344.61) by card and land on its confirmation. */
async function buyGeoRiotByCard(page: Page) {
  await addShirt(page, "geo-riot", "M");
  await page.goto("/checkout");
  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
  await visible(page.getByRole("button", { name: /Place order/ })).click();
  await expect(page).toHaveURL(/\/orders\/\d+$/);
}

test.describe("US2 — the per diem drain", () => {
  test("the gauge counts down every order and throws a party at $0", async ({ page }, info) => {
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // A $500.00 per diem that tops off daily, so no second top-off lands mid-test.
    const section = visible(page.locator("#revenue-streams"));
    await section.getByLabel(s.form.source).selectOption({ label: s.presets.per_diem });
    await section.getByLabel(s.form.amount).fill("500.00");
    await section.getByLabel(s.form.intervalCount).fill("1");
    await section.getByLabel(s.form.intervalUnit).selectOption("days");
    await section.getByLabel(s.form.ongoing).check();
    await section.getByRole("button", { name: s.form.connect }).click();
    await expect(section.getByRole("status")).toContainText(s.connected);

    const gauge = visible(page.getByTestId("per-diem-meter"));
    await page.goto("/");
    await expect(gauge).toContainText(copy.meter.label);
    await expect(gauge).toContainText("$500.00");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // $500.00 − $344.61: some left, no party yet.
    await buyGeoRiotByCard(page);
    await expect(visible(page.getByTestId("per-diem-achievement"))).toHaveCount(0);
    await expect(gauge).toContainText("$155.39");

    // The order that takes it to $0 gets the achievement, and so does the gauge.
    await buyGeoRiotByCard(page);
    await expect(visible(page.getByTestId("per-diem-achievement"))).toContainText(
      copy.celebration.headline,
    );
    await expect(gauge).toContainText(copy.meter.drained);
  });

  test("guests see no gauge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByTestId("per-diem-meter")).toHaveCount(0);
  });
});

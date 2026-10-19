import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { awesomeButton, test, visible } from "./helpers";

const d = copy.dial;
const slider = (page: Page) => visible(page.getByLabel(d.label, { exact: true }));
const price = (page: Page) => visible(page.getByTestId("dial-price"));
const badge = (page: Page) => visible(page.getByTestId("dial-tier"));
const art = (page: Page) => visible(page.getByTestId("dial-art"));

/** Exact dollars as a whole number of cents, however many digits. */
const cents = (text: string) => BigInt(text.replace(/[^\d]/g, ""));

async function setStep(page: Page, step: number) {
  await slider(page).fill(String(step));
  await expect(page).toHaveURL(/\?r=[a-z]+$/);
}

test.describe("US1 — how complicated can it get?", () => {
  test("the shirts page and the home page both lead to the dial", async ({ page }) => {
    for (const path of ["/shirts", "/"]) {
      await page.goto(path);
      await visible(page.getByRole("link", { name: d.cta }))
        .first()
        .click();
      await expect(page).toHaveURL(/\/how-complicated/);
      await expect(visible(page.getByRole("heading", { level: 1 }))).toHaveText(d.title);
    }
  });

  test("turning it up never lowers the price, and the badge climbs from BLAND", async ({
    page,
  }) => {
    test.slow(); // eleven settles and their art
    await page.goto("/how-complicated");
    await setStep(page, 0);
    await expect(badge(page)).toHaveText(/BLAND/i);
    await expect(visible(page.getByText(d.blandLine))).toBeVisible();
    let last = BigInt(-1);
    const tiers: string[] = [];
    for (let step = 0; step <= 100; step += 10) {
      await setStep(page, step);
      const now = cents(await price(page).innerText());
      expect(now, `step ${step}`).toBeGreaterThanOrEqual(last);
      last = now;
      tiers.push(await badge(page).innerText());
    }
    expect(new Set(tiers).size).toBeGreaterThanOrEqual(4);
  });

  test("shuffle, the other style, and a link that reopens the exact shirt", async ({
    page,
    browser,
  }, info) => {
    await page.goto("/how-complicated");
    await setStep(page, 30);
    const first = await art(page).getAttribute("src");
    const tier = (await badge(page).textContent())!;
    await visible(page.getByRole("button", { name: d.shuffle })).click();
    await expect(art(page)).not.toHaveAttribute("src", first!);
    await expect(badge(page)).toHaveText(tier);
    await visible(page.getByRole("button", { name: d.styles["button-down"] })).click();
    await expect(page).toHaveURL(/\?r=[a-z]+$/);

    const link = page.url();
    const shown = {
      src: await art(page).getAttribute("src"),
      tier: (await badge(page).textContent())!,
      price: (await price(page).textContent())!,
    };
    const other = await (await browser.newContext({ baseURL: info.project.use.baseURL })).newPage();
    await other.goto(link);
    await expect(visible(other.getByTestId("dial-art"))).toHaveAttribute("src", shown.src!);
    await expect(visible(other.getByTestId("dial-tier"))).toHaveText(shown.tier);
    await expect(visible(other.getByTestId("dial-price"))).toHaveText(shown.price);
    await other.context().close();
  });

  test("the very top is too complicated to price, and the top step draws fast", async ({
    page,
  }) => {
    await page.goto("/how-complicated");
    await setStep(page, 100);
    const started = Date.now();
    await expect
      .poll(() => art(page).evaluate((img) => (img as HTMLImageElement).naturalWidth), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
    expect(Date.now() - started).toBeLessThan(2_000); // SC-005
    await slider(page).fill("101");
    await expect(price(page)).toHaveText(d.beyond);
    await expect(visible(page.getByRole("button", { name: d.makeItMine }))).toBeDisabled();
  });

  test("with Extreme Awesomeness on at 360px, the price, badge and button hold still", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/how-complicated");
    await awesomeButton(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-awesome", "on");
    for (const id of ["dial-price", "dial-tier", "dial-make"]) {
      await expect(
        visible(page.getByTestId(id)).locator("xpath=ancestor-or-self::*[@data-steady]").first(),
      ).toBeVisible();
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

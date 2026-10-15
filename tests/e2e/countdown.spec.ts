import { expect, type Locator, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { addShirt, signUp, test, uniqueEmail, visible } from "./helpers";

const u = copy.urgency;
const CLOCK = /^\d{2}:\d{2}\.\d{3}$/;

const clock = (page: Page, kind: "deal" | "hold") =>
  visible(page.locator(`[data-testid="countdown"][data-kind="${kind}"]`));
const ms = (text: string) => {
  const [, m, s, f] = /^(\d{2}):(\d{2})\.(\d{3})$/.exec(text)!;
  return Number(m) * 60_000 + Number(s) * 1000 + Number(f);
};
/** What the shared anchor says the clock should read right now, in ms. */
const expected = (page: Page) =>
  page.evaluate(() => {
    const anchor = Number(localStorage.getItem("df-countdown-anchor"));
    return 600_000 - ((((Date.now() - anchor) % 600_000) + 600_000) % 600_000);
  });
async function readsTrue(page: Page, locator: Locator) {
  await expect(locator).toHaveText(CLOCK);
  await expect(locator).not.toHaveText("10:00.000"); // ticking, not the placeholder
  const shown = ms(await locator.innerText());
  expect(Math.abs(shown - (await expected(page)))).toBeLessThan(1000);
}

test.describe("US2 — countdown timers that reset", () => {
  test("one shared clock, to the millisecond, that never runs out", async ({ page }, info) => {
    test.slow(); // a sign-up, four clock pages and a second tab: more than 60 s on a busy machine
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);

    // An empty cart has nothing to hold.
    await page.goto("/cart");
    await expect(visible(page.getByTestId("empty-cart"))).toBeVisible();
    await expect(clock(page, "hold")).toHaveCount(0);

    // Quickstart 2: the deal clock beside the price, ticking down in milliseconds.
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByText(u.deal))).toBeVisible();
    await readsTrue(page, clock(page, "deal"));
    const first = ms(await clock(page, "deal").innerText());
    await page.waitForTimeout(300);
    expect(ms(await clock(page, "deal").innerText())).toBeLessThan(first);
    const anchor = await page.evaluate(() => localStorage.getItem("df-countdown-anchor"));

    // 5: the cart hold and checkout run on the same clock, and nothing restarts it.
    await addShirt(page, "geo-riot", "M");
    await page.goto("/cart");
    await expect(visible(page.getByText(u.hold))).toBeVisible();
    await readsTrue(page, clock(page, "hold"));
    await page.goto("/checkout");
    await readsTrue(page, clock(page, "hold"));
    expect(await page.evaluate(() => localStorage.getItem("df-countdown-anchor"))).toBe(anchor);

    // Several tabs: a second page in the same browser shows the same time.
    const second = await page.context().newPage();
    await second.goto("/shirts/geo-riot");
    await readsTrue(second, clock(second, "deal"));
    await second.close();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // 6: at zero it quietly starts over, with no write: an anchor three cycles back still reads
    // as a fresh countdown. There's no "expired", and the cart is untouched. (The edge itself is
    // unit-tested in urgency-countdown.)
    const old = String(Date.now() - 3 * 600_000 - 2_000);
    await page.evaluate((at) => localStorage.setItem("df-countdown-anchor", at), old);
    await page.goto("/cart");
    await readsTrue(page, clock(page, "hold"));
    await expect(clock(page, "hold")).toHaveText(/^09:\d{2}\.\d{3}$/);
    expect(await page.evaluate(() => localStorage.getItem("df-countdown-anchor"))).toBe(old);
    await expect(page.getByText(/expired/i)).toHaveCount(0);
    await expect(visible(page.getByTestId("cart-line"))).toHaveCount(1);
  });
});

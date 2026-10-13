import { expect, test, type Page } from "@playwright/test";
import { visible } from "./helpers";

const dollars = (text: string) => Number(text.replace(/[$,]/g, ""));

async function openFilters(page: Page) {
  const form = visible(page.getByRole("form", { name: "Filters" }));
  const toggle = visible(page.getByRole("button", { name: "Filters" }));
  // Phones: tap the toggle (retrying until hydration makes it interactive). Desktop: already open.
  await expect(async () => {
    if (!(await form.isVisible())) await toggle.click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("US1 — browse and filter by complexity", () => {
  test("home page features the most complicated shirts", async ({ page }) => {
    await page.goto("/");
    await expect(visible(page.getByRole("heading", { level: 1 }))).toContainText("complicated");
    const featured = visible(page.getByTestId("featured")).getByTestId("shirt-card");
    await expect(featured).toHaveCount(4);
    await expect(featured.first()).toContainText("Dan's Masterpiece");
    await expect(visible(page.getByRole("link", { name: "See every shirt" }))).toHaveAttribute(
      "href",
      "/shirts",
    );
    await expectNoHorizontalScroll(page);
  });

  test("listing shows a badge and price per shirt — and never a complexity score", async ({
    page,
  }) => {
    await page.goto("/shirts");
    const cards = visible(page.getByTestId("shirt-card"));
    await expect(cards).toHaveCount(14);

    for (const card of await cards.all()) {
      await expect(card.getByTestId("tier-badge")).toHaveCount(1);
      await expect(card.getByTestId("price")).toHaveCount(1);
      const price = await card.getByTestId("price").innerText();
      const rest = (await card.innerText()).replace(price, "");
      expect(rest, "no score digits outside the price").not.toMatch(/\d/);
    }

    // Not even in the serialized React payload shipped to the browser.
    const html = await page.content();
    expect(html).not.toContain('"complexity"');
    expect(html).not.toContain('"msrpUsd"');

    await expect(visible(page.getByText("Last Season's Swirl"))).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test("filters to the top tier and sorts by price", async ({ page }) => {
    await page.goto("/shirts");
    await openFilters(page);
    await visible(page.getByRole("checkbox", { name: "Too Complicated for Most Men" })).check();
    await visible(page.getByLabel("Sort")).selectOption("price-desc");
    await visible(page.getByRole("button", { name: "Show me" })).click();

    await expect(page).toHaveURL(/tier=\d+/);
    const cards = visible(page.getByTestId("shirt-card"));
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText("Dan's Masterpiece");
    await expect(cards.nth(1)).toContainText("The Per Diem");
  });

  test("BLAND is just the bottom tier, and every BLAND shirt is under $300", async ({ page }) => {
    await page.goto("/shirts");
    await openFilters(page);
    await visible(page.getByRole("checkbox", { name: "BLAND" })).check();
    await visible(page.getByRole("button", { name: "Show me" })).click();

    const cards = visible(page.getByTestId("shirt-card"));
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all()) {
      await expect(card.getByTestId("tier-badge")).toHaveText("BLAND");
      expect(dollars(await card.getByTestId("price").innerText())).toBeLessThan(300);
    }
  });

  test("an empty filter result says so in brand voice", async ({ page }) => {
    await page.goto("/shirts?maxPrice=1.00");
    await expect(visible(page.getByTestId("shirt-card"))).toHaveCount(0);
    await expect(visible(page.getByText("Nothing that complicated. Yet."))).toBeVisible();
  });

  test("unknown URLs get the branded 404", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(visible(page.getByText("isn't complicated enough to exist"))).toBeVisible();
    await expect(visible(page.getByRole("link", { name: "Back to the shirts" }))).toBeVisible();
  });

  test("/teapot is a real HTTP 418", async ({ page, request }) => {
    const res = await request.get("/teapot", { headers: { accept: "text/html" } });
    expect(res.status()).toBe(418);
    await page.goto("/teapot");
    await expect(visible(page.getByRole("heading", { name: "418: I'm a teapot." }))).toBeVisible();
  });
});

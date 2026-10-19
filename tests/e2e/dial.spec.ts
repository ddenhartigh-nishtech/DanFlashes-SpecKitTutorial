import { expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { copy } from "../../src/lib/copy";
import { awesomeButton, buyByCard, signUp, test, uniqueEmail, visible } from "./helpers";

const d = copy.dial;
const slider = (page: Page) => visible(page.getByLabel(d.label, { exact: true }));
const price = (page: Page) => visible(page.getByTestId("dial-price"));
const badge = (page: Page) => visible(page.getByTestId("dial-tier"));
const art = (page: Page) => visible(page.getByTestId("dial-art"));

/** Exact dollars as a whole number of cents, however many digits. */
const cents = (text: string) => BigInt(text.replace(/[^\d]/g, ""));

/**
 * Move the dial once it's live (Make it mine enables on hydration, so an earlier move isn't lost to
 * hydration), then wait for the share link to show this very step, not the one before it.
 */
async function setStep(page: Page, step: number) {
  await expect(visible(page.getByTestId("dial-make"))).toBeEnabled();
  await slider(page).fill(String(step));
  await expect(slider(page)).toHaveValue(String(step));
  const code = await page
    .locator('form:has([data-testid="dial-make"]) input[name="code"]')
    .inputValue();
  expect(code).toMatch(/^[a-z]+$/);
  await expect(page).toHaveURL(new RegExp(`\\?r=${code}$`));
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

/** A made shirt's score, read straight from the e2e database (only the test may know it). */
function scoreOf(slug: string): number {
  const db = new Database("data/e2e.db", { readonly: true });
  try {
    return (
      db.prepare("SELECT complexity FROM shirts WHERE slug = ?").get(slug) as {
        complexity: number;
      }
    ).complexity;
  } finally {
    db.close();
  }
}

/** The page's words, minus the prices (a score's digits may turn up inside a price). */
const wordsOnPage = (page: Page) =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll('[data-testid="price"],[data-testid="dial-price"]')
      .forEach((e) => e.remove());
    return clone.innerText;
  });

async function makeItMineAt(page: Page, step: number) {
  await page.goto("/how-complicated");
  await setStep(page, step);
  const dialUrl = page.url();
  await visible(page.getByRole("button", { name: d.makeItMine })).click();
  await expect(page).toHaveURL(/\/shirts\/[a-z-]+$/, { timeout: 30_000 });
  return { dialUrl, slug: new URL(page.url()).pathname.split("/").pop()! };
}

test.describe("US2 — buy the monster", () => {
  test("Make it mine lands on the one real shirt, bought by card and kept in order history", async ({
    page,
  }, info) => {
    test.slow(); // a real sign-up and a checkout
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });

    // FR-014: its own page, with a name, its art, a badge and a price.
    const { dialUrl, slug } = await makeItMineAt(page, 33);
    const name = await visible(page.getByRole("heading", { level: 1 })).innerText();
    expect(name).not.toMatch(/\d/);
    await expect(visible(page.locator('img[src*="/media/uploads/"]')).first()).toBeVisible();
    await expect(visible(page.getByTestId("tier-badge")).first()).toBeVisible();

    // FR-008, SC-003: the score is nowhere: not in his words, the link, or the shirt's address.
    const score = String(scoreOf(slug));
    expect(await wordsOnPage(page)).not.toMatch(new RegExp(`\b${score}\b`));
    expect(dialUrl).not.toContain(score);
    expect(slug).not.toContain(score);
    await page.goto(dialUrl);
    expect(await wordsOnPage(page)).not.toMatch(new RegExp(`\b${score}\b`));

    // FR-015: the same setting lands on the same shirt.
    await visible(page.getByRole("button", { name: d.makeItMine })).click();
    await expect(page).toHaveURL(new RegExp(`/shirts/${slug}$`), { timeout: 30_000 });

    // FR-016: bought by card, and order history shows its art.
    await buyByCard(page, slug, "XL");
    await expect(
      visible(page.getByTestId("order-summary")).locator('img[src*="/media/uploads/"]').first(),
    ).toBeVisible();

    // FR-018, SC-008: one of a kind, so the listing and the home page never show it.
    await page.goto("/shirts");
    await expect(page.locator(`a[href="/shirts/${slug}"]`)).toHaveCount(0);
    await page.goto("/");
    await expect(page.locator(`a[href="/shirts/${slug}"]`)).toHaveCount(0);
  });

  test("the BLAND end becomes a BLAND shirt, and Add to Cart runs the loop (FR-017)", async ({
    page,
  }) => {
    await makeItMineAt(page, 0);
    await visible(page.locator("label").filter({ hasText: /^M$/ })).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(visible(page.getByTestId("shame-dialog"))).toContainText(copy.shame.title);
  });
});

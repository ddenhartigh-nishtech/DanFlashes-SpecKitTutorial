import { expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { copy } from "../../src/lib/copy";
import { DEMO_SHOPPER } from "../../scripts/seed-data";
import { addShirt, awesomeButton, buyByCard, signUp, test, uniqueEmail, visible } from "./helpers";

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

  test("on the shirts page, the dial's link sits under the filters (owner review Q9)", async ({
    page,
  }) => {
    await page.goto("/shirts");
    const cta = visible(page.getByRole("link", { name: d.cta })).first();
    // Wider screens show the filters in the sidebar; a phone shows their toggle.
    const filters = page
      .locator('form[aria-label="Filters"], button:has-text("Filters")')
      .locator("visible=true")
      .first();
    const [link, above] = [await cta.boundingBox(), await filters.boundingBox()];
    expect(link!.y).toBeGreaterThanOrEqual(above!.y + above!.height - 1);
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

/**
 * The page's words, minus the money and the clock (a score's digits may turn up inside a price,
 * the surcharge, or a ticking countdown).
 */
const wordsOnPage = (page: Page) =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll(
        '[data-testid="price"],[data-testid="dial-price"],[data-testid="surcharge-note"],[data-testid="countdown"]',
      )
      .forEach((e) => e.remove());
    return clone.innerText;
  });

/**
 * A seed nobody has used: the same setting is the same shirt (FR-015), and a shirt someone else
 * made isn't his to buy (FR-018), so each run, and each project, makes its own.
 */
const freshSeed = () => (Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0;

async function makeItMineAt(page: Page, step: number) {
  await page.goto(`/how-complicated?seed=${freshSeed()}`);
  await setStep(page, step);
  const dialUrl = page.url();
  await visible(page.getByRole("button", { name: d.makeItMine })).click();
  await expect(page).toHaveURL(/\/shirts\/[a-z-]+$/, { timeout: 30_000 });
  return { dialUrl, slug: new URL(page.url()).pathname.split("/").pop()! };
}

async function signedUp(page: Page, project: string) {
  await page.goto("/sign-up");
  await signUp(page, uniqueEmail(project));
  await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
}

test.describe("US2 — buy the monster", () => {
  test("Make it mine lands on the one real shirt, bought by card and kept in order history", async ({
    page,
    browser,
  }, info) => {
    test.slow(); // real sign-ups and a checkout
    await signedUp(page, info.project.name);

    // FR-014: its own page, with a name, its art, a badge and a price.
    const { dialUrl, slug } = await makeItMineAt(page, 33);
    const name = await visible(page.getByRole("heading", { level: 1 })).innerText();
    expect(name).not.toMatch(/\d/);
    await expect(visible(page.locator('img[src*="/media/uploads/"]')).first()).toBeVisible();
    await expect(visible(page.getByTestId("tier-badge")).first()).toBeVisible();

    // FR-026, FR-027: made to order for him, no fake crowd, and the surcharge said up front.
    await expect(visible(page.getByTestId("stock-line"))).toHaveText(copy.urgency.made);
    await expect(page.getByTestId("social-proof")).toHaveCount(0);
    await expect(visible(page.getByTestId("surcharge-note"))).toHaveText(
      copy.surcharge.note("$499.99"),
    );
    // Money rows hold still under Extreme Awesomeness (constitution V).
    await expect(visible(page.getByTestId("surcharge-note"))).toHaveAttribute("data-steady", "");

    // FR-008, SC-003: the score is nowhere: not in his words, the link, or the shirt's address.
    const score = String(scoreOf(slug));
    // \\b, not \b: in a template literal \b is a backspace, and the check could never fail.
    const asAWord = new RegExp(`\\b${score}\\b`);
    expect(await wordsOnPage(page)).not.toMatch(asAWord);
    expect(dialUrl).not.toContain(score);
    expect(slug).not.toContain(score);
    await page.goto(dialUrl);
    expect(await wordsOnPage(page)).not.toMatch(asAWord);

    // FR-015: the same setting lands on the same shirt.
    await visible(page.getByRole("button", { name: d.makeItMine })).click();
    await expect(page).toHaveURL(new RegExp(`/shirts/${slug}$`), { timeout: 30_000 });

    // FR-016, FR-027: bought by card, and the order shows its art and its surcharge.
    await buyByCard(page, slug, "XL");
    const summary = visible(page.getByTestId("order-summary"));
    await expect(summary.locator('img[src*="/media/uploads/"]').first()).toBeVisible();
    await expect(summary.getByTestId("surcharge-line")).toContainText(copy.surcharge.line(1));
    await expect(summary.getByTestId("surcharge-line")).toContainText("$499.99");

    // As many as he likes: two in the cart pay it twice, and Dan makes every one.
    await addShirt(page, slug, "L");
    await addShirt(page, slug, "L");
    await expect(visible(page.getByText(copy.urgency.makeAnother))).toBeVisible();
    await page.goto("/cart");
    await expect(visible(page.getByTestId("surcharge-line"))).toContainText(copy.surcharge.line(2));
    await expect(visible(page.getByTestId("surcharge-line"))).toContainText("$999.98");
    await expect(visible(page.getByTestId("surcharge-line"))).toHaveAttribute("data-steady", "");
    await expect(visible(page.getByTestId("stock-line")).first()).toHaveText(copy.urgency.madeMany);

    // FR-018: anyone else sees it, and can't buy it.
    const other = await (await browser.newContext({ baseURL: info.project.use.baseURL })).newPage();
    await signedUp(other, `${info.project.name}-other`);
    await other.goto(`/shirts/${slug}`);
    await expect(visible(other.getByTestId("one-of-a-kind"))).toContainText(copy.oneOfAKind.taken);
    await expect(other.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
    await other.context().close();

    // FR-018, SC-008: one of a kind, so the listing and the home page never show it.
    await page.goto("/shirts");
    await expect(page.locator(`a[href="/shirts/${slug}"]`)).toHaveCount(0);
    await page.goto("/");
    await expect(page.locator(`a[href="/shirts/${slug}"]`)).toHaveCount(0);
  });

  test("a guest's Make it mine asks him to sign in, then brings him back to the setting", async ({
    page,
  }) => {
    test.slow(); // a sign-in
    await page.goto("/how-complicated");
    await setStep(page, 25);
    const dialUrl = page.url();
    const code = new URL(dialUrl).searchParams.get("r")!;
    await visible(page.getByRole("button", { name: d.makeItMine })).click();
    await expect(page).toHaveURL(/\/sign-in\?next=/);
    expect(new URL(page.url()).searchParams.get("next")).toBe(`/how-complicated?r=${code}`);
    await visible(page.getByLabel("Email")).fill(DEMO_SHOPPER.email);
    await visible(page.getByLabel("Password")).fill(DEMO_SHOPPER.password);
    await visible(page.getByRole("button", { name: copy.auth.signIn })).click();
    await expect(page).toHaveURL(new RegExp(`/how-complicated\\?r=${code}$`), { timeout: 30_000 });
  });

  test("the BLAND end becomes a BLAND shirt, and Add to Cart runs the loop (FR-017)", async ({
    page,
  }, info) => {
    test.slow(); // a real sign-up
    await signedUp(page, info.project.name);
    await makeItMineAt(page, 0);
    await visible(page.locator("label").filter({ hasText: /^M$/ })).click();
    await visible(page.getByRole("button", { name: "Add to cart" })).click();
    await expect(visible(page.getByTestId("shame-dialog"))).toContainText(copy.shame.title);
  });
});

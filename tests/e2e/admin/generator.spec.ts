import { expect, type Page } from "@playwright/test";
import { copy } from "../../../src/lib/copy";
import { signUp, test, uniqueEmail, visible } from "../helpers";
import { consoleMessage, field, signInAsOwner, unique } from "./helpers";

const g = copy.console.generator;
const preview = (page: Page) => visible(page.getByTestId("generator-art"));
const storePrice = async (page: Page, slug: string) => {
  await page.goto(`/shirts/${slug}`);
  return visible(page.getByTestId("price")).first().innerText();
};
const inListing = (page: Page, slug: string) => page.locator(`a[href="/shirts/${slug}"]`);

test.describe("US3 — Dan's generator (FR-019–FR-021)", () => {
  test("generate a 48 polo, shuffle, save it resting, put it on the floor, re-score it", async ({
    page,
  }, info) => {
    test.slow(); // the console and the store, back and forth
    const name = `Spreadsheet Rapture ${unique(info.project.name)}`;
    await signInAsOwner(page);

    // FR-019: a level and a style, previewed with its counted score, tier and MSRP.
    await page.goto("/admin/shirts");
    await visible(page.getByRole("link", { name: g.generateOne })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/generate/);
    // FR-019 (owner review Q9): the slider is spaced like the dial, and each follows the other.
    const slider = visible(page.getByRole("slider", { name: g.slider }));
    await slider.fill("40");
    await expect(field(page, g.score)).toHaveValue("100");
    // 010 FR-011: the generator stops where the dial does.
    await field(page, g.score).fill("10250");
    await visible(page.getByRole("button", { name: g.preview })).click();
    await expect(visible(page.getByText(g.beyond)).first()).toBeVisible();
    await field(page, g.score).fill("48");
    await expect(slider).toHaveValue("19");
    await field(page, g.style, false).selectOption("polo");
    await visible(page.getByRole("button", { name: g.preview })).click();
    await expect(page).toHaveURL(/score=48/);
    await expect(visible(page.getByTestId("generator-count"))).toHaveText("48");
    await expect(visible(page.getByTestId("generator-msrp"))).toHaveText("$1,250.00");
    const first = await preview(page).getAttribute("src");
    await visible(page.getByRole("button", { name: g.shuffle })).click();
    await expect(preview(page)).not.toHaveAttribute("src", first!);
    await expect(visible(page.getByTestId("generator-count"))).toHaveText("48");

    // FR-020: saved as a new shirt, resting, marked as Dan's own work.
    await field(page, g.name).fill(name);
    await visible(page.getByRole("button", { name: g.save })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/\d+\?saved=1$/, { timeout: 30_000 });
    await expect(consoleMessage(page)).toHaveText(copy.console.saved);
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/resting/i);
    await expect(visible(page.getByTestId("shirt-origin"))).toHaveText(g.origins.owner);
    await expect(field(page, copy.console.shirts.fields.complexity)).toHaveValue("48");
    const editUrl = page.url().replace(/\?.*$/, "");
    const slug = (await visible(
      page.getByRole("link", { name: copy.console.shirts.viewInStore }),
    ).getAttribute("href"))!
      .split("/")
      .pop()!;

    // On the floor, the store has it: its page, and the listing.
    await visible(page.getByRole("button", { name: copy.console.shirts.activate })).click();
    await expect(visible(page.getByTestId("shirt-status"))).toHaveText(/on the floor/i);
    const before = await storePrice(page, slug);
    await expect(visible(page.getByRole("heading", { level: 1 }))).toHaveText(name);
    await page.goto("/shirts");
    await expect(inListing(page, slug).first()).toBeVisible();

    // US3 scenario 4: a new score reprices it; the art stays as drawn.
    await page.goto(editUrl);
    const art = await visible(page.getByTestId("shirt-image"))
      .first()
      .locator("img")
      .getAttribute("src");
    await field(page, copy.console.shirts.fields.complexity).fill("60");
    await visible(page.getByRole("button", { name: copy.console.shirts.save })).click();
    await expect(consoleMessage(page)).toHaveText(copy.console.saved);
    expect(await storePrice(page, slug)).not.toBe(before);
    await page.goto(editUrl);
    await expect(visible(page.getByTestId("shirt-image")).first().locator("img")).toHaveAttribute(
      "src",
      art!,
    );
  });

  test("Dan reviews a shopper's creation, mass-produces it, and makes it one of a kind again", async ({
    page,
    browser,
  }, info) => {
    test.slow(); // a shopper at the dial, then the console and the store
    const shopper = await (
      await browser.newContext({ baseURL: info.project.use.baseURL })
    ).newPage();
    await shopper.goto("/sign-up");
    await signUp(shopper, uniqueEmail(info.project.name));
    await expect(shopper).toHaveURL(/\/account$/, { timeout: 30_000 });
    const seed = (Date.now() + (info.project.name.includes("phone") ? 1 : 0)) % 2 ** 32;
    await shopper.goto(`/how-complicated?seed=${seed}`);
    await expect(visible(shopper.getByTestId("dial-make"))).toBeEnabled();
    await visible(shopper.getByTestId("dial-make")).click();
    await expect(shopper).toHaveURL(/\/shirts\/[a-z-]+$/, { timeout: 30_000 });
    const slug = new URL(shopper.url()).pathname.split("/").pop()!;
    await shopper.context().close();

    // FR-021 (owner review Q6): the shopper creations are Dan's review queue.
    await signInAsOwner(page);
    await page.goto("/admin/shirts");
    await visible(page.getByRole("link", { name: g.review })).click();
    await expect(page).toHaveURL(/origin=dial/);
    const row = visible(page.locator(`[data-testid="admin-shirt"][data-slug="${slug}"]`));
    await expect(row).toBeVisible();
    await expect(row).toContainText(g.origins.dial);
    await row.getByRole("link").first().click();
    await expect(visible(page.getByTestId("shirt-maker"))).toContainText(`${g.maker} Greg`);
    await expect(visible(page.getByTestId("shirt-listed"))).toHaveText(g.oneOfAKind);

    await visible(page.getByRole("button", { name: g.list })).click();
    await expect(consoleMessage(page)).toHaveText(g.listedNow);
    await expect(visible(page.getByTestId("shirt-listed"))).toHaveText(g.listed);
    const editUrl = page.url();
    await page.goto("/shirts");
    await expect(inListing(page, slug).first()).toBeVisible();

    await page.goto("/admin/shirts?origin=dial");
    await expect(row).toContainText(g.massProduced);

    await page.goto(editUrl);
    await visible(page.getByRole("button", { name: g.unlist })).click();
    await expect(consoleMessage(page)).toHaveText(g.unlistedNow);
    await page.goto("/shirts");
    await expect(inListing(page, slug)).toHaveCount(0);
  });

  test("the Uniquity Surcharge's amount saves, and the store follows (FR-027)", async ({
    page,
  }) => {
    const u = copy.console.settings.surcharge;
    await signInAsOwner(page);
    await page.goto("/admin/settings");
    const amount = field(page, u.label);
    await amount.fill("123.45");
    await visible(page.getByRole("button", { name: u.save })).click();
    await expect(
      visible(page.getByTestId("console-message")).filter({ hasText: copy.console.saved }),
    ).toBeVisible();
    await page.reload();
    await expect(field(page, u.label)).toHaveValue("123.45");
    // Back to the default: the shopper specs and the other console project expect it.
    await field(page, u.label).fill("499.99");
    await visible(page.getByRole("button", { name: u.save })).click();
    await expect(
      visible(page.getByTestId("console-message")).filter({ hasText: copy.console.saved }),
    ).toBeVisible();
  });
});

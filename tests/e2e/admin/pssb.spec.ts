import { expect, type Page } from "@playwright/test";
import { copy } from "../../../src/lib/copy";
import { buyByCard, test, visible } from "../helpers";
import { consoleMessage, field, signInAsOwner } from "./helpers";

const t = copy.console.settings.pssb;
const card = (page: Page) => visible(page.getByTestId("pssb-settings"));

test.describe("012 US5 — Dan's controls", () => {
  test("the support email reaches PSSB and the order page; Test answers; the switch hides him", async ({
    page,
    browser,
  }, info) => {
    test.slow(); // the console, a checkout, and the store, back and forth
    const email = `complaints-${info.project.name}@danflashes.test`;
    await signInAsOwner(page);
    await page.goto("/admin/settings");

    // FR-019, FR-020: the support email.
    await field(page, t.supportEmail).fill("not an email");
    await card(page).getByRole("button", { name: t.saveEmail }).click();
    await expect(card(page)).toContainText(t.emailFormat);
    await field(page, t.supportEmail).fill(email);
    await card(page).getByRole("button", { name: t.saveEmail }).click();
    await expect(consoleMessage(page).first()).toBeVisible();

    const shopper = await (
      await browser.newContext({ baseURL: info.project.use.baseURL })
    ).newPage();
    await shopper.goto("/");
    await visible(shopper.getByTestId("pssb-launcher")).click();
    await visible(shopper.getByLabel(copy.pssb.placeholder)).fill("where is my order?");
    await visible(shopper.getByRole("button", { name: copy.pssb.send })).click();
    await expect(
      visible(shopper.locator('[data-testid="pssb-message"][data-role="pssb"]')).last(),
    ).toContainText(email);
    await shopper.context().close();

    await buyByCard(page, "geo-riot", "M");
    await expect(visible(page.getByTestId("support-line"))).toContainText(email);
    await expect(visible(page.getByTestId("support-line")).getByRole("link")).toHaveAttribute(
      "href",
      `mailto:${email}`,
    );

    // FR-019: Test answers; a wrong address says so; blank goes back to what's in effect.
    await page.goto("/admin/settings");
    await card(page).getByRole("button", { name: t.test }).click();
    await expect(page.getByTestId("pssb-test-result")).toContainText("PSSB answered in");
    await field(page, t.modelUrl).fill("http://localhost:3199");
    await card(page).getByRole("button", { name: t.save }).click();
    await expect(page.getByTestId("pssb-in-effect")).toContainText("http://localhost:3199");
    await card(page).getByRole("button", { name: t.test }).click();
    await expect(page.getByTestId("pssb-test-result")).toContainText(
      "No answer from http://localhost:3199",
    );
    await field(page, t.modelUrl).fill("");
    await card(page).getByRole("button", { name: t.save }).click();
    await expect(page.getByTestId("pssb-in-effect")).toContainText("http://localhost:3101");
    await field(page, t.supportEmail).fill("");
    await card(page).getByRole("button", { name: t.saveEmail }).click();
    await expect(consoleMessage(page).first()).toBeVisible();

    // FR-018: his switch.
    const sw = visible(page.locator('[data-testid="switch"][data-key="pushySalesBot"]'));
    await sw.getByRole("button", { name: copy.console.settings.turnOff }).click();
    await expect(sw.getByTestId("switch-state")).toHaveText(copy.console.settings.off);
    await page.goto("/");
    await expect(page.getByTestId("pssb-launcher")).toHaveCount(0);
    await page.goto("/admin/settings");
    await sw.getByRole("button", { name: copy.console.settings.turnOn }).click();
    await expect(sw.getByTestId("switch-state")).toHaveText(copy.console.settings.on);
    await page.goto("/");
    await expect(visible(page.getByTestId("pssb-launcher"))).toBeVisible();
    // The console itself never shows him (constitution V).
    await page.goto("/admin");
    await expect(page.getByTestId("pssb-launcher")).toHaveCount(0);
  });
});

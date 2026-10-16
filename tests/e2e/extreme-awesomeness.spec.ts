import { expect, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import {
  addShirt,
  awesomeButton,
  backgroundChanges,
  mostChangesInASecond,
  pushPopsAway,
  signUp,
  test,
  textContrasts,
  uniqueEmail,
  visible,
} from "./helpers";

const html = (page: Page) => page.locator("html");

/** Price, tier badge and Add to Cart: the colors that must never move (FR-012). */
const saleColors = (page: Page) =>
  page.evaluate(() =>
    ['[data-testid="price"]', '[data-testid="tier-badge"]', "button"].map((selector) => {
      const el = [...document.querySelectorAll(selector)].find(
        (e) =>
          (e as HTMLElement).checkVisibility?.() &&
          (selector !== "button" || e.textContent?.trim() === "Add to cart"),
      );
      if (!el) return `${selector}: missing`;
      const s = getComputedStyle(el);
      return `${selector}: ${s.color} on ${s.backgroundColor}, ${s.borderColor}`;
    }),
  );

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

test.describe("US1 — Extreme Awesomeness (Flash Mode)", () => {
  test("off at first, the loudest control, on at once; the sale holds and no text gets harder to read", async ({
    page,
  }, info) => {
    test.slow(); // three pages of sampling a strobe that holds each color 400 ms
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });

    // US1-1: in the header, no Menu needed, and off.
    await page.goto("/");
    const button = awesomeButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(html(page)).not.toHaveAttribute("data-awesome");
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);

    // US1-2 (FR-007): the only control on the page that animates by itself, even while it's off.
    const animating = await page.evaluate(() =>
      [...document.querySelectorAll("button, a, input, select, summary, [role=button]")]
        .filter((el) => (el as HTMLElement).checkVisibility?.())
        .filter((el) => el.getAnimations({ subtree: true }).some((a) => a.playState === "running"))
        .map((el) => el.getAttribute("data-testid") ?? el.textContent?.trim()),
    );
    expect(animating).toEqual(["extreme-awesomeness"]);

    // Before, with it off: the sale's colors, and every text's contrast with its backing on the
    // cart (with a line, and its hot-pink Check out button) and on Geo Riot.
    await addShirt(page, "geo-riot", "M");
    await page.goto("/cart");
    await expect(visible(page.getByTestId("cart-line")).first()).toBeVisible();
    const cartBaseline = await textContrasts(page);
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByRole("button", { name: "Add to cart" }))).toBeVisible();
    const before = await saleColors(page);
    expect(before.join("\n")).not.toContain("missing");
    const geoBaseline = await textContrasts(page);

    // US1-3: on at once, with no page load.
    const url = page.url();
    await awesomeButton(page).click();
    await expect(html(page)).toHaveAttribute("data-awesome", "on", { timeout: 250 });
    await expect(awesomeButton(page)).toHaveAttribute("aria-pressed", "true", { timeout: 250 });
    expect(page.url()).toBe(url);

    // US1-4 and analysis I1: across a whole strobe cycle, the sale never moves and no text gets
    // harder to read than it was (or than 3:1, if it started above that).
    const readable = async (baseline: Record<string, number>) => {
      for (let i = 0; i < 8; i++) {
        const now = await textContrasts(page);
        for (const [key, ratio] of Object.entries(now)) {
          if (!(key in baseline)) continue;
          const floor = Math.min(3, baseline[key]) - 0.01;
          expect(ratio, `${key} at sample ${i}`).toBeGreaterThanOrEqual(floor);
        }
        await pause(page, 300);
      }
    };
    for (let i = 0; i < 4; i++) {
      expect(await saleColors(page)).toEqual(before);
      await pause(page, 450);
    }
    await readable(geoBaseline);
    const noStrobe = async () =>
      expect(await page.locator("body").innerText()).not.toMatch(/strobe/i); // FR-019, analysis C4
    await noStrobe();

    // The cart, with its hot-pink Check out button.
    await page.goto("/cart");
    await expect(html(page)).toHaveAttribute("data-awesome", "on");
    await expect(visible(page.getByTestId("cart-line")).first()).toBeVisible();
    await readable(cartBaseline);
    await noStrobe();

    // US1-5 (FR-011): a shirt card steps through colors, at most 3 changes in any second.
    await page.goto("/shirts");
    const card = visible(page.getByTestId("shirt-card")).first();
    const changes = await backgroundChanges(card, 3000);
    expect(changes.length).toBeGreaterThan(0);
    expect(mostChangesInASecond(changes)).toBeLessThanOrEqual(3);
    await noStrobe();
    expect(await overflow()).toBeLessThanOrEqual(0);

    // Off again, at once: the attribute goes and the card stops changing.
    await awesomeButton(page).click();
    await expect(html(page)).not.toHaveAttribute("data-awesome", { timeout: 250 });
    await expect(awesomeButton(page)).toHaveAttribute("aria-pressed", "false");
    expect(await backgroundChanges(card, 1200)).toEqual([]);
  });

  test("his browser remembers it: reloads, tabs, open tabs, signing in and out; other browsers don't", async ({
    page,
    context,
    browser,
  }, info) => {
    test.slow(); // a sign-up, a sign-out and a sign-in (real bcrypt) on a busy machine
    await page.addInitScript(() => {
      // When <body> starts, has the inline <head> script already turned it on?
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        (window as unknown as { awesomeAtBody: string | null }).awesomeAtBody =
          document.documentElement.getAttribute("data-awesome");
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/");
    await awesomeButton(page).click();
    await expect(html(page)).toHaveAttribute("data-awesome", "on");

    // A reload arrives already on, before React hydrates (FR-009).
    await page.reload();
    await expect(html(page)).toHaveAttribute("data-awesome", "on");
    expect(
      await page.evaluate(() => (window as unknown as { awesomeAtBody: string }).awesomeAtBody),
    ).toBe("on");

    // A new tab is on, and an open tab follows along.
    const other = await context.newPage();
    await pushPopsAway(other);
    await other.goto("/shirts");
    await expect(html(other)).toHaveAttribute("data-awesome", "on");
    await expect(awesomeButton(other)).toHaveAttribute("aria-pressed", "true");
    await awesomeButton(page).click();
    await expect(html(other)).not.toHaveAttribute("data-awesome");
    await expect(awesomeButton(other)).toHaveAttribute("aria-pressed", "false");
    await awesomeButton(page).click();
    await expect(html(other)).toHaveAttribute("data-awesome", "on");
    await other.close();

    // Signing up, out and back in changes nothing: it's the browser's choice.
    const email = uniqueEmail(info.project.name);
    await page.goto("/sign-up");
    await signUp(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(html(page)).toHaveAttribute("data-awesome", "on");
    await visible(page.getByRole("button", { name: copy.shame.labels.signOut.shamed })).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(html(page)).toHaveAttribute("data-awesome", "on");
    await page.goto("/sign-in");
    await visible(page.getByLabel("Email")).fill(email);
    await visible(page.getByLabel("Password")).fill("complicated");
    await visible(page.getByRole("button", { name: "Sign in" })).click();
    await expect(page).toHaveURL(/\/account$/, { timeout: 30_000 });
    await expect(html(page)).toHaveAttribute("data-awesome", "on");

    // Another browser has its own choice: off.
    const fresh = await browser.newContext({ baseURL: info.project.use.baseURL });
    const stranger = await fresh.newPage();
    await pushPopsAway(stranger);
    await stranger.goto("/");
    await expect(awesomeButton(stranger)).toHaveAttribute("aria-pressed", "false");
    await expect(html(stranger)).not.toHaveAttribute("data-awesome");
    await fresh.close();
  });
});

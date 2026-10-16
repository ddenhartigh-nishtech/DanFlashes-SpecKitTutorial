import { expect, type Page } from "@playwright/test";
import { addShirt, awesomeButton, buyByCard, signUp, test, uniqueEmail, visible } from "./helpers";

const canvas = (page: Page) => page.locator('canvas[data-testid="pipes"]');

/** A cheap fingerprint of what the canvas has drawn: a sparse sum of its pixels. */
const drawn = (page: Page) =>
  canvas(page).evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext("2d");
    if (!ctx || !el.width || !el.height) return 0;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4 * 97)
      sum += data[i] + data[i + 1] + data[i + 2] + data[i + 3];
    return sum;
  });

/** Pretend the tab went to the background, or came back (FR-017). */
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (hidden ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

/** FR-016: every visible text node in <main> has a solid backing somewhere below <main>. */
const textOnTheField = (page: Page) =>
  page.evaluate(() => {
    const main = [...document.querySelectorAll("main")].find((m) => m.checkVisibility());
    if (!main) return ["no visible <main>"];
    const bare: string[] = [];
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const parent = node.parentElement;
      if (!text || !parent?.checkVisibility({ opacityProperty: true })) continue;
      let el: Element | null = parent;
      let backed = false;
      while (el && el !== main.parentElement) {
        const s = getComputedStyle(el);
        const alpha = Number((s.backgroundColor.match(/[\d.]+/g) ?? [])[3] ?? 1);
        const solid = s.backgroundColor !== "rgba(0, 0, 0, 0)" && alpha > 0;
        if (solid || s.backgroundImage !== "none") {
          backed = el !== main;
          break;
        }
        el = el.parentElement;
      }
      if (!backed) bare.push(text.slice(0, 50));
    }
    return bare;
  });

test.describe("US2 — the Pipes Background", () => {
  test("grows behind everything on a black field, pauses when hidden, starts over on resize", async ({
    page,
  }, info) => {
    test.slow(); // sampling a growing canvas, and a resize
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/shirts/geo-riot");
    await expect(canvas(page)).toBeHidden(); // off until he turns it on
    await awesomeButton(page).click();
    await expect(canvas(page)).toBeVisible();

    // Fixed, the size of the screen, under the page, and it never takes a tap (FR-003).
    const viewport = page.viewportSize()!;
    const box = (await canvas(page).boundingBox())!;
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);
    const style = await canvas(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, zIndex: s.zIndex, pointerEvents: s.pointerEvents };
    });
    expect(style).toEqual({ position: "fixed", zIndex: "-1", pointerEvents: "none" });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      "rgb(0, 0, 0)",
    );

    // It draws, and keeps drawing.
    const first = await drawn(page);
    await page.waitForTimeout(1000);
    const second = await drawn(page);
    expect(second).not.toBe(first);

    // Hidden, it stops; back, it carries on (FR-017).
    await setHidden(page, true);
    await page.waitForTimeout(200);
    const paused = await drawn(page);
    await page.waitForTimeout(1000);
    expect(await drawn(page)).toBe(paused);
    await setHidden(page, false);
    await page.waitForTimeout(1000);
    expect(await drawn(page)).not.toBe(paused);

    // It covers nothing: taps land on the controls, never the canvas.
    for (const target of [
      page.locator("header").getByTestId("cart-link"),
      visible(page.getByTestId("price")).first(),
      visible(page.getByRole("button", { name: "Add to cart" })),
    ]) {
      await target.scrollIntoViewIfNeeded();
      const b = (await target.boundingBox())!;
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.closest("canvas, a, button, span")?.tagName,
        [b.x + b.width / 2, b.y + b.height / 2],
      );
      expect(hit).not.toBe("CANVAS");
      expect(hit).toBeTruthy();
    }

    // A resize starts over at the new size (FR-015).
    const generation = Number(await canvas(page).getAttribute("data-generation"));
    await page.setViewportSize({ width: viewport.width - 40, height: viewport.height - 60 });
    await expect(canvas(page)).not.toHaveAttribute("data-generation", String(generation));
    const resized = (await canvas(page).boundingBox())!;
    expect(Math.round(resized.width)).toBe(viewport.width - 40);
    expect(Math.round(resized.height)).toBe(viewport.height - 60);

    // Off again: no canvas, and the plain field is back.
    await awesomeButton(page).click();
    await expect(canvas(page)).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
      "rgb(0, 0, 0)",
    );
  });

  test("no text sits directly on a pipe, on any page (FR-016)", async ({ page }, info) => {
    test.slow(); // eleven pages, a sign-up and a card checkout
    if (info.project.name === "phone") await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await awesomeButton(page).click();
    const bare: Record<string, string[]> = {};
    const audit = async (path?: string) => {
      if (path) await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-awesome", "on");
      await expect(visible(page.locator("main h1")).first()).toBeVisible();
      await page.waitForLoadState("networkidle"); // every streamed part has arrived
      const found = await textOnTheField(page);
      if (found.length) bare[new URL(page.url()).pathname] = found;
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `sideways scroll on ${page.url()}`).toBeLessThanOrEqual(0);
    };
    for (const path of [
      "/",
      "/shirts",
      "/shirts/geo-riot",
      "/about",
      "/sign-in",
      "/sign-up",
      "/nope",
    ]) {
      await audit(path);
    }
    await addShirt(page, "geo-riot", "M");
    await audit("/cart");
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    await audit();
    await audit("/checkout");
    await buyByCard(page, "geo-riot", "M");
    await audit();
    expect(bare).toEqual({});
  });
});

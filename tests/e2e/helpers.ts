import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { copy } from "../../src/lib/copy";

/**
 * Every journey starts with the fake-purchase pop-ups (004 R6) pushed an hour out, through the
 * feature's own schedule key, so a pop-up never lands on a button mid-test. The social proof
 * journey brings one in on purpose with `popOnNextLoad`. A key that's already set is left alone.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await pushPopsAway(page);
    await provide(page);
  },
});

/** The fixture's pop-up schedule, for pages a test opens itself (`context.newPage()`). */
export async function pushPopsAway(page: Page) {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem("df-pop-arm")) {
        sessionStorage.removeItem("df-pop-arm");
        sessionStorage.setItem("df-pop-next", String(Date.now() - 1));
      } else if (sessionStorage.getItem("df-pop-next") === null) {
        sessionStorage.setItem("df-pop-next", String(Date.now() + 3_600_000));
      }
    } catch {
      // no storage: nothing to schedule
    }
  });
}

/**
 * Make a pop-up due on the next page load. Armed before the page's scripts run, so the current
 * page's own schedule can't race it.
 */
export async function popOnNextLoad(page: Page) {
  await page.evaluate(() => sessionStorage.setItem("df-pop-arm", "1"));
}

/**
 * Next 16 keeps previously visited routes mounted but hidden (React <Activity>), so a locator can
 * match a hidden copy on an earlier page. Always target the visible one.
 */
export const visible = (locator: Locator) => locator.filter({ visible: true });

/** Unique per run and project so desktop and phone never collide on the shared e2e database. */
export const uniqueEmail = (project: string) =>
  `e2e+${project}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@danflashes.local`;

export async function addShirt(page: Page, slug: string, size: string) {
  await page.goto(`/shirts/${slug}`);
  await page
    .locator("label")
    .filter({ hasText: new RegExp(`^${size}$`) })
    .click();
  await visible(page.getByRole("button", { name: "Add to cart" })).click();
  await expect(visible(page.getByText("It's in the cart. Excellent decision."))).toBeVisible();
}

export async function signUp(page: Page, email: string) {
  await visible(page.getByLabel("What should Dan call you?")).fill("Greg");
  await visible(page.getByLabel("Email")).fill(email);
  await visible(page.getByLabel("Password")).fill("complicated");
  await visible(page.getByRole("button", { name: "Sign up" })).click();
}

/** Connect (or apply) a revenue stream from the account page's form. */
export async function connect(
  page: Page,
  stream: {
    source: string;
    customName?: string;
    amount: string;
    schedule: string;
    /** A recurring top-off's interval, e.g. ["5", "minutes"]. */
    every?: [string, keyof typeof copy.streams.units];
    ongoing?: boolean;
  },
) {
  const s = copy.streams;
  const section = visible(page.locator("#revenue-streams"));
  await section.getByLabel(s.form.source).selectOption({ label: stream.source });
  if (stream.customName) await section.getByLabel(s.form.customName).fill(stream.customName);
  await section.getByLabel(s.form.amount).fill(stream.amount);
  await section.getByRole("radio", { name: stream.schedule }).check();
  if (stream.every) {
    await section.getByLabel(s.form.intervalCount).fill(stream.every[0]);
    await section.getByLabel(s.form.intervalUnit).selectOption(stream.every[1]);
  }
  if (stream.ongoing) await section.getByLabel(s.form.ongoing).check();
  // A one-time top-up is applied, not connected.
  const submit = stream.schedule === s.schedules.one_time ? s.form.apply : s.form.connect;
  await section.getByRole("button", { name: submit }).click();
}

/**
 * A careful shopper (005): untick every pre-checked add-on, so the order is the shirts alone. Run
 * it on the checkout page; it waits for the form first.
 */
export async function untickAddOns(page: Page) {
  await visible(page.getByTestId("total")).waitFor();
  for (const box of await visible(page.getByTestId("add-on")).getByRole("checkbox").all()) {
    await box.uncheck();
  }
}

/** Buy one shirt by card, without the add-ons, and land on its confirmation. */
export async function buyByCard(page: Page, slug: string, size: string) {
  await addShirt(page, slug, size);
  await page.goto("/checkout");
  await untickAddOns(page);
  await visible(page.getByLabel("Card number")).fill("4242 4242 4242 4242");
  await visible(page.getByLabel("Expiry (MM/YY)")).fill("12/29");
  await visible(page.getByLabel("CVC")).fill("123");
  await visible(page.getByRole("button", { name: /Place order/ })).click();
  // Placing an order is the step that queues behind a busy machine: give it room.
  await expect(page).toHaveURL(/\/orders\/\d+$/, { timeout: 30_000 });
}

/** Get past the roach motel (005): yes to "Are you sure?", then yes to "Are you sure sure?". */
export async function confirmTwice(page: Page) {
  const dialog = visible(page.getByTestId("roach-motel"));
  await expect(dialog).toContainText(copy.roachMotel.first);
  await dialog.getByRole("button", { name: /^Yes/ }).click();
  await expect(dialog).toContainText(copy.roachMotel.second);
  await dialog.getByRole("button", { name: /^Yes/ }).click();
}

/** The Extreme Awesomeness toggle in the header (006). */
export const awesomeButton = (page: Page) =>
  visible(page.locator("header").getByTestId("extreme-awesomeness"));

/**
 * Every visible element with its own text, keyed by its place in the page, and its contrast with
 * the nearest backing behind it (006 analysis I1). Text sitting straight on the page field is left
 * out: that's the pipes' text-backing audit (FR-016).
 */
export async function textContrasts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const rgba = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const out: Record<string, number> = {};
    const seen = new Map<string, number>();
    for (const el of document.body.querySelectorAll("*")) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (!own || !(el as HTMLElement).checkVisibility?.({ opacityProperty: true })) continue;
      // Keyed by what it says, so the same text matches across samples and page loads.
      const base = `${el.tagName}|${own.slice(0, 40)}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      let backing: Element | null = el;
      while (backing && backing !== document.body) {
        const bg = rgba(getComputedStyle(backing).backgroundColor);
        if (bg.length >= 3 && (bg[3] ?? 1) > 0) break;
        backing = backing.parentElement;
      }
      if (!backing || backing === document.body) continue;
      const [a, b] = [
        lum(rgba(getComputedStyle(el).color)),
        lum(rgba(getComputedStyle(backing).backgroundColor)),
      ];
      out[`${base}#${n}`] = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }
    return out;
  });
}

/** When an element's background color changed, sampled every `everyMs` for `forMs`. */
export async function backgroundChanges(locator: Locator, forMs: number, everyMs = 50) {
  return locator.evaluate(
    (el, { forMs, everyMs }) =>
      new Promise<number[]>((resolve) => {
        const changes: number[] = [];
        let last = getComputedStyle(el).backgroundColor;
        const start = performance.now();
        const tick = () => {
          const now = performance.now();
          const bg = getComputedStyle(el).backgroundColor;
          if (bg !== last) changes.push(now - start);
          last = bg;
          if (now - start < forMs) setTimeout(tick, everyMs);
          else resolve(changes);
        };
        setTimeout(tick, everyMs);
      }),
    { forMs, everyMs },
  );
}

/** The most changes in any 1-second window. */
export const mostChangesInASecond = (changes: number[]) =>
  Math.max(0, ...changes.map((t) => changes.filter((u) => u >= t && u < t + 1000).length));

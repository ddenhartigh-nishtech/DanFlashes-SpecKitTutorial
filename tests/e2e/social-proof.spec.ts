import { expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";
import { popOnNextLoad, signUp, test, uniqueEmail, visible } from "./helpers";

const u = copy.urgency;
const people = u.cast.map((c) => `${c.name} from ${c.department}`);
const someone = new RegExp(
  `^(${people.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
);

test.describe("US3 — fabricated social proof", () => {
  test("who's looking, who just bought it, and pop-ups that keep coming", async ({
    page,
  }, info) => {
    test.slow(); // two sessions, a sign-up and pop-ups: more than 60 s on a busy machine
    const phone = info.project.name === "phone";
    if (phone) await page.setViewportSize({ width: 360, height: 780 });

    // Quickstart 7: a believable crowd, and a coworker who just bought it.
    await page.goto("/shirts/geo-riot");
    const proof = visible(page.getByTestId("social-proof"));
    const looking = await proof.getByTestId("looking").innerText();
    const n = Number(/^(\d+) /.exec(looking)?.[1]);
    expect(looking).toBe(u.looking(n));
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(40);
    await expect(proof.getByTestId("buyer")).toHaveText(someone);
    await expect(proof.getByTestId("buyer")).toContainText("just bought this pattern");

    // 9–10: a pop-up, right where it belongs, naming a real active shirt.
    await popOnNextLoad(page);
    await page.reload();
    const pop = visible(page.getByTestId("purchase-pop"));
    await expect(pop).toHaveCount(1);
    await expect(pop).toHaveText(someone);
    await expect(pop.getByRole("link")).toHaveAttribute("href", /^\/shirts\/[a-z0-9-]+$/);
    const box = (await pop.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (phone) {
      const header = (await page.locator("header").boundingBox())!;
      expect(Math.abs(box.y - (header.y + header.height))).toBeLessThanOrEqual(2);
      expect(box.width).toBeGreaterThan(viewport.width * 0.9);
    } else {
      expect(box.x + box.width / 2).toBeGreaterThan(viewport.width / 2);
      expect(box.y + box.height / 2).toBeGreaterThan(viewport.height / 2);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Its (x) closes it at once, and the next one is already on its way.
    await pop.getByRole("button", { name: u.dismissPop }).click();
    await expect(visible(page.getByTestId("purchase-pop"))).toHaveCount(0, { timeout: 500 });
    const nextIn = await page.evaluate(
      () => Number(sessionStorage.getItem("df-pop-next")) - Date.now(),
    );
    expect(nextIn).toBeGreaterThan(15_000);
    expect(nextIn).toBeLessThanOrEqual(40_000);

    // 8: nobody wants the bland one.
    await page.goto("/shirts/beige-regret");
    const bland = visible(page.getByTestId("social-proof"));
    await expect(bland.getByTestId("looking")).toHaveText(u.nobodyLooking);
    await expect(bland.getByTestId("buyer")).toHaveCount(0);

    // FR-005: signed in, it's all the same.
    await page.goto("/sign-up");
    await signUp(page, uniqueEmail(info.project.name));
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/shirts/geo-riot");
    await expect(visible(page.getByTestId("social-proof")).getByTestId("buyer")).toHaveText(
      someone,
    );
    await popOnNextLoad(page);
    await page.reload();
    await expect(visible(page.getByTestId("purchase-pop"))).toHaveText(someone);
  });
});

import { expect } from "@playwright/test";
import { png } from "../../helpers/images";
import { test, visible } from "../helpers";
import { field, signInAsOwner, unique } from "./helpers";

const svg = (label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#ff2d95"/><circle cx="20" cy="20" r="12" fill="#ffe600"/><text x="2" y="38" font-size="4">${label}</text></svg>`;

test.describe("US4 — uploading the goods (FR-022–FR-026)", () => {
  test("upload a pattern, hang it first on a shirt, and the store zooms on it", async ({
    page,
  }, info) => {
    test.slow();
    const id = unique(info.project.name);
    const alt = `Uploaded pattern ${id}`;
    const name = `Upload ${id}`;
    await signInAsOwner(page);

    // FR-023: an SVG with alt text joins the library.
    await page.goto("/admin/media");
    const uploader = visible(page.getByTestId("upload-form"));
    await uploader.getByLabel("Picture file", { exact: true }).setInputFiles({
      name: `pattern-${id}.svg`,
      mimeType: "image/svg+xml",
      buffer: Buffer.from(svg(id)),
    });
    await uploader.getByLabel("Alt text", { exact: true }).fill(alt);
    await uploader.getByRole("button", { name: "Upload" }).click();
    await expect(uploader.getByTestId("console-message")).toHaveText(/Saved/);
    await expect(visible(page.getByTestId("media-item")).filter({ hasText: alt })).toHaveCount(1);

    // FR-023: a photo too small to zoom is refused, with the reason.
    await uploader.getByLabel("Picture file", { exact: true }).setInputFiles({
      name: "tiny.png",
      mimeType: "image/png",
      buffer: Buffer.from(png(600, 600)),
    });
    await uploader.getByLabel("Alt text", { exact: true }).fill("Too small to count the shapes.");
    await uploader.getByRole("button", { name: "Upload" }).click();
    await expect(uploader.getByTestId("console-message")).toContainText("2,000");

    // FR-024: a new shirt, the upload attached and moved to the front.
    await page.goto("/admin/shirts/new");
    await field(page, "Name").fill(name);
    await field(page, "URL name").fill(`upload-${id}`);
    await field(page, "Complexity score").fill("35");
    await field(page, "Description").fill("Fresh from the printer.");
    await field(page, "Main picture", false).selectOption({ index: 1 });
    await page.getByLabel("Put it on the floor right away").check();
    await visible(page.getByRole("button", { name: "Save" })).click();
    await expect(page).toHaveURL(/\/admin\/shirts\/\d+/);
    await field(page, "Add a picture", false).selectOption({ label: alt });
    await visible(page.getByRole("button", { name: "Attach" })).click();
    await expect(visible(page.getByTestId("shirt-image"))).toHaveCount(2);
    await visible(page.getByTestId("shirt-image"))
      .filter({ hasText: alt })
      .getByRole("button", { name: "Move up" })
      .click();
    await expect(visible(page.getByTestId("shirt-image")).first()).toContainText(alt);

    // FR-026: the store's zoom viewer shows the upload.
    await page.goto(`/shirts/upload-${id}`);
    const art = visible(page.locator('img[src*="/media/uploads/"]')).first();
    await expect(art).toBeVisible();
    expect(await art.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
});

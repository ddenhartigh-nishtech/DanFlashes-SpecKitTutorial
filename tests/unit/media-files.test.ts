import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, checkAlt, inspectUpload } from "@/lib/admin/media-files";
import { SAFE_SVG, jpeg, png, text, webpVp8, webpVp8l, webpVp8x } from "../helpers/images";

describe("inspectUpload: what the bytes really are (008 FR-023, R8)", () => {
  it.each([
    ["PNG", png(2400, 1600), "png", 2400, 1600],
    ["JPEG", jpeg(2000, 3000), "jpeg", 2000, 3000],
    ["lossy WebP", webpVp8(2048, 1024), "webp", 2048, 1024],
    ["lossless WebP", webpVp8l(2500, 2500), "webp", 2500, 2500],
    ["extended WebP", webpVp8x(4000, 2200), "webp", 4000, 2200],
  ])("reads a %s's size from its header", (_name, bytes, format, width, height) => {
    expect(inspectUpload(bytes)).toMatchObject({ ok: true, format, width, height });
  });

  it("gives each format its own extension and type", () => {
    expect(inspectUpload(png(2000, 10))).toMatchObject({ ext: "png", contentType: "image/png" });
    expect(inspectUpload(jpeg(2000, 10))).toMatchObject({ ext: "jpg", contentType: "image/jpeg" });
    expect(inspectUpload(webpVp8x(2000, 10))).toMatchObject({
      ext: "webp",
      contentType: "image/webp",
    });
    expect(inspectUpload(text(SAFE_SVG))).toMatchObject({
      ok: true,
      format: "svg",
      ext: "svg",
      contentType: "image/svg+xml",
    });
  });

  it("refuses a photo under 2,000 px on its longest side, so the zoom has something to show", () => {
    const small = inspectUpload(png(1999, 1999));
    expect(small).toMatchObject({ ok: false });
    expect(!small.ok && small.reason).toMatch(/2,000/);
    expect(inspectUpload(png(2000, 100)).ok).toBe(true); // longest side counts
  });

  it.each([
    ["a text file renamed .png", text("just words, not a picture")],
    ["nothing at all", new Uint8Array()],
    ["a truncated PNG", png(2400, 2400).slice(0, 20)],
    ["a JPEG with no frame header", Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])],
  ])("refuses %s", (_name, bytes) => {
    expect(inspectUpload(bytes).ok).toBe(false);
  });

  it("refuses anything over 15 MB before looking any further", () => {
    const huge = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    huge.set(png(2400, 2400));
    const result = inspectUpload(huge);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.reason).toMatch(/15 MB/);
  });
});

describe("inspectUpload: an SVG can't reach outside itself (008 R8)", () => {
  const wrap = (inner: string, attrs = "") =>
    text(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`);

  it.each([
    ["a script", wrap("<script>alert(1)</script>")],
    ["an event handler", wrap("<rect/>", 'onload="alert(1)"')],
    ["a javascript: link", wrap('<a href="javascript:alert(1)"><rect/></a>')],
    ["a foreignObject", wrap("<foreignObject><div/></foreignObject>")],
    [
      "a DOCTYPE",
      text('<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>'),
    ],
    ["an external href", wrap('<image href="https://example.com/x.png"/>')],
    ["an external xlink:href", wrap('<use xlink:href="other.svg#a"/>')],
    ["an external url()", wrap('<rect style="fill: url(https://example.com/x)"/>')],
    ["an @import", wrap('<style>@import "https://example.com/x.css";</style>')],
  ])("refuses %s", (_name, bytes) => {
    expect(inspectUpload(bytes).ok).toBe(false);
  });

  it("accepts shapes, gradients and #references", () => {
    expect(inspectUpload(text(SAFE_SVG)).ok).toBe(true);
  });
});

describe("checkAlt (008 FR-023)", () => {
  it("wants 1 to 200 characters", () => {
    expect(checkAlt("Triangles. So many triangles.")).toBeNull();
    expect(checkAlt("x".repeat(200))).toBeNull();
    expect(checkAlt("   ")).not.toBeNull();
    expect(checkAlt("x".repeat(201))).not.toBeNull();
  });
});

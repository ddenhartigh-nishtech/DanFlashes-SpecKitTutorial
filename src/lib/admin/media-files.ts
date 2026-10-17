/**
 * What an upload really is (008 FR-023, R8): decided from its bytes, never its name or claimed
 * type. A PNG, JPEG or WebP is read for its size (a photo needs 2,000 px on its longest side so the
 * zoom has something to show); an SVG is refused if it could reach outside itself. Pure.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MIN_LONG_SIDE = 2000;
export const MAX_ALT = 200;

export type UploadFormat = "png" | "jpeg" | "webp" | "svg";

export type UploadInspection =
  | {
      ok: true;
      format: UploadFormat;
      ext: "png" | "jpg" | "webp" | "svg";
      contentType: string;
      width: number | null;
      height: number | null;
    }
  | { ok: false; reason: string };

const REASONS = {
  tooBig: "That file is over 15 MB. A smaller export will do.",
  notAnImage: "That isn't a PNG, JPEG, WebP or SVG picture.",
  tooSmall: (w: number, h: number) =>
    `That picture is ${w} × ${h}. It needs at least 2,000 pixels on its longest side, so shoppers can zoom in.`,
  svgUnsafe: (what: string) =>
    `That SVG has ${what}. Pictures here can't run anything or load anything else.`,
};

const RASTER = {
  png: { ext: "png", contentType: "image/png" },
  jpeg: { ext: "jpg", contentType: "image/jpeg" },
  webp: { ext: "webp", contentType: "image/webp" },
} as const;

const ascii = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...b.subarray(at, at + n));
const be16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
const be32 = (b: Uint8Array, at: number) =>
  ((b[at] << 24) >>> 0) + (b[at + 1] << 16) + (b[at + 2] << 8) + b[at + 3];
const le24 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);

type Size = { width: number; height: number };

function pngSize(b: Uint8Array): Size | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || signature.some((v, i) => b[i] !== v) || ascii(b, 12, 4) !== "IHDR")
    return null;
  return { width: be32(b, 16), height: be32(b, 20) };
}

/** Walk the JPEG's segments to the first frame header (SOFn), which holds the size. */
function jpegSize(b: Uint8Array): Size | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof) return i + 8 < b.length ? { height: be16(b, i + 5), width: be16(b, i + 7) } : null;
    if (marker === 0xd9 || marker === 0xda) return null; // end, or image data before any frame
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    i += 2 + be16(b, i + 2);
  }
  return null;
}

function webpSize(b: Uint8Array): Size | null {
  if (b.length < 25 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  switch (ascii(b, 12, 4)) {
    case "VP8 ":
      if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    case "VP8L": {
      if (b[20] !== 0x2f) return null;
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    case "VP8X":
      if (b.length < 30) return null;
      return { width: le24(b, 24) + 1, height: le24(b, 27) + 1 };
    default:
      return null;
  }
}

/** Everything an SVG could use to run code or fetch something, with what to call it. */
const SVG_HAZARDS: [RegExp, string][] = [
  [/<script/i, "a script"],
  [/\son[a-z]+\s*=/i, "an event handler"],
  [/javascript:/i, "a javascript: link"],
  [/<foreignObject/i, "embedded HTML"],
  [/<!DOCTYPE|<!ENTITY/i, "a DOCTYPE"],
  [/(?:xlink:)?href\s*=\s*["']\s*(?!#)/i, "a link to another file"],
  [/url\(\s*["']?\s*(?!#)/i, "a link to another file"],
  [/@import/i, "an @import"],
];

const SVG_ROOT = /^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i;

export function inspectUpload(bytes: Uint8Array): UploadInspection {
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, reason: REASONS.tooBig };
  if (bytes.length === 0) return { ok: false, reason: REASONS.notAnImage };

  const raster: [keyof typeof RASTER, Size | null][] = [
    ["png", pngSize(bytes)],
    ["jpeg", jpegSize(bytes)],
    ["webp", webpSize(bytes)],
  ];
  for (const [format, size] of raster) {
    if (!size) continue;
    if (Math.max(size.width, size.height) < MIN_LONG_SIDE) {
      return { ok: false, reason: REASONS.tooSmall(size.width, size.height) };
    }
    return { ok: true, format, ...RASTER[format], ...size };
  }

  const svg = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^﻿/, "");
  if (!SVG_ROOT.test(svg)) return { ok: false, reason: REASONS.notAnImage };
  const hazard = SVG_HAZARDS.find(([pattern]) => pattern.test(svg));
  if (hazard) return { ok: false, reason: REASONS.svgUnsafe(hazard[1]) };
  return {
    ok: true,
    format: "svg",
    ext: "svg",
    contentType: "image/svg+xml",
    width: null,
    height: null,
  };
}

/** Alt text: 1 to 200 characters. The problem with it, or null when it's fine. */
export function checkAlt(alt: string): string | null {
  const length = alt.trim().length;
  if (length === 0) return "Describe the picture in a few words, for anyone who can't see it.";
  if (length > MAX_ALT) return `Keep the description to ${MAX_ALT} characters or fewer.`;
  return null;
}

/** An upload's content type from its stored file name (the route serves only these). */
export function contentTypeOf(file: string): string | null {
  const ext = file.slice(file.lastIndexOf(".") + 1);
  return ext === "svg"
    ? "image/svg+xml"
    : (Object.values(RASTER).find((r) => r.ext === ext)?.contentType ?? null);
}

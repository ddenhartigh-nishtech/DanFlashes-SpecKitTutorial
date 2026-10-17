/**
 * Image bytes for upload tests (008 R8). The PNG is a real, decodable image at any size (a flat
 * color compresses to almost nothing); JPEG and WebP are just the headers the sniffer reads.
 */
import { crc32, deflateSync } from "node:zlib";

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** A real RGB PNG, one flat color. */
export function png(width: number, height: number): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB, deflate, no filter, no interlace
  const row = Buffer.alloc(1 + width * 3, 0x7a); // every channel 0x7a: a quiet grey
  row[0] = 0; // each row starts with its filter byte: none
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A JPEG's start, an APP0 segment, and a baseline frame header (SOF0) with the size. */
export function jpeg(width: number, height: number): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof0 = [
    0xff,
    0xc0,
    0x00,
    0x11,
    8,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    3,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
  ];
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

function riff(fourcc: string, payload: number[]): Uint8Array {
  const body = [...Buffer.from(fourcc, "ascii"), ...le(payload.length, 4), ...payload];
  return Uint8Array.from([
    ...Buffer.from("RIFF", "ascii"),
    ...le(4 + body.length, 4),
    ...Buffer.from("WEBP", "ascii"),
    ...body,
  ]);
}

const le = (n: number, bytes: number) =>
  Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 0xff);

/** A lossy WebP's header (VP8): 14-bit sizes after the start code. */
export const webpVp8 = (width: number, height: number) =>
  riff("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, ...le(width, 2), ...le(height, 2), 0, 0]);

/** A lossless WebP's header (VP8L): 14-bit sizes, minus one, packed after the signature. */
export const webpVp8l = (width: number, height: number) => {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff("VP8L", [0x2f, ...le(bits, 4), 0]);
};

/** An extended WebP's header (VP8X): 24-bit sizes, minus one. */
export const webpVp8x = (width: number, height: number) =>
  riff("VP8X", [0, 0, 0, 0, ...le(width - 1, 3), ...le(height - 1, 3)]);

export const text = (s: string) => new TextEncoder().encode(s);

/** A tidy SVG: shapes, a gradient, and an internal reference. */
export const SAFE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- a very complicated shirt -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
  <defs><linearGradient id="g"><stop offset="0" stop-color="#ff2d95"/></linearGradient>
  <rect id="r" width="5" height="5"/></defs>
  <rect width="10" height="10" fill="url(#g)"/>
  <use href="#r"/><use xlink:href="#r" x="5"/>
</svg>`;

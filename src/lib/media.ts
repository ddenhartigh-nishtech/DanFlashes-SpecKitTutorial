/**
 * Media addressing (research R18). The database stores a relative key such as
 * "shirts/geo-riot.svg"; the URL is the configurable base + key, so moving every image to a CDN
 * or blob store is a single settings change.
 */

const KEY_RE = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
const DEFAULT_MEDIA_ROOT = "/media";

export function isValidMediaKey(key: string): boolean {
  if (!KEY_RE.test(key)) return false;
  return !key.split("/").some((segment) => segment === "." || segment === "..");
}

export function resolveMediaUrl(key: string, baseUrl: string): string {
  if (!isValidMediaKey(key)) throw new RangeError(`Invalid media key: ${JSON.stringify(key)}`);
  const base = (baseUrl.trim() || DEFAULT_MEDIA_ROOT).replace(/\/+$/, "");
  return `${base}/${key}`;
}

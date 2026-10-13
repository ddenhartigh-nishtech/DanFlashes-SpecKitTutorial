/** Only same-site relative paths are honored for post-sign-in redirects (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return next;
}

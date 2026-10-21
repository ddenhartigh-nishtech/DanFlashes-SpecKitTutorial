/**
 * A minimal cookie interface so action logic stays framework-free and testable; the Next.js
 * adapter in src/app/_data/request.ts wraps `cookies()` to satisfy it.
 */
export const CART_COOKIE = "df_cart";
export const SESSION_COOKIE = "df_session";

export interface CookieOptions {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  delete(name: string): void;
}

export function cookieOptions(maxAgeDays: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeDays * 86_400,
  };
}

/** One cookie's value from a request's Cookie header (route handlers), if it's there. */
export function requestCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

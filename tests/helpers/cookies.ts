import type { CookieJar, CookieOptions } from "@/lib/http/cookies";

/** An in-memory cookie jar that records the options each cookie was set with. */
export class FakeCookieJar implements CookieJar {
  readonly values = new Map<string, string>();
  readonly options = new Map<string, CookieOptions>();

  constructor(initial: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(initial)) this.values.set(k, v);
  }
  get(name: string) {
    return this.values.get(name);
  }
  set(name: string, value: string, options: CookieOptions) {
    this.values.set(name, value);
    this.options.set(name, options);
  }
  delete(name: string) {
    this.values.delete(name);
  }
}

export function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

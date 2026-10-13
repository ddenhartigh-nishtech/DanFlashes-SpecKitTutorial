import { describe, expect, it } from "vitest";
import { GET } from "@/app/teapot/route";

describe("GET /teapot", () => {
  it("answers browsers with a branded HTML page and status 418", async () => {
    const res = await GET(
      new Request("http://localhost/teapot", { headers: { accept: "text/html" } }),
    );
    expect(res.status).toBe(418);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toMatch(/I&#39;m a teapot|I'm a teapot/);
    expect(body).toMatch(/Dan Flashes does not sell teapots/);
    expect(body).toContain('href="/shirts"');
  });

  it("answers everything else in plain text, still 418", async () => {
    const res = await GET(new Request("http://localhost/teapot", { headers: { accept: "*/*" } }));
    expect(res.status).toBe(418);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(await res.text()).toMatch(/teapot/i);
  });
});

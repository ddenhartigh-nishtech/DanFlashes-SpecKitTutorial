/**
 * HTTP 418 I'm a teapot (FR-035). A Route Handler, because pages can't set arbitrary status
 * codes. Reading the Accept header both picks the format and keeps the handler request-time
 * (Cache Components would otherwise prerender a handler that reads nothing from the request).
 */
import { copy } from "@/lib/copy";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");

function page(): string {
  const { teapotTitle, teapotBody, teapotCta } = copy.errors;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(teapotTitle)}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    font-family: Impact, "Arial Black", sans-serif; background: repeating-linear-gradient(-45deg,
    #ff2d95 0 18px, #ffe600 18px 36px, #00e5ff 36px 54px, #7a00ff 54px 72px); }
  main { max-width: 560px; background: #111; color: #fff8e7; padding: 24px;
    box-shadow: 6px 6px 0 #ff2d95; }
  h1 { color: #ffe600; font-size: 2rem; margin: 0 0 12px; }
  p { font-family: Arial, sans-serif; line-height: 1.5; }
  a { display: inline-block; margin-top: 12px; min-height: 44px; line-height: 44px; padding: 0 16px;
    background: #ff2d95; color: #fff8e7; text-transform: uppercase; text-decoration: none; }
</style>
</head>
<body>
<main>
<h1>${escape(teapotTitle)}</h1>
<p>${escape(teapotBody)}</p>
<a href="/shirts">${escape(teapotCta)}</a>
</main>
</body>
</html>`;
}

export function GET(request: Request): Response {
  const wantsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  return wantsHtml
    ? new Response(page(), { status: 418, headers: { "content-type": "text/html; charset=utf-8" } })
    : new Response(`${copy.errors.teapotTitle} ${copy.errors.teapotBody}\n`, {
        status: 418,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
}

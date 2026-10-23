import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e runs use their own build dir so they can run beside a developer's `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next.js nudges coding agents when this version has a published security advisory.
    agentUpgrade: "security",
    // Uploads (008 R8): a 15 MB picture plus the form's own overhead.
    serverActions: { bodySizeLimit: "16mb" },
    // The e2e build (and so `npm run verify`) always compiles fresh: its cached build once served
    // globals.css without a rule added minutes earlier (006). Other builds keep the cache.
    turbopackFileSystemCacheForBuild: !process.env.NEXT_DIST_DIR,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

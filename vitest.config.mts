import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // bcrypt at cost 12 (constitution) is deliberately slow; with ~30 parallel workers on one
    // machine, a test that hashes three passwords can pass 5 s. A real hang still fails at 20 s.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/db/client.ts"],
      thresholds: { lines: 90 },
      reporter: ["text-summary", "html"],
    },
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/client/**/*.test.ts",
      "examples/*/src/**/*.test.ts",
    ],
    testTimeout: 30000,
  },
});

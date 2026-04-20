import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["tests/publish-config/**/*.test.ts"],
    testTimeout: 10000,
    root: ".",
  },
});

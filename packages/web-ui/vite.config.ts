import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 5_000,
  },
  worker: {
    format: "es",
  },
});

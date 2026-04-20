import { defineConfig } from "vite-plus";

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

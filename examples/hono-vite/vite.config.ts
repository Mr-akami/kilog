import { defineConfig } from "vite-plus";
import devServer from "@hono/vite-dev-server";
import kilogPlugin from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [
    kilogPlugin(),
    devServer({ entry: "src/index.ts" }),
  ],
});

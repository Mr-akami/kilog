import { defineConfig } from "vite-plus";
import kilogPlugin from "@kilog/vite-plugin";

export default defineConfig({
  plugins: [kilogPlugin()],
});

import { defineConfig } from "vite-plus";
import kilogPlugin from "@mr-akami/kilog/vite-plugin";

export default defineConfig({
  plugins: [kilogPlugin()],
});

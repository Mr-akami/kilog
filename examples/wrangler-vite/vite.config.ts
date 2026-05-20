import { defineConfig } from "vite-plus";
import { cloudflare } from "@cloudflare/vite-plugin";
import kilogWranglerPlugin from "@kilog/wrangler-plugin";

export default defineConfig({
  plugins: [cloudflare(), kilogWranglerPlugin()],
});

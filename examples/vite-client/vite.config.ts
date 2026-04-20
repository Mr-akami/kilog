import { defineConfig } from "vite-plus";
import logitPlugin from "@logit/vite-plugin";

export default defineConfig({
  plugins: [logitPlugin()],
});

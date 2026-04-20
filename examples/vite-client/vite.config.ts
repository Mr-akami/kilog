import { defineConfig } from "vite";
import logitPlugin from "@logit/vite-plugin";

export default defineConfig({
  plugins: [logitPlugin()],
});

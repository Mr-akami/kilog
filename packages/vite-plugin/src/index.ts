import type { Plugin } from "vite";
import { generateBrowserRuntime } from "./browser-runtime.js";
import { createLogitMiddleware } from "./server-middleware.js";

export default function logitPlugin(): Plugin {
  const baseDir = process.env.LOGIT_DIR ?? process.cwd();

  return {
    name: "logit",

    transformIndexHtml() {
      const script = generateBrowserRuntime();
      return [{ tag: "script", children: script, injectTo: "head" }];
    },

    configureServer(server) {
      server.middlewares.use(createLogitMiddleware(baseDir));
    },
  };
}

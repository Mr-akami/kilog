import type { Plugin } from "vite";
import type { LogLevel } from "@logit/core";
import { generateBrowserRuntime } from "./browser-runtime.js";
import { createLogitMiddleware } from "./server-middleware.js";

export interface LogitPluginOptions {
  /**
   * Also print captured events to stdout.
   * - `true`: print every event.
   * - `LogLevel`: print events at or above that level (`error` > `warn` > `info` > `debug`).
   * - `false` / omitted (default): no terminal output.
   */
  terminal?: boolean | LogLevel;
}

export default function logitPlugin(options: LogitPluginOptions = {}): Plugin {
  const baseDir = process.env.LOGIT_DIR ?? process.cwd();

  return {
    name: "logit",

    transformIndexHtml() {
      const script = generateBrowserRuntime();
      return [{ tag: "script", children: script, injectTo: "head" }];
    },

    configureServer(server) {
      server.middlewares.use(createLogitMiddleware(baseDir, { terminal: options.terminal }));
    },
  };
}

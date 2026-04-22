import type { Plugin } from "vite";
import type { LogLevel } from "@kilog/core";
import { generateBrowserRuntime } from "./browser-runtime.js";
import { createKilogMiddleware } from "./server-middleware.js";

export interface KilogPluginOptions {
  /**
   * Also print captured events to stdout.
   * - `true`: print every event.
   * - `LogLevel`: print events at or above that level (`error` > `warn` > `info` > `debug`).
   * - `false` / omitted (default): no terminal output.
   */
  terminal?: boolean | LogLevel;
}

export default function kilogPlugin(options: KilogPluginOptions = {}): Plugin {
  const baseDir = process.env.KILOG_DIR ?? process.cwd();

  return {
    name: "kilog",

    transformIndexHtml() {
      const script = generateBrowserRuntime();
      return [{ tag: "script", children: script, injectTo: "head" }];
    },

    configureServer(server) {
      server.middlewares.use(createKilogMiddleware(baseDir, { terminal: options.terminal }));
    },
  };
}

import type { ConsoleEvent, LogLevel } from "@logit/core";
import { formatArgs } from "@logit/core";
import { createBaseFields } from "./context.js";
import type { RuntimeContext } from "./context.js";

const LEVEL_MAP: Record<string, LogLevel> = {
  log: "info",
  info: "info",
  warn: "warn",
  error: "error",
  debug: "debug",
};

const METHODS = ["log", "info", "warn", "error", "debug"] as const;

export function captureConsole(ctx: RuntimeContext): void {
  for (const method of METHODS) {
    const original = console[method];
    console[method] = (...args: unknown[]) => {
      original(...args);
      const event: ConsoleEvent = {
        ...createBaseFields(ctx),
        type: "console",
        level: LEVEL_MAP[method],
        message: formatArgs(args),
        args,
      };
      void ctx.writer.append(event);
    };
  }
}

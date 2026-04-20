import type { ErrorEvent, UnhandledRejectionEvent } from "@logit/core";
import { createBaseFields } from "./context.js";
import type { RuntimeContext } from "./context.js";

export function captureErrors(ctx: RuntimeContext): void {
  process.on("uncaughtException", (err: Error) => {
    const event: ErrorEvent = {
      ...createBaseFields(ctx),
      type: "error",
      level: "error",
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
    void ctx.writer.append(event);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const isError = reason instanceof Error;
    const event: UnhandledRejectionEvent = {
      ...createBaseFields(ctx),
      type: "unhandled-rejection",
      level: "error",
      message: isError ? reason.message : String(reason),
      name: isError ? reason.name : undefined,
      stack: isError ? reason.stack : undefined,
    };
    void ctx.writer.append(event);
  });
}

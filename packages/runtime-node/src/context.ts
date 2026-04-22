import { createWriter, createRedactor } from "@kilog/core";
import type { Writer, Runtime } from "@kilog/core";

export interface RuntimeContext {
  session: string;
  writer: Writer;
}

export interface BaseFields {
  id: string;
  timestamp: string;
  runtime: Runtime;
  session: string;
}

export function createBaseFields(ctx: RuntimeContext): BaseFields {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "node",
    session: ctx.session,
  };
}

export function createRuntimeContext(): RuntimeContext {
  const session = crypto.randomUUID();
  const baseDir = process.env.KILOG_DIR ?? process.cwd();
  const writer = createWriter({ baseDir, redactor: createRedactor() });
  return { session, writer };
}

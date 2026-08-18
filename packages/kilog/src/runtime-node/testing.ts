import type { LogEvent } from "../core/index.js";
import type { RuntimeContext } from "./context.js";

export function createMockContext(): { ctx: RuntimeContext; events: LogEvent[] } {
  const events: LogEvent[] = [];
  return {
    ctx: {
      session: "test-session",
      writer: {
        async append(event: LogEvent) {
          events.push(event);
        },
        async close() {},
      },
    },
    events,
  };
}

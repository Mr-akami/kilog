import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import type { ErrorEvent, LogEvent, UnhandledRejectionEvent } from "@kilog/core";
import { captureErrors } from "./capture-errors.js";
import { createMockContext } from "./testing.js";

describe("captureErrors", () => {
  let errorHandler: ((...args: unknown[]) => void) | undefined;
  let rejectionHandler: ((...args: unknown[]) => void) | undefined;

  afterEach(() => {
    if (errorHandler) {
      process.removeListener("uncaughtException", errorHandler as NodeJS.UncaughtExceptionListener);
      errorHandler = undefined;
    }
    if (rejectionHandler) {
      process.removeListener(
        "unhandledRejection",
        rejectionHandler as NodeJS.UnhandledRejectionListener,
      );
      rejectionHandler = undefined;
    }
  });

  function setupCapture(): { events: LogEvent[] } {
    const { ctx, events } = createMockContext();
    const errorCountBefore = process.listenerCount("uncaughtException");
    const rejectionCountBefore = process.listenerCount("unhandledRejection");

    captureErrors(ctx);

    const errorListeners = process.rawListeners("uncaughtException");
    errorHandler = errorListeners[errorCountBefore] as (...args: unknown[]) => void;

    const rejectionListeners = process.rawListeners("unhandledRejection");
    rejectionHandler = rejectionListeners[rejectionCountBefore] as (...args: unknown[]) => void;

    return { events };
  }

  it("should register uncaughtException listener", () => {
    setupCapture();
    expect(typeof errorHandler).toBe("function");
  });

  it("should register unhandledRejection listener", () => {
    setupCapture();
    expect(typeof rejectionHandler).toBe("function");
  });

  it("should create ErrorEvent from uncaughtException", async () => {
    const { events } = setupCapture();
    const err = new TypeError("test error");
    err.stack = "TypeError: test error\n  at test.ts:1:1";

    errorHandler!(err);
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as ErrorEvent;
    expect(event.type).toBe("error");
    expect(event.level).toBe("error");
    expect(event.message).toBe("test error");
    expect(event.name).toBe("TypeError");
    expect(event.stack).toBe(err.stack);
    expect(event.runtime).toBe("node");
    expect(event.session).toBe("test-session");
  });

  it("should include id and timestamp in ErrorEvent", async () => {
    const { events } = setupCapture();
    errorHandler!(new Error("test"));
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(events[0].id).toMatch(/^[0-9a-f]{8}-/);
    expect(events[0].timestamp).toBeTruthy();
  });

  it("should create UnhandledRejectionEvent from Error rejection", async () => {
    const { events } = setupCapture();
    const err = new Error("rejected");
    err.stack = "Error: rejected\n  at test.ts:2:1";

    rejectionHandler!(err);
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as UnhandledRejectionEvent;
    expect(event.type).toBe("unhandled-rejection");
    expect(event.level).toBe("error");
    expect(event.message).toBe("rejected");
    expect(event.name).toBe("Error");
    expect(event.stack).toBe(err.stack);
    expect(event.runtime).toBe("node");
    expect(event.session).toBe("test-session");
  });

  it("should handle non-Error rejection reason", async () => {
    const { events } = setupCapture();

    rejectionHandler!("string rejection");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as UnhandledRejectionEvent;
    expect(event.type).toBe("unhandled-rejection");
    expect(event.level).toBe("error");
    expect(event.message).toBe("string rejection");
  });

  it("should handle object rejection reason without stack", async () => {
    const { events } = setupCapture();

    rejectionHandler!({ code: "ERR_TIMEOUT" });
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as UnhandledRejectionEvent;
    expect(event.type).toBe("unhandled-rejection");
    expect(event.level).toBe("error");
    expect(event.message).toBeTruthy();
  });
});

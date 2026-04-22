import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import type { ConsoleEvent } from "@kilog/core";
import { captureConsole } from "./capture-console.js";
import { createMockContext } from "./testing.js";

const METHODS = ["log", "info", "warn", "error", "debug"] as const;

const EXPECTED_LEVEL: Record<string, ConsoleEvent["level"]> = {
  log: "info",
  info: "info",
  warn: "warn",
  error: "error",
  debug: "debug",
};

describe("captureConsole", () => {
  const originals: Record<string, typeof console.log> = {};

  beforeEach(() => {
    for (const m of METHODS) {
      originals[m] = console[m];
    }
  });

  afterEach(() => {
    for (const m of METHODS) {
      console[m] = originals[m];
    }
  });

  for (const method of METHODS) {
    it(`should wrap console.${method}`, () => {
      const { ctx } = createMockContext();
      captureConsole(ctx);
      expect(console[method]).not.toBe(originals[method]);
    });
  }

  it("should delegate to original console.log", () => {
    const spy = vi.fn();
    console.log = spy;
    const { ctx } = createMockContext();
    captureConsole(ctx);

    console.log("hello", 42);
    expect(spy).toHaveBeenCalledWith("hello", 42);
  });

  for (const method of METHODS) {
    it(`should create ConsoleEvent with level "${EXPECTED_LEVEL[method]}" for console.${method}`, async () => {
      const { ctx, events } = createMockContext();
      captureConsole(ctx);

      console[method]("test message");
      await vi.waitFor(() => expect(events).toHaveLength(1));

      const event = events[0] as ConsoleEvent;
      expect(event.type).toBe("console");
      expect(event.level).toBe(EXPECTED_LEVEL[method]);
      expect(event.runtime).toBe("node");
      expect(event.session).toBe("test-session");
    });
  }

  it("should capture all arguments in args field", async () => {
    const { ctx, events } = createMockContext();
    captureConsole(ctx);

    console.log("hello", "world", 42);
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as ConsoleEvent;
    expect(event.args).toEqual(["hello", "world", 42]);
  });

  it("should set message from arguments", async () => {
    const { ctx, events } = createMockContext();
    captureConsole(ctx);

    console.log("hello", "world");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as ConsoleEvent;
    expect(event.message).toContain("hello");
  });

  it("should include id and timestamp in event", async () => {
    const { ctx, events } = createMockContext();
    captureConsole(ctx);

    console.log("test");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as ConsoleEvent;
    expect(event.id).toMatch(/^[0-9a-f]{8}-/);
    expect(event.timestamp).toBeTruthy();
  });

  it("should capture multiple consecutive calls", async () => {
    const { ctx, events } = createMockContext();
    captureConsole(ctx);

    console.log("first");
    console.log("second");
    await vi.waitFor(() => expect(events).toHaveLength(2));

    expect((events[0] as ConsoleEvent).message).toContain("first");
    expect((events[1] as ConsoleEvent).message).toContain("second");
  });

  it("should capture a stack trace that points at the caller, not the wrapper", async () => {
    const { ctx, events } = createMockContext();
    captureConsole(ctx);

    function myCaller() {
      console.log("from myCaller");
    }
    myCaller();
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as ConsoleEvent;
    expect(typeof event.stack).toBe("string");
    // The user's function name must appear in the stack.
    expect(event.stack).toContain("myCaller");
    // The internal wrapper must NOT be the top frame — that's what
    // Error.captureStackTrace(obj, wrapped) is meant to hide.
    const firstFrame = (event.stack ?? "").split("\n")[1] ?? "";
    expect(firstFrame).not.toContain("wrapped");
  });
});

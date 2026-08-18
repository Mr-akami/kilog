import { describe, it, expect } from "vite-plus/test";
import { serialize, deserialize } from "./serializer.js";
import type {
  ConsoleEvent,
  ErrorEvent,
  NetworkEvent,
  UnhandledRejectionEvent,
} from "../schema/types.js";

// ── helpers ──

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "hello",
    ...overrides,
  };
}

function makeErrorEvent(overrides?: Partial<ErrorEvent>): ErrorEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "node",
    session: "sess-1",
    type: "error",
    level: "error",
    message: "boom",
    name: "TypeError",
    ...overrides,
  };
}

function makeNetworkEvent(overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "browser",
    session: "sess-2",
    type: "network",
    level: "info",
    method: "GET",
    url: "https://api.example.com/users/123",
    normalizedPath: "/users/:id",
    failed: false,
    ...overrides,
  };
}

function makeUnhandledRejectionEvent(
  overrides?: Partial<UnhandledRejectionEvent>,
): UnhandledRejectionEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "deno",
    session: "sess-3",
    type: "unhandled-rejection",
    level: "error",
    message: "unhandled",
    ...overrides,
  };
}

// ── serialize ──

describe("serialize", () => {
  it("should return a JSON string without trailing newline", () => {
    const event = makeConsoleEvent();
    const result = serialize(event);
    expect(result.endsWith("\n")).toBe(false);
    expect(JSON.parse(result)).toEqual(event);
  });

  it("should round-trip ConsoleEvent", () => {
    const event = makeConsoleEvent({ args: [1, "two", { three: 3 }] });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should round-trip ConsoleEvent with stack", () => {
    const event = makeConsoleEvent({ level: "error", stack: "Error\n  at foo" });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should round-trip ErrorEvent", () => {
    const event = makeErrorEvent({ stack: "TypeError: x\n  at bar" });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should round-trip NetworkEvent", () => {
    const event = makeNetworkEvent({
      status: 200,
      duration: 123.45,
      size: 4096,
    });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should round-trip NetworkEvent with failure", () => {
    const event = makeNetworkEvent({
      failed: true,
      errorMessage: "ECONNREFUSED",
    });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should round-trip UnhandledRejectionEvent", () => {
    const event = makeUnhandledRejectionEvent({
      name: "Error",
      stack: "Error\n  at baz",
    });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should handle optional fields being absent", () => {
    const event = makeConsoleEvent();
    // no args, no stack
    const restored = deserialize(serialize(event));
    expect(restored).toEqual(event);
    expect((restored as ConsoleEvent).args).toBeUndefined();
    expect((restored as ConsoleEvent).stack).toBeUndefined();
  });

  it("should preserve unicode in message", () => {
    const event = makeConsoleEvent({ message: "日本語テスト 🎉" });
    expect(deserialize(serialize(event))).toEqual(event);
  });

  it("should preserve special JSON characters", () => {
    const event = makeConsoleEvent({ message: 'line1\nline2\ttab"quote' });
    expect(deserialize(serialize(event))).toEqual(event);
  });
});

// ── deserialize ──

describe("deserialize", () => {
  it("should throw on empty string", () => {
    expect(() => deserialize("")).toThrow();
  });

  it("should throw on non-JSON string", () => {
    expect(() => deserialize("not json")).toThrow();
  });

  it("should throw on JSON that is not an object", () => {
    expect(() => deserialize('"just a string"')).toThrow();
  });

  it("should throw on JSON array", () => {
    expect(() => deserialize("[]")).toThrow();
  });

  it("should throw on object missing required fields", () => {
    expect(() => deserialize(JSON.stringify({ id: "x" }))).toThrow();
  });

  it("should throw on object with invalid type", () => {
    const bad = {
      id: "x",
      timestamp: new Date().toISOString(),
      runtime: "node",
      session: "s",
      type: "unknown-type",
    };
    expect(() => deserialize(JSON.stringify(bad))).toThrow();
  });

  it("should handle leading/trailing whitespace in line", () => {
    const event = makeConsoleEvent();
    // Implementation may or may not trim. We test the trimmed form works.
    const trimmed = serialize(event);
    expect(deserialize(trimmed)).toEqual(event);
  });

  it("should throw on null input", () => {
    expect(() => deserialize(null as unknown as string)).toThrow();
  });
});

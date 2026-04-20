import { describe, it, expect } from "vite-plus/test";
import { formatLogLine } from "./log-line.js";
import type { ConsoleEvent, ErrorEvent, NetworkEvent, UnhandledRejectionEvent } from "@logit/core";

function makeConsoleEvent(overrides?: Partial<ConsoleEvent>): ConsoleEvent {
  return {
    id: "evt-1",
    timestamp: "2026-04-18T10:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "console",
    level: "info",
    message: "hello world",
    ...overrides,
  };
}

function makeErrorEvent(overrides?: Partial<ErrorEvent>): ErrorEvent {
  return {
    id: "evt-2",
    timestamp: "2026-04-18T11:00:00.000Z",
    runtime: "node",
    session: "sess-1",
    type: "error",
    level: "error",
    message: "something broke",
    name: "TypeError",
    ...overrides,
  };
}

function makeNetworkEvent(overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id: "evt-3",
    timestamp: "2026-04-18T12:00:00.000Z",
    runtime: "browser",
    session: "sess-2",
    type: "network",
    level: "info",
    method: "GET",
    url: "https://api.example.com/users",
    normalizedPath: "/users",
    failed: false,
    ...overrides,
  };
}

describe("formatLogLine", () => {
  // ── console events ──

  it("should include timestamp, level, and message for console event", () => {
    const event = makeConsoleEvent();
    const line = formatLogLine(event);

    expect(line).toContain("2026-04-18T10:00:00.000Z");
    expect(line).toContain("info");
    expect(line).toContain("hello world");
  });

  it("should include runtime for console event", () => {
    const event = makeConsoleEvent({ runtime: "browser" });
    const line = formatLogLine(event);

    expect(line).toContain("browser");
  });

  it("should format warn level distinctly", () => {
    const event = makeConsoleEvent({ level: "warn", message: "caution" });
    const line = formatLogLine(event);

    expect(line).toContain("warn");
    expect(line).toContain("caution");
  });

  // ── error events ──

  it("should include error name and message for error event", () => {
    const event = makeErrorEvent();
    const line = formatLogLine(event);

    expect(line).toContain("TypeError");
    expect(line).toContain("something broke");
  });

  it("should include stack when present in error event", () => {
    const event = makeErrorEvent({ stack: "Error: boom\n  at foo.js:10" });
    const line = formatLogLine(event);

    expect(line).toContain("Error: boom");
  });

  // ── network events ──

  it("should include method, url, and status for network event", () => {
    const event = makeNetworkEvent({ status: 200, duration: 42 });
    const line = formatLogLine(event);

    expect(line).toContain("GET");
    expect(line).toContain("https://api.example.com/users");
    expect(line).toContain("200");
  });

  it("should indicate failed network request", () => {
    const event = makeNetworkEvent({
      failed: true,
      errorMessage: "timeout",
    });
    const line = formatLogLine(event);

    expect(line).toContain("timeout");
  });

  it("should handle network event without optional fields", () => {
    const event = makeNetworkEvent();
    const line = formatLogLine(event);

    expect(line).toContain("GET");
    expect(line).toContain("/users");
  });

  // ── unhandled rejection ──

  it("should format unhandled rejection event", () => {
    const event: UnhandledRejectionEvent = {
      id: "evt-4",
      timestamp: "2026-04-18T13:00:00.000Z",
      runtime: "deno",
      session: "sess-3",
      type: "unhandled-rejection",
      level: "error",
      message: "promise failed",
    };
    const line = formatLogLine(event);

    expect(line).toContain("unhandled-rejection");
    expect(line).toContain("promise failed");
  });
});

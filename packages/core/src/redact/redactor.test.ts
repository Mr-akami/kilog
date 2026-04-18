import { describe, it, expect } from "vitest";
import { createRedactor } from "./redactor.js";
import { DEFAULT_RULES } from "./patterns.js";
import type { RedactRule } from "./patterns.js";
import type {
  ConsoleEvent,
  NetworkEvent,
  LogEvent,
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

function makeNetworkEvent(overrides?: Partial<NetworkEvent>): NetworkEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    runtime: "browser",
    session: "sess-1",
    type: "network",
    level: "info",
    method: "GET",
    url: "https://api.example.com/data",
    normalizedPath: "/data",
    failed: false,
    ...overrides,
  };
}

// ── default rules ──

describe("DEFAULT_RULES", () => {
  it("should be a non-empty array", () => {
    expect(Array.isArray(DEFAULT_RULES)).toBe(true);
    expect(DEFAULT_RULES.length).toBeGreaterThan(0);
  });

  it("each rule should have name and replacement", () => {
    for (const rule of DEFAULT_RULES) {
      expect(rule.name).toBeTruthy();
      expect(typeof rule.replacement).toBe("string");
    }
  });
});

// ── createRedactor with defaults ──

describe("createRedactor (defaults)", () => {
  const redact = createRedactor();

  it("should mask email addresses in message", () => {
    const event = makeConsoleEvent({ message: "user email is foo@example.com" });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("foo@example.com");
  });

  it("should mask Authorization header value in message", () => {
    const event = makeConsoleEvent({
      message: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.xxx",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("should mask bearer tokens in message", () => {
    const event = makeConsoleEvent({
      message: "token is Bearer abc123secret",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("abc123secret");
  });

  it("should mask password values in args (recursive)", () => {
    const event = makeConsoleEvent({
      args: [{ user: "bob", password: "s3cret" }],
    });
    const result = redact(event) as ConsoleEvent;
    const arg = (result.args as Record<string, unknown>[])[0];
    expect(arg.password).not.toBe("s3cret");
    expect(arg.user).toBe("bob");
  });

  it("should mask apiKey in nested args", () => {
    const event = makeConsoleEvent({
      args: [{ config: { apiKey: "sk-12345" } }],
    });
    const result = redact(event) as ConsoleEvent;
    const nested = (result.args as any)[0].config;
    expect(nested.apiKey).not.toBe("sk-12345");
  });

  it("should mask token key in args", () => {
    const event = makeConsoleEvent({
      args: [{ token: "my-secret-token" }],
    });
    const result = redact(event) as ConsoleEvent;
    expect((result.args as any)[0].token).not.toBe("my-secret-token");
  });

  it("should mask secret key in args", () => {
    const event = makeConsoleEvent({
      args: [{ secret: "top-secret-value" }],
    });
    const result = redact(event) as ConsoleEvent;
    expect((result.args as any)[0].secret).not.toBe("top-secret-value");
  });

  it("should mask Cookie header value in message", () => {
    const event = makeConsoleEvent({
      message: "Cookie: session=abc123; token=xyz",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("abc123");
  });

  it("should mask Set-Cookie header value in message", () => {
    const event = makeConsoleEvent({
      message: "Set-Cookie: session=abc123; Path=/",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("abc123");
  });

  it("should mask email in network url", () => {
    const event = makeNetworkEvent({
      url: "https://api.example.com/users?email=foo@bar.com",
    });
    const result = redact(event) as NetworkEvent;
    expect(result.url).not.toContain("foo@bar.com");
  });
});

// ── immutability ──

describe("createRedactor immutability", () => {
  const redact = createRedactor();

  it("should return a new object, not mutate the original", () => {
    const event = makeConsoleEvent({
      message: "email: foo@example.com",
    });
    const original = { ...event };
    const result = redact(event);
    expect(result).not.toBe(event);
    expect(event.message).toBe(original.message);
  });

  it("should not mutate nested args", () => {
    const inner = { password: "secret123" };
    const event = makeConsoleEvent({ args: [inner] });
    redact(event);
    expect(inner.password).toBe("secret123");
  });
});

// ── custom rules ──

describe("createRedactor (custom rules)", () => {
  it("should apply custom rules alongside defaults", () => {
    const customRule: RedactRule = {
      name: "ssn",
      valuePattern: /\d{3}-\d{2}-\d{4}/g,
      replacement: "[SSN]",
    };
    const redact = createRedactor({ rules: [customRule] });
    const event = makeConsoleEvent({
      message: "SSN is 123-45-6789 and email foo@bar.com",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("123-45-6789");
    expect(result.message).toContain("[SSN]");
    // defaults still active
    expect(result.message).not.toContain("foo@bar.com");
  });

  it("should support keyPattern custom rule", () => {
    const customRule: RedactRule = {
      name: "credit-card",
      keyPattern: /creditCard/i,
      replacement: "[REDACTED]",
    };
    const redact = createRedactor({ rules: [customRule] });
    const event = makeConsoleEvent({
      args: [{ creditCard: "4111-1111-1111-1111" }],
    });
    const result = redact(event) as ConsoleEvent;
    expect((result.args as any)[0].creditCard).not.toBe("4111-1111-1111-1111");
  });
});

// ── disableDefaults ──

describe("createRedactor (disableDefaults)", () => {
  it("should not apply default rules when disableDefaults is true", () => {
    const redact = createRedactor({ disableDefaults: true });
    const event = makeConsoleEvent({
      message: "email foo@example.com and password=secret",
    });
    const result = redact(event) as ConsoleEvent;
    // no defaults → email stays
    expect(result.message).toContain("foo@example.com");
  });

  it("should still apply custom rules when disableDefaults is true", () => {
    const customRule: RedactRule = {
      name: "ip",
      valuePattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
      replacement: "[IP]",
    };
    const redact = createRedactor({ disableDefaults: true, rules: [customRule] });
    const event = makeConsoleEvent({
      message: "server 192.168.1.1 email foo@example.com",
    });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).not.toContain("192.168.1.1");
    expect(result.message).toContain("[IP]");
    // email NOT redacted since defaults disabled
    expect(result.message).toContain("foo@example.com");
  });
});

// ── edge cases ──

describe("createRedactor edge cases", () => {
  const redact = createRedactor();

  it("should handle event with no args", () => {
    const event = makeConsoleEvent({ message: "plain message" });
    const result = redact(event) as ConsoleEvent;
    expect(result.message).toBe("plain message");
  });

  it("should handle args with primitive values", () => {
    const event = makeConsoleEvent({ args: [1, "hello", true, null] });
    const result = redact(event) as ConsoleEvent;
    expect(result.args).toEqual([1, "hello", true, null]);
  });

  it("should handle deeply nested objects in args", () => {
    const event = makeConsoleEvent({
      args: [{ a: { b: { c: { password: "deep-secret" } } } }],
    });
    const result = redact(event) as ConsoleEvent;
    expect((result.args as any)[0].a.b.c.password).not.toBe("deep-secret");
  });

  it("should handle empty args array", () => {
    const event = makeConsoleEvent({ args: [] });
    const result = redact(event) as ConsoleEvent;
    expect(result.args).toEqual([]);
  });

  it("should handle NetworkEvent without sensitive data", () => {
    const event = makeNetworkEvent({ status: 200, duration: 50 });
    const result = redact(event) as NetworkEvent;
    expect(result.url).toBe(event.url);
    expect(result.status).toBe(200);
  });

  it("should return no-config redactor without error", () => {
    const redact2 = createRedactor();
    expect(typeof redact2).toBe("function");
  });
});

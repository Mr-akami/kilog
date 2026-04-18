import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NetworkEvent, LogEvent } from "@logit/core";
import type { RuntimeContext } from "./context.js";
import { captureFetch } from "./capture-fetch.js";

function createMockContext(): { ctx: RuntimeContext; events: LogEvent[] } {
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

describe("captureFetch", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should wrap globalThis.fetch", () => {
    const { ctx } = createMockContext();
    captureFetch(ctx);
    expect(globalThis.fetch).not.toBe(mockFetch);
  });

  it("should delegate to original fetch", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/api");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("should return original response", async () => {
    const mockResponse = new Response("body", { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);
    const { ctx } = createMockContext();
    captureFetch(ctx);

    const response = await globalThis.fetch("https://example.com/api");
    expect(response).toBe(mockResponse);
  });

  it("should create NetworkEvent on successful fetch", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/api/users");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(event.type).toBe("network");
    expect(event.level).toBe("info");
    expect(event.method).toBe("GET");
    expect(event.url).toBe("https://example.com/api/users");
    expect(event.normalizedPath).toBe("/api/users");
    expect(event.status).toBe(200);
    expect(event.duration).toEqual(expect.any(Number));
    expect(event.failed).toBe(false);
    expect(event.runtime).toBe("node");
    expect(event.session).toBe("test-session");
  });

  it("should capture POST method from init", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 201 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/api/users", {
      method: "POST",
    });
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(event.method).toBe("POST");
    expect(event.status).toBe(201);
  });

  it("should create NetworkEvent with failed=true on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("connection refused"));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await expect(
      globalThis.fetch("https://example.com/api"),
    ).rejects.toThrow("connection refused");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(event.type).toBe("network");
    expect(event.failed).toBe(true);
    expect(event.errorMessage).toBe("connection refused");
    expect(event.status).toBeUndefined();
  });

  it("should extract normalizedPath from URL pathname", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/api/users?page=1&limit=10");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect((events[0] as NetworkEvent).normalizedPath).toBe("/api/users");
  });

  it("should include id and timestamp", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect(events[0].id).toMatch(/^[0-9a-f]{8}-/);
    expect(events[0].timestamp).toBeTruthy();
  });

  it("should measure duration as non-negative number", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    await globalThis.fetch("https://example.com/");
    await vi.waitFor(() => expect(events).toHaveLength(1));

    expect((events[0] as NetworkEvent).duration).toBeGreaterThanOrEqual(0);
  });
});

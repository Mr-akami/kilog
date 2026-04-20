import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import type { NetworkEvent } from "@logit/core";
import { captureFetch } from "./capture-fetch.js";
import { createMockContext } from "./testing.js";

describe("captureFetch", () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
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

    await expect(globalThis.fetch("https://example.com/api")).rejects.toThrow("connection refused");
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

  it("should handle Request object input", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    const request = new Request("https://example.com/api/data", {
      method: "PUT",
    });
    await globalThis.fetch(request);
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(event.method).toBe("PUT");
    expect(event.url).toBe("https://example.com/api/data");
    expect(event.normalizedPath).toBe("/api/data");
  });

  it("should delegate Request object to original fetch", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx } = createMockContext();
    captureFetch(ctx);

    const request = new Request("https://example.com/api", {
      method: "DELETE",
    });
    await globalThis.fetch(request);


    expect(mockFetch).toHaveBeenCalledOnce();
    const passedArgs = mockFetch.mock.calls[0];
    expect(passedArgs[0]).toBe(request);
  });

  it("captures a stack trace that points at the fetch caller", async () => {
    mockFetch.mockResolvedValue(new Response("ok", { status: 200 }));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    async function myFetchCaller() {
      await globalThis.fetch("https://example.com/api");
    }
    await myFetchCaller();
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(typeof event.stack).toBe("string");
    expect(event.stack).toContain("myFetchCaller");
  });

  it("captures a stack trace on failed fetches too", async () => {
    mockFetch.mockRejectedValue(new Error("nope"));
    const { ctx, events } = createMockContext();
    captureFetch(ctx);

    async function myFailingCaller() {
      await globalThis.fetch("https://example.com/api").catch(() => {});
    }
    await myFailingCaller();
    await vi.waitFor(() => expect(events).toHaveLength(1));

    const event = events[0] as NetworkEvent;
    expect(event.failed).toBe(true);
    expect(event.stack).toContain("myFailingCaller");
  });
});

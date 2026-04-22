import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { app } from "./index.js";

// ── helpers ──

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(): void {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ origin: "127.0.0.1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function restoreFetch(): void {
  globalThis.fetch = ORIGINAL_FETCH;
}

// ── GET / ──

describe("GET /", () => {
  it("should return 200 with greeting message", async () => {
    const res = await app.request("/");

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Hello from kilog example");
  });
});

// ── GET /warn ──

describe("GET /warn", () => {
  it("should return 200", async () => {
    const res = await app.request("/warn");

    expect(res.status).toBe(200);
  });
});

// ── GET /error ──

describe("GET /error", () => {
  it("should return 200", async () => {
    const res = await app.request("/error");

    expect(res.status).toBe(200);
  });
});

// ── GET /fetch ──

describe("GET /fetch", () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    restoreFetch();
  });

  it("should return 200 with fetch result", async () => {
    const res = await app.request("/fetch");

    expect(res.status).toBe(200);
  });

  it("should call external fetch", async () => {
    await app.request("/fetch");

    expect(globalThis.fetch).toHaveBeenCalled();
  });
});

// ── GET /throw ──

describe("GET /throw", () => {
  it("should return 500 for intentional error", async () => {
    const res = await app.request("/throw");

    expect(res.status).toBe(500);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { installKilogInstrumentation } from "./install.js";

type Globals = typeof globalThis & {
  __KILOG_RECEIVER_URL__?: string;
  __KILOG_INSTRUMENTED__?: boolean;
  __kilogOriginalFetch?: typeof fetch;
};

interface Snapshot {
  console: Record<string, (...args: unknown[]) => void>;
  fetch: typeof fetch;
}

function snapshot(): Snapshot {
  return {
    console: {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    },
    fetch: globalThis.fetch,
  };
}

function restore(s: Snapshot): void {
  console.log = s.console.log;
  console.info = s.console.info;
  console.warn = s.console.warn;
  console.error = s.console.error;
  console.debug = s.console.debug;
  globalThis.fetch = s.fetch;
  const g = globalThis as Globals;
  delete g.__KILOG_INSTRUMENTED__;
  delete g.__KILOG_RECEIVER_URL__;
  delete g.__kilogOriginalFetch;
}

function postedEvents(fetchMock: ReturnType<typeof vi.fn>): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  for (const call of fetchMock.mock.calls) {
    const [url, init] = call as [unknown, RequestInit | undefined];
    if (typeof url === "string" && url.includes("__kilog") && typeof init?.body === "string") {
      const parsed = JSON.parse(init.body) as Array<Record<string, unknown>>;
      events.push(...parsed);
    }
  }
  return events;
}

describe("installKilogInstrumentation", () => {
  let s: Snapshot;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    s = snapshot();
    fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    restore(s);
  });

  it("wraps console.log and posts a workerd console event", async () => {
    (globalThis as Globals).__KILOG_RECEIVER_URL__ = "http://127.0.0.1:9999/__kilog";
    installKilogInstrumentation();
    console.log("hello workerd");
    await new Promise((r) => setTimeout(r, 0));

    const events = postedEvents(fetchMock);
    const e = events.find(
      (ev) => typeof ev.message === "string" && ev.message.includes("hello workerd"),
    );
    expect(e).toBeDefined();
    expect(e!.runtime).toBe("workerd");
    expect(e!.type).toBe("console");
    expect(e!.level).toBe("info");
  });

  it("captures wrapped fetch as a network event", async () => {
    (globalThis as Globals).__KILOG_RECEIVER_URL__ = "http://127.0.0.1:9999/__kilog";
    installKilogInstrumentation();
    await fetch("https://example.com/api/users");
    await new Promise((r) => setTimeout(r, 0));

    const events = postedEvents(fetchMock);
    const net = events.find((e) => e.type === "network");
    expect(net).toBeDefined();
    expect(net!.url).toBe("https://example.com/api/users");
    expect(net!.normalizedPath).toBe("/api/users");
    expect(net!.failed).toBe(false);
  });

  it("bypasses sender fetches (URLs containing __kilog)", async () => {
    (globalThis as Globals).__KILOG_RECEIVER_URL__ = "http://127.0.0.1:9999/__kilog";
    installKilogInstrumentation();
    fetchMock.mockClear();
    await fetch("http://127.0.0.1:9999/__kilog");
    await new Promise((r) => setTimeout(r, 0));
    // The single fetch call is the bypass; nothing should have been recorded
    // as a network event.
    expect(postedEvents(fetchMock).length).toBe(0);
  });

  it("no-ops when receiver URL is not set", async () => {
    installKilogInstrumentation();
    fetchMock.mockClear();
    console.log("orphan");
    await new Promise((r) => setTimeout(r, 0));
    const sends = fetchMock.mock.calls.filter((c) => {
      const url = c[0];
      return typeof url === "string" && url.includes("__kilog");
    });
    expect(sends.length).toBe(0);
  });

  it("is idempotent", () => {
    installKilogInstrumentation();
    const wrappedFetch = globalThis.fetch;
    installKilogInstrumentation();
    expect(globalThis.fetch).toBe(wrappedFetch);
  });
});

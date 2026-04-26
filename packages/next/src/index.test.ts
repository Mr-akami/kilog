import { describe, it, expect } from "vite-plus/test";
import { withKilog } from "./with-kilog.js";
import { createKilogAppRoute } from "./app-route.js";
import { createKilogPagesHandler } from "./pages-api.js";
import { KilogScript } from "./script.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

// ── withKilog ──────────────────────────────────────────────────────────────

describe("withKilog()", () => {
  it("preserves existing config properties", async () => {
    const result = withKilog({ reactStrictMode: true });
    expect(result.reactStrictMode).toBe(true);
  });

  it("adds a rewrites function", async () => {
    const result = withKilog({});
    expect(typeof result.rewrites).toBe("function");
  });

  it("rewrites includes /__kilog → /api/__kilog", async () => {
    const result = withKilog({});
    const rewrites = await result.rewrites();
    expect(JSON.stringify(rewrites)).toContain("/__kilog");
    expect(JSON.stringify(rewrites)).toContain("/api/__kilog");
  });

  it("merges with existing flat rewrite array", async () => {
    const existing = [{ source: "/old", destination: "/new" }];
    const result = withKilog({ rewrites: existing });
    const rewrites = await result.rewrites();
    expect((rewrites as unknown[]).length).toBe(2);
  });

  it("merges with existing async rewrite function", async () => {
    const result = withKilog({
      rewrites: async () => [{ source: "/old", destination: "/new" }],
    });
    const rewrites = await result.rewrites();
    expect((rewrites as unknown[]).length).toBe(2);
  });

  it("merges with existing object-form rewrites (afterFiles)", async () => {
    const result = withKilog({
      rewrites: { beforeFiles: [], afterFiles: [{ source: "/a", destination: "/b" }] },
    });
    const rewrites = await result.rewrites();
    expect((rewrites as { afterFiles: unknown[] }).afterFiles.length).toBe(2);
  });
});

// ── KilogScript ───────────────────────────────────────────────────────────

describe("KilogScript", () => {
  it("is a function (React component)", () => {
    expect(typeof KilogScript).toBe("function");
  });

  it("renders a script element with the browser runtime", () => {
    const element = KilogScript();
    expect(element).not.toBeNull();
    // The returned JSX element's props should contain the inline script
    const props = (element as unknown as { props: { dangerouslySetInnerHTML: { __html: string } } })
      .props;
    expect(props.dangerouslySetInnerHTML.__html).toContain("/__kilog");
    expect(props.dangerouslySetInnerHTML.__html).toContain("wrapConsole");
  });
});

// ── createKilogAppRoute ───────────────────────────────────────────────────

describe("createKilogAppRoute()", () => {
  let baseDir: string;

  async function setup() {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-next-app-"));
  }
  async function teardown() {
    await rm(baseDir, { recursive: true, force: true });
  }

  it("returns a function", () => {
    expect(typeof createKilogAppRoute()).toBe("function");
  });

  it("returns 200 for valid events", async () => {
    await setup();
    try {
      const POST = createKilogAppRoute({ baseDir });
      const events = [
        {
          id: crypto.randomUUID(),
          timestamp: "2026-04-18T10:00:00.000Z",
          runtime: "browser",
          session: "s1",
          type: "console",
          level: "info",
          message: "hello",
        },
      ];
      const req = new Request("http://localhost/__kilog", {
        method: "POST",
        body: JSON.stringify(events),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    } finally {
      await teardown();
    }
  });

  it("returns 400 for invalid JSON", async () => {
    await setup();
    try {
      const POST = createKilogAppRoute({ baseDir });
      const req = new Request("http://localhost/__kilog", {
        method: "POST",
        body: "not-json{{{",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    } finally {
      await teardown();
    }
  });
});

// ── createKilogPagesHandler ───────────────────────────────────────────────

function createReq(method: string, body: string): IncomingMessage {
  const stream = Readable.from([body]);
  return Object.assign(stream, {
    method,
    headers: { "content-type": "application/json" },
  }) as unknown as IncomingMessage;
}

function createRes(): { res: ServerResponse; endPromise: Promise<void> } {
  let resolveEnd!: () => void;
  const endPromise = new Promise<void>((r) => {
    resolveEnd = r;
  });
  const res = {
    statusCode: 200,
    setHeader: () => undefined,
    end: () => resolveEnd(),
  } as unknown as ServerResponse;
  return { res, endPromise };
}

describe("createKilogPagesHandler()", () => {
  let baseDir: string;

  async function setup() {
    baseDir = await mkdtemp(path.join(tmpdir(), "kilog-next-pages-"));
  }
  async function teardown() {
    await rm(baseDir, { recursive: true, force: true });
  }

  it("returns a function", () => {
    expect(typeof createKilogPagesHandler()).toBe("function");
  });

  it("returns 200 for valid POST", async () => {
    await setup();
    try {
      const handler = createKilogPagesHandler({ baseDir });
      const events = [
        {
          id: crypto.randomUUID(),
          timestamp: "2026-04-18T10:00:00.000Z",
          runtime: "browser",
          session: "s2",
          type: "console",
          level: "warn",
          message: "pages test",
        },
      ];
      const req = createReq("POST", JSON.stringify(events));
      const { res, endPromise } = createRes();
      void handler(req, res);
      await endPromise;
      expect(res.statusCode).toBe(200);
    } finally {
      await teardown();
    }
  });

  it("returns 405 for non-POST requests", async () => {
    await setup();
    try {
      const handler = createKilogPagesHandler({ baseDir });
      const req = createReq("GET", "");
      const { res, endPromise } = createRes();
      void handler(req, res);
      await endPromise;
      expect(res.statusCode).toBe(405);
    } finally {
      await teardown();
    }
  });

  it("returns 400 for invalid JSON", async () => {
    await setup();
    try {
      const handler = createKilogPagesHandler({ baseDir });
      const req = createReq("POST", "not-json{{{");
      const { res, endPromise } = createRes();
      void handler(req, res);
      await endPromise;
      expect(res.statusCode).toBe(400);
    } finally {
      await teardown();
    }
  });
});

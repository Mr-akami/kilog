import { describe, it, expect } from "vite-plus/test";
import { createServer } from "node:http";
import { findFreePort } from "./index.js";

function occupyPort(port: number): Promise<{ close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, () => {
      resolve({
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

describe("findFreePort", () => {
  it("returns the preferred port when it is free", async () => {
    // Pick a high port unlikely to be in use.
    const preferred = 44101;
    const port = await findFreePort(preferred, 1);
    expect(port).toBe(preferred);
  });

  it("skips busy ports and returns the next free one", async () => {
    const busy = 44103;
    const blocker = await occupyPort(busy);
    try {
      const port = await findFreePort(busy, 5);
      expect(port).toBeGreaterThan(busy);
      expect(port).toBeLessThanOrEqual(busy + 4);
    } finally {
      await blocker.close();
    }
  });

  it("throws when every port in the window is busy", async () => {
    const base = 44110;
    const blockers = await Promise.all([
      occupyPort(base),
      occupyPort(base + 1),
      occupyPort(base + 2),
    ]);
    try {
      await expect(findFreePort(base, 3)).rejects.toThrow(/no free port/);
    } finally {
      await Promise.all(blockers.map((b) => b.close()));
    }
  });
});

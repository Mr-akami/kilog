import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  nodeLoaded: vi.fn(),
  bunLoaded: vi.fn(),
  denoLoaded: vi.fn(),
}));

describe("register", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.nodeLoaded.mockClear();
    mocks.bunLoaded.mockClear();
    mocks.denoLoaded.mockClear();

    vi.doMock("@logit/runtime-node/register", () => {
      mocks.nodeLoaded();
      return {};
    });
    vi.doMock("@logit/runtime-bun/register", () => {
      mocks.bunLoaded();
      return {};
    });
    vi.doMock("@logit/runtime-deno/register", () => {
      mocks.denoLoaded();
      return {};
    });
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Bun;
    delete (globalThis as Record<string, unknown>).Deno;
  });

  it("imports @logit/runtime-node/register when no runtime globals exist", async () => {
    await import("./register.js");

    expect(mocks.nodeLoaded).toHaveBeenCalledOnce();
    expect(mocks.bunLoaded).not.toHaveBeenCalled();
    expect(mocks.denoLoaded).not.toHaveBeenCalled();
  });

  it("imports @logit/runtime-bun/register when globalThis.Bun exists", async () => {
    (globalThis as Record<string, unknown>).Bun = {};

    await import("./register.js");

    expect(mocks.bunLoaded).toHaveBeenCalledOnce();
    expect(mocks.nodeLoaded).not.toHaveBeenCalled();
    expect(mocks.denoLoaded).not.toHaveBeenCalled();
  });

  it("imports @logit/runtime-deno/register when globalThis.Deno exists", async () => {
    (globalThis as Record<string, unknown>).Deno = {};

    await import("./register.js");

    expect(mocks.denoLoaded).toHaveBeenCalledOnce();
    expect(mocks.nodeLoaded).not.toHaveBeenCalled();
    expect(mocks.bunLoaded).not.toHaveBeenCalled();
  });

  it("prioritizes Deno over Bun when both globals exist", async () => {
    (globalThis as Record<string, unknown>).Deno = {};
    (globalThis as Record<string, unknown>).Bun = {};

    await import("./register.js");

    expect(mocks.denoLoaded).toHaveBeenCalledOnce();
    expect(mocks.bunLoaded).not.toHaveBeenCalled();
  });
});

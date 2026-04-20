import { describe, it, expect, afterEach } from "vitest";
import { detectRuntime } from "./index.js";

describe("detectRuntime", () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Bun;
    delete (globalThis as Record<string, unknown>).Deno;
  });

  it("returns 'node' when no runtime globals exist", () => {
    expect(detectRuntime()).toBe("node");
  });

  it("returns 'deno' when globalThis.Deno exists", () => {
    (globalThis as Record<string, unknown>).Deno = {};
    expect(detectRuntime()).toBe("deno");
  });

  it("returns 'bun' when globalThis.Bun exists", () => {
    (globalThis as Record<string, unknown>).Bun = {};
    expect(detectRuntime()).toBe("bun");
  });

  it("prioritizes Deno over Bun when both globals exist", () => {
    (globalThis as Record<string, unknown>).Deno = {};
    (globalThis as Record<string, unknown>).Bun = {};
    expect(detectRuntime()).toBe("deno");
  });
});

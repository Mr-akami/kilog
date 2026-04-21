import { describe, it, expect } from "vite-plus/test";
import { parseDurationMs, durationAgoIso } from "./time.js";

const NOW = new Date("2026-04-21T12:00:00.000Z");

describe("parseDurationMs", () => {
  it("parses seconds", () => {
    expect(parseDurationMs("30s")).toBe(30_000);
  });
  it("parses minutes", () => {
    expect(parseDurationMs("10m")).toBe(600_000);
  });
  it("parses hours", () => {
    expect(parseDurationMs("2h")).toBe(7_200_000);
  });
  it("parses days", () => {
    expect(parseDurationMs("1d")).toBe(86_400_000);
  });
  it("parses weeks", () => {
    expect(parseDurationMs("1w")).toBe(604_800_000);
  });
  it("trims whitespace", () => {
    expect(parseDurationMs("  10m  ")).toBe(600_000);
  });
  it("rejects missing unit", () => {
    expect(() => parseDurationMs("10")).toThrow(/invalid duration/);
  });
  it("rejects unknown unit", () => {
    expect(() => parseDurationMs("10x")).toThrow(/invalid duration/);
  });
  it("rejects compound durations", () => {
    expect(() => parseDurationMs("1h30m")).toThrow(/invalid duration/);
  });
  it("rejects ISO strings", () => {
    expect(() => parseDurationMs("2026-04-21T12:00:00Z")).toThrow(/invalid duration/);
  });
  it("rejects empty", () => {
    expect(() => parseDurationMs("")).toThrow(/invalid duration/);
  });
});

describe("durationAgoIso", () => {
  it("resolves 10m to 10 minutes before now", () => {
    expect(durationAgoIso("10m", NOW)).toBe("2026-04-21T11:50:00.000Z");
  });
  it("resolves 1d to 24h before now", () => {
    expect(durationAgoIso("1d", NOW)).toBe("2026-04-20T12:00:00.000Z");
  });
  it("propagates parse errors", () => {
    expect(() => durationAgoIso("garbage", NOW)).toThrow(/invalid duration/);
  });
});

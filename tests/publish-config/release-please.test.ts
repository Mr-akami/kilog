import { describe, it, expect } from "vite-plus/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROOT,
  readJson,
  PUBLIC_PACKAGE_PATHS,
  PACKAGE_NAMES,
} from "./test-helpers.js";

describe(".release-please-config.json", () => {
  it("should exist", () => {
    expect(existsSync(resolve(ROOT, ".release-please-config.json"))).toBe(true);
  });

  it("should have release-type node", () => {
    const config = readJson(".release-please-config.json");
    expect(config["release-type"]).toBe("node");
  });

  it("should define all 6 public packages", () => {
    const config = readJson(".release-please-config.json");
    const packages = config.packages as Record<string, unknown>;

    for (const path of PUBLIC_PACKAGE_PATHS) {
      expect(packages[path]).toBeDefined();
    }
  });

  it("should set correct component name for each package", () => {
    const config = readJson(".release-please-config.json");
    const packages = config.packages as Record<
      string,
      Record<string, unknown>
    >;

    for (const path of PUBLIC_PACKAGE_PATHS) {
      expect(packages[path].component).toBe(PACKAGE_NAMES[path]);
    }
  });

  it("should have linked-versions plugin for core and runtime-node", () => {
    const config = readJson(".release-please-config.json");
    const plugins = config.plugins as Array<Record<string, unknown>>;

    const linkedVersions = plugins.find(
      (p) => p.type === "linked-versions",
    );
    expect(linkedVersions).toBeDefined();
    expect(linkedVersions!.groupName).toBe("logit-core");

    const components = linkedVersions!.components as string[];
    expect(components).toContain("@logit/core");
    expect(components).toContain("@logit/runtime-node");
    expect(components).toHaveLength(2);
  });

  it("should not include private packages", () => {
    const config = readJson(".release-please-config.json");
    const packages = config.packages as Record<string, unknown>;

    expect(packages["tests/e2e"]).toBeUndefined();
    expect(packages["examples/node-server"]).toBeUndefined();
    expect(packages["examples/vite-client"]).toBeUndefined();
  });
});

describe(".release-please-manifest.json", () => {
  it("should exist", () => {
    expect(
      existsSync(resolve(ROOT, ".release-please-manifest.json")),
    ).toBe(true);
  });

  it("should have version 0.1.0 for all public packages", () => {
    const manifest = readJson(".release-please-manifest.json");

    for (const path of PUBLIC_PACKAGE_PATHS) {
      expect(manifest[path]).toBe("0.1.0");
    }
  });

  it("should only contain public packages", () => {
    const manifest = readJson(".release-please-manifest.json");
    const keys = Object.keys(manifest);

    expect(keys).toHaveLength(PUBLIC_PACKAGE_PATHS.length);
    for (const path of PUBLIC_PACKAGE_PATHS) {
      expect(keys).toContain(path);
    }
  });
});

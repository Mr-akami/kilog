import { describe, it, expect } from "vite-plus/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, readJson, PUBLIC_PACKAGE_PATHS, PACKAGE_NAMES } from "./test-helpers.js";

const REPO_URL = "https://github.com/Mr-akami/kilog.git";

describe("public package metadata", () => {
  for (const pkg of PUBLIC_PACKAGE_PATHS) {
    const name = PACKAGE_NAMES[pkg];

    describe(name, () => {
      const json = () => readJson(`${pkg}/package.json`);

      it("should have version 0.1.0", () => {
        expect(json().version).toBe("0.1.0");
      });

      it("should have publishConfig with access public and provenance true", () => {
        const publishConfig = json().publishConfig as Record<string, unknown>;
        expect(publishConfig).toEqual({
          access: "public",
          provenance: true,
        });
      });

      it("should have files field containing dist", () => {
        const files = json().files as string[];
        expect(files).toContain("dist");
      });

      it("should have repository with type, url, and directory", () => {
        const repo = json().repository as Record<string, string>;
        expect(repo.type).toBe("git");
        expect(repo.url).toBe(REPO_URL);
        expect(repo.directory).toBe(pkg);
      });

      it("should have license MIT", () => {
        expect(json().license).toBe("MIT");
      });

      it("should have homepage pointing to package directory", () => {
        const homepage = json().homepage as string;
        expect(homepage).toBe(`https://github.com/Mr-akami/kilog/tree/main/${pkg}#readme`);
      });

      it("should have description as non-empty string", () => {
        const description = json().description;
        expect(typeof description).toBe("string");
        expect((description as string).length).toBeGreaterThan(0);
      });

      it("should have keywords as non-empty array", () => {
        const keywords = json().keywords;
        expect(Array.isArray(keywords)).toBe(true);
        expect((keywords as string[]).length).toBeGreaterThan(0);
      });
    });
  }
});

describe("root package.json", () => {
  it("should have license MIT", () => {
    const root = readJson("package.json");
    expect(root.license).toBe("MIT");
  });
});

describe("LICENSE file", () => {
  it("should exist at repository root", () => {
    expect(existsSync(resolve(ROOT, "LICENSE"))).toBe(true);
  });

  it("should contain MIT license text", () => {
    const content = readFileSync(resolve(ROOT, "LICENSE"), "utf-8");
    expect(content).toContain("MIT License");
  });

  it("should contain copyright holder name", () => {
    const content = readFileSync(resolve(ROOT, "LICENSE"), "utf-8");
    expect(content).toContain("Mr-akami");
  });
});

describe("private packages", () => {
  it("tests/e2e should have private true", () => {
    const e2e = readJson("tests/e2e/package.json");
    expect(e2e.private).toBe(true);
  });

  it("examples/node-server should have private true", () => {
    const pkg = readJson("examples/node-server/package.json");
    expect(pkg.private).toBe(true);
  });

  it("examples/vite-client should have private true", () => {
    const pkg = readJson("examples/vite-client/package.json");
    expect(pkg.private).toBe(true);
  });
});

describe("workspace dependencies are preserved", () => {
  it("should not modify workspace:* references in dependencies", () => {
    const cli = readJson("packages/cli/package.json");
    const deps = cli.dependencies as Record<string, string>;
    expect(deps["@kilog/core"]).toBe("workspace:*");
    expect(deps["@kilog/web-ui"]).toBe("workspace:*");
  });
});

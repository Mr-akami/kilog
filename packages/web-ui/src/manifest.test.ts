import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveAssetJs } from "./manifest.js";

describe("resolveAssetJs", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "kilog-manifest-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("falls back to /main.js when no manifest exists", async () => {
    expect(await resolveAssetJs(dir)).toBe("/main.js");
  });

  it("returns the hashed asset path for the isEntry chunk", async () => {
    const manifestDir = path.join(dir, ".vite");
    await mkdir(manifestDir, { recursive: true });
    const manifest = {
      "index.html": { file: "index.html", imports: ["_client/main.ts"] },
      "client/main.ts": { file: "assets/index-abc123.js", isEntry: true },
    };
    await writeFile(path.join(manifestDir, "manifest.json"), JSON.stringify(manifest));

    expect(await resolveAssetJs(dir)).toBe("/assets/index-abc123.js");
  });

  it("falls back when manifest contains no isEntry chunk", async () => {
    const manifestDir = path.join(dir, ".vite");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({
        "foo.css": { file: "assets/foo-abc.css" },
      }),
    );
    expect(await resolveAssetJs(dir)).toBe("/main.js");
  });

  it("falls back when manifest JSON is malformed", async () => {
    const manifestDir = path.join(dir, ".vite");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(path.join(manifestDir, "manifest.json"), "not json {");
    expect(await resolveAssetJs(dir)).toBe("/main.js");
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describeSources } from "./sources.js";

describe("describeSources", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-sources-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns empty when no .kilog/ is found", async () => {
    expect(await describeSources(root)).toEqual([]);
  });

  it("returns absolute path, display path, project, size, and ISO mtime", async () => {
    const raw = path.join(root, "apps", "api", ".kilog", "raw");
    await mkdir(raw, { recursive: true });
    const jsonl = path.join(raw, "2026-04-20.node.jsonl");
    await writeFile(jsonl, '{"id":"a"}\n{"id":"b"}\n');

    const [desc] = await describeSources(root);

    expect(desc.path).toBe(jsonl);
    expect(desc.displayPath).toBe(
      path.join("apps", "api", ".kilog", "raw", "2026-04-20.node.jsonl"),
    );
    expect(desc.project).toBe(path.join("apps", "api"));
    expect(desc.size).toBeGreaterThan(0);
    expect(() => new Date(desc.mtime).toISOString()).not.toThrow();
    expect(desc.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns one descriptor per JSONL across multiple projects", async () => {
    await mkdir(path.join(root, "apps", "a", ".kilog", "raw"), { recursive: true });
    await mkdir(path.join(root, "apps", "b", ".kilog", "raw"), { recursive: true });
    await writeFile(path.join(root, "apps", "a", ".kilog", "raw", "x.jsonl"), "");
    await writeFile(path.join(root, "apps", "a", ".kilog", "raw", "y.jsonl"), "");
    await writeFile(path.join(root, "apps", "b", ".kilog", "raw", "z.jsonl"), "");

    const descs = await describeSources(root);

    expect(descs).toHaveLength(3);
    const projects = descs.map((d) => d.project).sort();
    expect(projects).toEqual([
      path.join("apps", "a"),
      path.join("apps", "a"),
      path.join("apps", "b"),
    ]);
  });
});

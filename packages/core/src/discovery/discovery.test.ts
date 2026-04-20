import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  findDevlogsDirs,
  discoverSources,
  discoverSourceFiles,
  listRawFilesIn,
} from "./discovery.js";

async function mkDevlogs(dir: string, jsonlContent?: string): Promise<void> {
  const raw = path.join(dir, ".devlogs", "raw");
  await mkdir(raw, { recursive: true });
  if (jsonlContent != null) {
    await writeFile(path.join(raw, "2026-04-20.node.jsonl"), jsonlContent);
  }
}

describe("findDevlogsDirs", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "logit-discover-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns empty when no .devlogs exists", async () => {
    const dirs = await findDevlogsDirs(root);
    expect(dirs).toEqual([]);
  });

  it("finds a .devlogs at the root itself", async () => {
    await mkDevlogs(root);
    const dirs = await findDevlogsDirs(root);
    expect(dirs).toEqual([path.join(root, ".devlogs")]);
  });

  it("finds nested .devlogs under children", async () => {
    await mkDevlogs(path.join(root, "apps", "a"));
    await mkDevlogs(path.join(root, "apps", "b"));
    const dirs = await findDevlogsDirs(root);
    expect(dirs).toEqual([
      path.join(root, "apps", "a", ".devlogs"),
      path.join(root, "apps", "b", ".devlogs"),
    ]);
  });

  it("does not descend into a .devlogs subtree", async () => {
    await mkDevlogs(root);
    // nothing else should be found even if more dirs exist under .devlogs
    await mkdir(path.join(root, ".devlogs", "raw", "junk"), { recursive: true });
    const dirs = await findDevlogsDirs(root);
    expect(dirs).toEqual([path.join(root, ".devlogs")]);
  });

  it("excludes node_modules / .git / dist by default", async () => {
    await mkDevlogs(path.join(root, "node_modules", "pkg"));
    await mkDevlogs(path.join(root, ".git", "hooks"));
    await mkDevlogs(path.join(root, "dist"));
    await mkDevlogs(path.join(root, "apps", "a"));
    const dirs = await findDevlogsDirs(root);
    expect(dirs).toEqual([path.join(root, "apps", "a", ".devlogs")]);
  });
});

describe("discoverSources", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "logit-discover-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("assigns project = basename(target) for root-level .devlogs in single-target mode", async () => {
    await mkDevlogs(root);
    const sources = await discoverSources([root]);
    expect(sources).toHaveLength(1);
    expect(sources[0].project).toBe(path.basename(root));
  });

  it("assigns project = rel path for nested .devlogs in single-target mode", async () => {
    await mkDevlogs(path.join(root, "apps", "a"));
    const sources = await discoverSources([root]);
    expect(sources).toHaveLength(1);
    expect(sources[0].project).toBe(path.join("apps", "a"));
  });

  it("prefixes project with target basename in multi-target mode", async () => {
    const t1 = await mkdtemp(path.join(tmpdir(), "logit-target1-"));
    const t2 = await mkdtemp(path.join(tmpdir(), "logit-target2-"));
    try {
      await mkDevlogs(path.join(t1, "apps", "api"));
      await mkDevlogs(t2);
      const sources = await discoverSources([t1, t2]);
      expect(sources).toHaveLength(2);
      const byProject = Object.fromEntries(sources.map((s) => [s.project, s]));
      expect(byProject[path.join(path.basename(t1), "apps", "api")]).toBeDefined();
      expect(byProject[path.basename(t2)]).toBeDefined();
    } finally {
      await rm(t1, { recursive: true, force: true });
      await rm(t2, { recursive: true, force: true });
    }
  });
});

describe("listRawFilesIn", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "logit-rawfiles-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns absolute paths of jsonl files under raw/", async () => {
    await mkDevlogs(root, "{}\n");
    const files = await listRawFilesIn(path.join(root, ".devlogs"));
    expect(files).toEqual([
      path.join(root, ".devlogs", "raw", "2026-04-20.node.jsonl"),
    ]);
  });

  it("returns [] when raw/ does not exist", async () => {
    const files = await listRawFilesIn(path.join(root, "missing", ".devlogs"));
    expect(files).toEqual([]);
  });
});

describe("discoverSourceFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "logit-srcfiles-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("yields one SourceFile per jsonl with correct project label", async () => {
    await mkDevlogs(path.join(root, "apps", "a"), "{}\n");
    await mkDevlogs(path.join(root, "apps", "b"), "{}\n");
    const files = await discoverSourceFiles([root]);
    expect(files).toHaveLength(2);
    const projects = files.map((f) => f.project).sort();
    expect(projects).toEqual([path.join("apps", "a"), path.join("apps", "b")]);
  });
});

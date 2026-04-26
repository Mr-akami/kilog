import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureGitignore } from "./gitignore.js";

describe("ensureGitignore", () => {
  let root: string;
  let gitignore: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "kilog-gi-"));
    gitignore = path.join(root, ".gitignore");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates .gitignore with kilog entries when missing", () => {
    ensureGitignore(root);
    expect(existsSync(gitignore)).toBe(true);
    const contents = readFileSync(gitignore, "utf8");
    expect(contents).toContain("instrumentation.ts");
    expect(contents).toContain("instrumentation-client.ts");
    expect(contents).toContain("# kilog (auto-generated)");
  });

  it("appends kilog block to existing .gitignore", () => {
    writeFileSync(gitignore, "node_modules\n.next\n");
    ensureGitignore(root);
    const contents = readFileSync(gitignore, "utf8");
    expect(contents.startsWith("node_modules\n.next\n")).toBe(true);
    expect(contents).toContain("# kilog (auto-generated)");
  });

  it("is idempotent — does not duplicate the kilog block", () => {
    ensureGitignore(root);
    const first = readFileSync(gitignore, "utf8");
    ensureGitignore(root);
    expect(readFileSync(gitignore, "utf8")).toBe(first);
  });
});

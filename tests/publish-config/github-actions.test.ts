import { describe, it, expect } from "vite-plus/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./test-helpers.js";

function readWorkflowText(filename: string): string {
  return readFileSync(resolve(ROOT, `.github/workflows/${filename}`), "utf-8");
}

describe(".github/workflows/ci.yml", () => {
  it("should exist", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/ci.yml"))).toBe(true);
  });

  it("should trigger on pull_request", () => {
    const content = readWorkflowText("ci.yml");
    expect(content).toContain("pull_request");
  });

  it("should run pnpm install with frozen-lockfile", () => {
    const content = readWorkflowText("ci.yml");
    expect(content).toContain("pnpm install");
    expect(content).toContain("--frozen-lockfile");
  });

  it("should run build step", () => {
    const content = readWorkflowText("ci.yml");
    expect(content).toContain("pnpm build");
  });

  it("should run test step", () => {
    const content = readWorkflowText("ci.yml");
    expect(content).toContain("pnpm test");
  });

  it("should run lint step", () => {
    const content = readWorkflowText("ci.yml");
    expect(content).toContain("pnpm lint");
  });
});

describe(".github/workflows/release.yml", () => {
  it("should exist", () => {
    expect(existsSync(resolve(ROOT, ".github/workflows/release.yml"))).toBe(true);
  });

  it("should trigger on push to main", () => {
    const content = readWorkflowText("release.yml");
    expect(content).toMatch(/on:[\s\S]*push:[\s\S]*branches:[\s\S]*main/);
  });

  it("should trigger on workflow_dispatch", () => {
    const content = readWorkflowText("release.yml");
    expect(content).toContain("workflow_dispatch");
  });

  describe("release-please job", () => {
    it("should have a release-please job", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain("release-please:");
    });

    it("should run release-please job only on push", () => {
      const content = readWorkflowText("release.yml");
      const rpJobSection = extractJobSection(content, "release-please");
      expect(rpJobSection).toContain("push");
    });

    it("should use release-please-action v4", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toMatch(/googleapis\/release-please-action@v4/);
    });

    it("should reference .release-please-config.json", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain(".release-please-config.json");
    });

    it("should reference .release-please-manifest.json", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain(".release-please-manifest.json");
    });
  });

  describe("publish job", () => {
    it("should have a publish job", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toMatch(/^\s{2}publish:/m);
    });

    it("should run publish job only on workflow_dispatch", () => {
      const content = readWorkflowText("release.yml");
      const publishSection = extractJobSection(content, "publish");
      expect(publishSection).toContain("workflow_dispatch");
    });

    it("should have id-token write permission for provenance", () => {
      const content = readWorkflowText("release.yml");
      const publishSection = extractJobSection(content, "publish");
      expect(publishSection).toContain("id-token: write");
    });

    it("should have required tag input for workflow_dispatch", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toMatch(/inputs:[\s\S]*tag:[\s\S]*required:\s*true/);
    });

    it("should checkout using the tag input ref", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain("inputs.tag");
    });

    it("should run pnpm -r publish with correct flags", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain("pnpm -r publish");
      expect(content).toContain("--access public");
      expect(content).toContain("--no-git-checks");
    });

    it("should set NODE_AUTH_TOKEN from NPM_TOKEN secret", () => {
      const content = readWorkflowText("release.yml");
      expect(content).toContain("NODE_AUTH_TOKEN");
      expect(content).toContain("NPM_TOKEN");
    });

    it("should setup node with registry-url for npm publish", () => {
      const content = readWorkflowText("release.yml");
      const publishSection = extractJobSection(content, "publish");
      expect(publishSection).toContain("registry-url");
    });
  });
});

function extractJobSection(yaml: string, jobName: string): string {
  const jobPattern = new RegExp(`^  ${jobName}:\\n((?:    .+\\n|\\n)*)`, "m");
  const match = yaml.match(jobPattern);
  if (match) return match[0];

  // Fallback: find the job key and take everything until next job
  const lines = yaml.split("\n");
  const startIdx = lines.findIndex((l) => l.match(new RegExp(`^\\s{2}${jobName}:`)));
  if (startIdx === -1) return "";

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].match(/^\s{2}\w+:/) && !lines[i].match(/^\s{4}/)) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

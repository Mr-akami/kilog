import { readdir } from "node:fs/promises";
import path from "node:path";
import { LOGIT_DIR_NAME } from "../storage/paths.js";

const DEFAULT_EXCLUDES = new Set(["node_modules", ".git", "dist"]);

export interface DiscoveredSource {
  /** Absolute path to the `.logit/` directory. */
  logitDir: string;
  /** Absolute path to the target under which this `.logit/` was found. */
  target: string;
  /** Human-readable label for this source (e.g. "examples/node-server"). */
  project: string;
}

export interface DiscoverOptions {
  excludes?: Set<string>;
}

async function walk(dir: string, acc: string[], excludes: Set<string>): Promise<void> {
  let entries: { name: string; isDirectory(): boolean }[];
  try {
    entries = (await readdir(dir, { withFileTypes: true })) as {
      name: string;
      isDirectory(): boolean;
    }[];
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (excludes.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.name === LOGIT_DIR_NAME) {
      acc.push(full);
      continue;
    }
    await walk(full, acc, excludes);
  }
}

export async function findLogitDirs(
  target: string,
  options: DiscoverOptions = {},
): Promise<string[]> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  const results: string[] = [];
  await walk(target, results, excludes);
  return results.sort();
}

function projectLabel(logitDir: string, target: string, multiTarget: boolean): string {
  const parent = path.dirname(logitDir);
  const rel = path.relative(target, parent);
  const targetName = path.basename(path.resolve(target));
  if (multiTarget) {
    return rel === "" ? targetName : path.join(targetName, rel);
  }
  return rel === "" ? targetName : rel;
}

export async function discoverSources(
  targets: string[],
  options: DiscoverOptions = {},
): Promise<DiscoveredSource[]> {
  const abs = targets.map((t) => path.resolve(t));
  const multi = abs.length > 1;
  const out: DiscoveredSource[] = [];
  for (const target of abs) {
    const dirs = await findLogitDirs(target, options);
    for (const logitDir of dirs) {
      out.push({
        logitDir,
        target,
        project: projectLabel(logitDir, target, multi),
      });
    }
  }
  return out;
}

export async function listRawFilesIn(logitDir: string): Promise<string[]> {
  const rawDir = path.resolve(logitDir, "raw");
  try {
    const files = await readdir(rawDir);
    return files
      .filter((f: string) => f.endsWith(".jsonl"))
      .map((f: string) => path.join(rawDir, f))
      .sort();
  } catch {
    return [];
  }
}

export interface SourceFile {
  absPath: string;
  project: string;
}

export async function discoverSourceFiles(
  targets: string[],
  options: DiscoverOptions = {},
): Promise<SourceFile[]> {
  const sources = await discoverSources(targets, options);
  const out: SourceFile[] = [];
  for (const s of sources) {
    const files = await listRawFilesIn(s.logitDir);
    for (const f of files) {
      out.push({ absPath: f, project: s.project });
    }
  }
  return out;
}

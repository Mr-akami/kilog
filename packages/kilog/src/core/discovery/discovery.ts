import { readdir } from "node:fs/promises";
import path from "node:path";
import { KILOG_DIR_NAME } from "../storage/paths.js";

const DEFAULT_EXCLUDES = new Set(["node_modules", ".git", "dist"]);

export interface DiscoveredSource {
  /** Absolute path to the `.kilog/` directory. */
  kilogDir: string;
  /** Absolute path to the target under which this `.kilog/` was found. */
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
    if (entry.name === KILOG_DIR_NAME) {
      acc.push(full);
      continue;
    }
    await walk(full, acc, excludes);
  }
}

export async function findKilogDirs(
  target: string,
  options: DiscoverOptions = {},
): Promise<string[]> {
  const excludes = options.excludes ?? DEFAULT_EXCLUDES;
  const results: string[] = [];
  await walk(target, results, excludes);
  return results.sort();
}

function projectLabel(kilogDir: string, target: string, multiTarget: boolean): string {
  const parent = path.dirname(kilogDir);
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
    const dirs = await findKilogDirs(target, options);
    for (const kilogDir of dirs) {
      out.push({
        kilogDir,
        target,
        project: projectLabel(kilogDir, target, multi),
      });
    }
  }
  return out;
}

export async function listRawFilesIn(kilogDir: string): Promise<string[]> {
  const rawDir = path.resolve(kilogDir, "raw");
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
    const files = await listRawFilesIn(s.kilogDir);
    for (const f of files) {
      out.push({ absPath: f, project: s.project });
    }
  }
  return out;
}

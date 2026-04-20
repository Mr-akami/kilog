import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

function keyToFileName(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 32);
  return `${hash}.json`;
}

export async function getCachedResolution(cacheDir: string, key: string): Promise<string | null> {
  const filePath = path.join(cacheDir, keyToFileName(key));
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed: { resolved: string } = JSON.parse(content);
    return parsed.resolved;
  } catch {
    return null;
  }
}

export async function setCachedResolution(
  cacheDir: string,
  key: string,
  resolved: string,
): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  const filePath = path.join(cacheDir, keyToFileName(key));
  await writeFile(filePath, JSON.stringify({ resolved }));
}

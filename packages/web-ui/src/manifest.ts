import { readFile } from "node:fs/promises";
import path from "node:path";

interface ManifestEntry {
  file: string;
  isEntry?: boolean;
}

/**
 * Read the Vite manifest emitted under `<publicDir>/.vite/manifest.json` and
 * return the URL path to the bundled entry JS (e.g. "/assets/index-abc.js").
 *
 * Falls back to "/main.js" if the manifest is missing (dev mode / first boot
 * before `vite build`).
 */
export async function resolveAssetJs(publicDir: string): Promise<string> {
  const manifestPath = path.join(publicDir, ".vite", "manifest.json");
  try {
    const content = await readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(content) as Record<string, ManifestEntry>;
    for (const entry of Object.values(manifest)) {
      if (entry.isEntry) return "/" + entry.file;
    }
  } catch {
    // fall through
  }
  return "/main.js";
}

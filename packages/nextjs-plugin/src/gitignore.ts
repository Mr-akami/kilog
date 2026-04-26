import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MARKER = "# kilog (auto-generated)";
const ENTRIES = ["instrumentation.ts", "instrumentation-client.ts"];

/**
 * Idempotently appends kilog-managed paths to `.gitignore` so the
 * auto-generated instrumentation files don't enter the user's history.
 *
 * No-op if the marker is already present — re-running `next dev` doesn't
 * duplicate the block.
 */
export function ensureGitignore(projectRoot: string): void {
  const path = join(projectRoot, ".gitignore");
  const block = `${MARKER}\n${ENTRIES.join("\n")}\n`;

  if (!existsSync(path)) {
    writeFileSync(path, block);
    return;
  }

  const existing = readFileSync(path, "utf8");
  if (existing.includes(MARKER)) return;

  const sep = existing.endsWith("\n") ? "\n" : "\n\n";
  writeFileSync(path, existing + sep + block);
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { clearOnce } from "@kilog/core";
import { startDevReceiver } from "@kilog/core/dev-receiver";
import type { LogLevel } from "@kilog/core";

interface ParsedFlags {
  persist: boolean;
  terminal: boolean | LogLevel;
  wranglerArgs: string[];
}

function parseFlags(argv: string[]): ParsedFlags {
  // Only consume flags that precede the wrangler subcommand; anything after
  // the first positional is forwarded verbatim. `--kilog-*` flags are ours.
  const ours = new Set([
    "--kilog-persist",
    "--kilog-terminal",
  ]);
  let persist = process.env.KILOG_PERSIST === "1";
  let terminal: boolean | LogLevel = false;
  const out: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--kilog-persist") {
      persist = true;
      continue;
    }
    if (arg === "--kilog-terminal") {
      const next = argv[i + 1];
      if (next == null || next.startsWith("-")) {
        terminal = true;
      } else if (next === "true" || next === "false") {
        terminal = next === "true";
        i++;
      } else if (next === "debug" || next === "info" || next === "warn" || next === "error") {
        terminal = next;
        i++;
      } else {
        terminal = true;
      }
      continue;
    }
    if (arg.startsWith("--kilog-terminal=")) {
      const value = arg.slice("--kilog-terminal=".length);
      if (value === "true" || value === "false") terminal = value === "true";
      else if (value === "debug" || value === "info" || value === "warn" || value === "error") {
        terminal = value;
      } else terminal = true;
      continue;
    }
    if (ours.has(arg)) continue;
    out.push(arg);
  }

  return { persist, terminal, wranglerArgs: out };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { persist, terminal, wranglerArgs } = parseFlags(argv);
  const baseDir = process.env.KILOG_DIR ?? process.cwd();

  if (!persist) {
    await clearOnce(baseDir);
  }

  const port = await startDevReceiver({ baseDir, terminal });
  const receiverUrl = `http://127.0.0.1:${port}/__kilog`;

  // Default to `wrangler dev` if the user didn't pass a subcommand. Anything
  // they did pass — including their own `dev`, flags, entry path — is
  // forwarded verbatim after our injected flags.
  const hasSubcommand =
    wranglerArgs.length > 0 && !wranglerArgs[0].startsWith("-");
  const finalArgs = hasSubcommand ? wranglerArgs : ["dev", ...wranglerArgs];

  const wranglerFlags = [
    "--var",
    `KILOG_RECEIVER_URL:${receiverUrl}`,
    "--define",
    `__KILOG_RECEIVER_URL__:${JSON.stringify(receiverUrl)}`,
  ];

  // Insert our flags AFTER the subcommand so wrangler parses them in the
  // subcommand's context (top-level flags aren't recognized otherwise).
  const [subcommand, ...rest] = finalArgs;
  const child = spawn("wrangler", [subcommand, ...wranglerFlags, ...rest], {
    stdio: "inherit",
    env: { ...process.env, KILOG_RECEIVER_URL: receiverUrl },
  });

  child.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      console.error(
        "[kilog-wrangler] could not spawn `wrangler` — install it as a devDependency or globally.",
      );
    } else {
      console.error("[kilog-wrangler] spawn error:", err);
    }
    process.exit(1);
  });

  const forward = (sig: NodeJS.Signals) => {
    if (!child.killed) child.kill(sig);
  };
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[kilog-wrangler] fatal:", err);
  process.exit(1);
});

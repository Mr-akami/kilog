export const RUNTIMES = ["node", "browser", "bun", "deno"] as const;
export const EVENT_TYPES = ["console", "error", "network", "unhandled-rejection"] as const;
export const LEVELS = ["debug", "info", "warn", "error"] as const;

export interface PresetDef {
  id: string;
  label: string;
}

export const PRESETS: readonly { group: string; items: readonly PresetDef[] }[] = [
  {
    group: "time",
    items: [
      { id: "5min", label: "Last 5 min" },
      { id: "1h", label: "Last 1 h" },
      { id: "24h", label: "Last 24 h" },
    ],
  },
  {
    group: "events",
    items: [
      { id: "errors", label: "Errors only" },
      { id: "warns", label: "Warnings+" },
      { id: "net-fail", label: "Network failures" },
      { id: "slow", label: "Slow (> 1 s)" },
    ],
  },
  {
    group: "reset",
    items: [{ id: "reset", label: "Reset" }],
  },
];

const DURATION = /^(\d+)(s|m|h|d|w)$/;

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parse a relative-duration string like `10m`, `2h`, `3d`, `1w` into
 * milliseconds. Throws on anything not matching `<N><s|m|h|d|w>`.
 */
export function parseDurationMs(input: string): number {
  const match = DURATION.exec(input.trim());
  if (!match) {
    throw new Error(
      `invalid duration: "${input}" (expected <N>(s|m|h|d|w), e.g. 30s, 10m, 2h, 3d, 1w)`,
    );
  }
  return Number(match[1]) * UNIT_MS[match[2]];
}

/** Resolve a duration like `10m` to "now minus that" as an ISO timestamp. */
export function durationAgoIso(input: string, now: Date = new Date()): string {
  return new Date(now.getTime() - parseDurationMs(input)).toISOString();
}

/** Resolve either a relative duration or an absolute timestamp to ISO. */
export function resolveTimeInput(input: string, now: Date = new Date()): string {
  const trimmed = input.trim();
  if (DURATION.test(trimmed)) return durationAgoIso(trimmed, now);

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `invalid time: "${input}" (expected ISO datetime or <N>(s|m|h|d|w), e.g. 2026-04-20T10:00:00Z or 10m)`,
    );
  }
  return parsed.toISOString();
}

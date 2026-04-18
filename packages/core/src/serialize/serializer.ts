import type { LogEvent, EventType } from "../schema/types.js";

const VALID_TYPES: Set<EventType> = new Set([
  "console",
  "error",
  "network",
  "unhandled-rejection",
]);

export function serialize(event: LogEvent): string {
  return JSON.stringify(event);
}

export function deserialize(line: string): LogEvent {
  if (line == null) throw new Error("Input must be a string");
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj.id || !obj.timestamp || !obj.runtime || !obj.session || !obj.type) {
    throw new Error("Missing required fields");
  }
  if (!VALID_TYPES.has(obj.type as EventType)) {
    throw new Error(`Invalid event type: ${obj.type as string}`);
  }
  return parsed as LogEvent;
}

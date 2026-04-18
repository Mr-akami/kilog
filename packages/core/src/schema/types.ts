export type Runtime = "browser" | "node" | "bun" | "deno";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type EventType = "console" | "error" | "network" | "unhandled-rejection";

export interface BaseEvent {
  id: string;
  timestamp: string;
  runtime: Runtime;
  session: string;
  type: EventType;
  message?: string;
}

export interface ConsoleEvent extends BaseEvent {
  type: "console";
  level: LogLevel;
  message: string;
  args?: unknown[];
  stack?: string;
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  level: "error";
  message: string;
  name: string;
  stack?: string;
}

export interface UnhandledRejectionEvent extends BaseEvent {
  type: "unhandled-rejection";
  level: "error";
  message: string;
  name?: string;
  stack?: string;
}

export interface NetworkEvent extends BaseEvent {
  type: "network";
  level: "info";
  method: string;
  url: string;
  normalizedPath: string;
  status?: number;
  duration?: number;
  size?: number;
  failed: boolean;
  errorMessage?: string;
}

export type LogEvent = ConsoleEvent | ErrorEvent | UnhandledRejectionEvent | NetworkEvent;

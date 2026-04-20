import type { LogEvent } from "@logit/core";

export function formatLogLine(event: LogEvent): string {
  const parts = [event.timestamp, event.runtime];

  switch (event.type) {
    case "console":
      parts.push(event.level, event.message);
      break;
    case "error":
      parts.push("error", `${event.name}: ${event.message}`);
      if (event.stack) parts.push(`\n${event.stack}`);
      break;
    case "unhandled-rejection":
      parts.push("unhandled-rejection", event.message);
      if (event.stack) parts.push(`\n${event.stack}`);
      break;
    case "network": {
      const status = event.status != null ? String(event.status) : "";
      parts.push(event.method, event.url);
      if (status) parts.push(status);
      if (event.failed && event.errorMessage) parts.push(event.errorMessage);
      break;
    }
  }

  return parts.join(" ");
}

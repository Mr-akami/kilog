import type { LogEvent } from "@logit/core";

function indent(stack: string): string {
  return stack
    .split("\n")
    .map((l) => "    " + l.trim())
    .join("\n");
}

function appendStack(parts: string[], stack: string | undefined): void {
  if (stack && stack.length > 0) parts.push(`\n${indent(stack)}`);
}

export function formatLogLine(event: LogEvent): string {
  const parts = [event.timestamp, event.runtime];

  switch (event.type) {
    case "console":
      parts.push(event.level, event.message);
      appendStack(parts, event.stack);
      break;
    case "error":
      parts.push("error", `${event.name}: ${event.message}`);
      appendStack(parts, event.stack);
      break;
    case "unhandled-rejection":
      parts.push("unhandled-rejection", event.message);
      appendStack(parts, event.stack);
      break;
    case "network": {
      const status = event.status != null ? String(event.status) : "";
      parts.push(event.method, event.url);
      if (status) parts.push(status);
      if (event.failed && event.errorMessage) parts.push(event.errorMessage);
      appendStack(parts, event.stack);
      break;
    }
  }

  return parts.join(" ");
}

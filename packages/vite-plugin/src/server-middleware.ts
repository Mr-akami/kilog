import type { IncomingMessage, ServerResponse } from "node:http";
import { createWriter, createRedactor, formatLogLine } from "@logit/core";
import type { LogEvent, LogLevel } from "@logit/core";

type NextFunction = () => void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;

import { ENDPOINT } from "./constants.js";

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface LogitMiddlewareOptions {
  terminal?: boolean | LogLevel;
}

function shouldPrint(event: LogEvent, terminal: boolean | LogLevel | undefined): boolean {
  if (!terminal) return false;
  if (terminal === true) return true;
  const threshold = LEVEL_RANK[terminal];
  const eventLevel = "level" in event ? event.level : undefined;
  if (eventLevel == null) return false;
  return LEVEL_RANK[eventLevel] >= threshold;
}

function readBody(req: IncomingMessage): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(String(chunk)));
    req.on("end", () => resolve(chunks.join("")));
    req.on("error", reject);
  });
}

export function createLogitMiddleware(
  baseDir: string,
  options: LogitMiddlewareOptions = {},
): Middleware {
  const writer = createWriter({ baseDir, redactor: createRedactor() });
  const terminal = options.terminal;

  return (req, res, next) => {
    if (req.method !== "POST" || req.url !== ENDPOINT) {
      next();
      return;
    }

    readBody(req)
      .then(async (body) => {
        const events = JSON.parse(body) as LogEvent[];
        for (const event of events) {
          await writer.append(event);
          if (shouldPrint(event, terminal)) {
            process.stdout.write(formatLogLine(event, { color: true }) + "\n");
          }
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end('{"ok":true}');
      })
      .catch((err) => {
        console.error("[logit] middleware error:", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end('{"error":"invalid body"}');
      });
  };
}

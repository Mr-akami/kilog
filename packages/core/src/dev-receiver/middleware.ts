import type { IncomingMessage, ServerResponse } from "node:http";
import { ENDPOINT } from "../browser/endpoint.js";
import type { LogLevel } from "../schema/types.js";
import { processEvents } from "./event-handler.js";

type NextFunction = () => void;
export type KilogMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;

export interface KilogMiddlewareOptions {
  terminal?: boolean | LogLevel;
}

function readBody(req: IncomingMessage): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(String(chunk)));
    req.on("end", () => resolve(chunks.join("")));
    req.on("error", reject);
  });
}

/**
 * Connect-style middleware that consumes POST {ENDPOINT} payloads of
 * `LogEvent[]` and writes them to `.kilog/raw/*.jsonl`. Anything else falls
 * through to the next middleware.
 */
export function createKilogMiddleware(
  baseDir: string,
  options: KilogMiddlewareOptions = {},
): KilogMiddleware {
  return (req, res, next) => {
    if (req.method !== "POST" || req.url !== ENDPOINT) {
      next();
      return;
    }

    readBody(req)
      .then(async (body) => {
        await processEvents(body, { baseDir, terminal: options.terminal });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end('{"ok":true}');
      })
      .catch((err) => {
        console.error("[kilog] middleware error:", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end('{"error":"invalid body"}');
      });
  };
}

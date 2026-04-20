import type { IncomingMessage, ServerResponse } from "node:http";
import { createWriter, createRedactor } from "@logit/core";
import type { LogEvent } from "@logit/core";

type NextFunction = () => void;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void;

import { ENDPOINT } from "./constants.js";

function readBody(req: IncomingMessage): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(String(chunk)));
    req.on("end", () => resolve(chunks.join("")));
    req.on("error", reject);
  });
}

export function createLogitMiddleware(baseDir: string): Middleware {
  const writer = createWriter({ baseDir, redactor: createRedactor() });

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

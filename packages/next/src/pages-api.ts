import type { IncomingMessage, ServerResponse } from "node:http";
import { processEvents } from "./event-handler.js";
import type { KilogHandlerOptions } from "./event-handler.js";

function readBody(req: IncomingMessage): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => chunks.push(String(chunk)));
    req.on("end", () => resolve(chunks.join("")));
    req.on("error", reject);
  });
}

/**
 * Creates a Next.js Pages Router API handler that receives browser log events.
 *
 * Usage — `pages/api/__kilog.ts`:
 * ```ts
 * import { createKilogPagesHandler } from "@kilog/next";
 * export default createKilogPagesHandler();
 * ```
 */
export function createKilogPagesHandler(options: KilogHandlerOptions = {}) {
  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end('{"error":"method not allowed"}');
      return;
    }
    try {
      const body = await readBody(req);
      await processEvents(body, options);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end('{"ok":true}');
    } catch (err) {
      console.error("[kilog] handler error:", err);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end('{"error":"invalid body"}');
    }
  };
}

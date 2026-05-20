import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ENDPOINT } from "../browser/endpoint.js";
import type { LogLevel } from "../schema/types.js";
import { processEvents } from "./event-handler.js";

export interface DevReceiverOptions {
  baseDir: string;
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

function notFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.end();
}

/**
 * Starts a localhost HTTP receiver for kilog log events. Returns the assigned
 * port once it is listening. Bound to 127.0.0.1; never exposed to the network.
 */
export function startDevReceiver(options: DevReceiverOptions): Promise<number> {
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== ENDPOINT) {
      notFound(res);
      return;
    }
    readBody(req)
      .then(async (body) => {
        await processEvents(body, options);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end('{"ok":true}');
      })
      .catch((err) => {
        console.error("[kilog] dev-receiver error:", err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end('{"error":"invalid body"}');
      });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address == null || typeof address === "string") {
        reject(new Error("[kilog] dev-receiver failed to bind"));
        return;
      }
      resolve(address.port);
    });
  });
}

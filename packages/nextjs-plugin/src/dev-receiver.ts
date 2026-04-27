import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ENDPOINT } from "@kilog/core/browser";
import type { LogLevel } from "@kilog/core";
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
 * Starts a localhost HTTP receiver for browser-emitted log events. Returns
 * the assigned port once it is listening — the caller wires up a Next.js
 * rewrite so `/__kilog` POSTs reach this server.
 *
 * Bound to 127.0.0.1 and never exposed to the network. Server lifetime tracks
 * the parent Next dev process; OS reclaims the socket on exit.
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
        // Logging via console.error keeps the failure visible without crashing
        // the dev server.
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

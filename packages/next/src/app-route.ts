import { processEvents } from "./event-handler.js";
import type { KilogHandlerOptions } from "./event-handler.js";

/**
 * Creates a Next.js App Router route handler that receives browser log events.
 *
 * Usage — `app/api/__kilog/route.ts`:
 * ```ts
 * import { createKilogAppRoute } from "@kilog/next";
 * export const POST = createKilogAppRoute();
 * ```
 */
export function createKilogAppRoute(options: KilogHandlerOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const body = await request.text();
      await processEvents(body, options);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[kilog] route error:", err);
      return new Response(JSON.stringify({ error: "invalid body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

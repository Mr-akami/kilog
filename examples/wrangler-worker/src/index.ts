import "@kilog/wrangler-plugin/instrument";
import { withKilog } from "@kilog/wrangler-plugin/with-kilog";

interface Env {
  KILOG_RECEIVER_URL?: string;
}

export default withKilog<ExportedHandler<Env>>({
  async fetch(request, _env, _ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      console.log("incoming request: GET /");
      return new Response("Hello from plain wrangler dev");
    }
    if (url.pathname === "/warn") {
      console.warn("this is a warning");
      return new Response("warned");
    }
    if (url.pathname === "/error") {
      console.error("this is an error log");
      return new Response("error logged");
    }
    if (url.pathname === "/fetch") {
      const res = await fetch("https://httpbin.org/ip");
      const data = (await res.json()) as { origin: string };
      console.log("fetched origin:", data.origin);
      return Response.json(data);
    }
    if (url.pathname === "/throw") {
      throw new Error("intentional error");
    }
    return new Response("not found", { status: 404 });
  },
});

// Stub for the Cloudflare worker types pulled via `wrangler`.
declare global {
  interface ExportedHandler<Env> {
    fetch?: (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response>;
  }
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

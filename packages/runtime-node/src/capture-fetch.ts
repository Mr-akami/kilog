import type { NetworkEvent } from "@logit/core";
import { createBaseFields } from "./context.js";
import type { RuntimeContext } from "./context.js";

function extractRequestInfo(
  input: RequestInfo | URL,
  init?: RequestInit,
): { method: string; url: string; normalizedPath: string } {
  if (input instanceof Request) {
    const parsed = new URL(input.url);
    return {
      method: input.method,
      url: input.url,
      normalizedPath: parsed.pathname,
    };
  }
  const urlStr = String(input);
  const parsed = new URL(urlStr);
  return {
    method: init?.method ?? "GET",
    url: urlStr,
    normalizedPath: parsed.pathname,
  };
}

export function captureFetch(ctx: RuntimeContext): void {
  const original = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { method, url, normalizedPath } = extractRequestInfo(input, init);
    const start = performance.now();

    try {
      const response = await original(input, init);
      const duration = performance.now() - start;
      const event: NetworkEvent = {
        ...createBaseFields(ctx),
        type: "network",
        level: "info",
        method,
        url,
        normalizedPath,
        status: response.status,
        duration,
        failed: false,
      };
      void ctx.writer.append(event);
      return response;
    } catch (err) {
      const duration = performance.now() - start;
      const event: NetworkEvent = {
        ...createBaseFields(ctx),
        type: "network",
        level: "info",
        method,
        url,
        normalizedPath,
        duration,
        failed: true,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
      void ctx.writer.append(event);
      throw err;
    }
  };
}

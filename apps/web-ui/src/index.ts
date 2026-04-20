import { serve } from "@hono/node-server";
import { dbFilePath } from "@logit/core";
import { createApp } from "./server.js";

export { createApp } from "./server.js";

export interface ServerOptions {
  port: number;
  baseDir: string;
}

export async function startServer(options: ServerOptions): Promise<void> {
  const dbPath = dbFilePath(options.baseDir);
  const app = createApp({ baseDir: options.baseDir, dbPath });

  serve({ fetch: app.fetch, port: options.port }, (info) => {
    console.log(`logit UI running on http://localhost:${info.port}`);
  });
}

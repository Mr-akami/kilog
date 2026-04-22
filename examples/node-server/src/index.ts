import { serve } from "@hono/node-server";
import { Hono } from "hono";

const PORT = 3000;

export const app = new Hono();

app.get("/", (c) => {
  console.log("incoming request: GET /");
  return c.text("Hello from kilog example");
});

app.get("/warn", (c) => {
  console.warn("this is a warning");
  return c.text("warned");
});

app.get("/error", (c) => {
  console.error("this is an error log");
  return c.text("error logged");
});

app.get("/fetch", async (c) => {
  const res = await fetch("https://httpbin.org/ip");
  const data = (await res.json()) as { origin: string };
  console.log("fetched origin:", data.origin);
  return c.json(data);
});

app.get("/throw", () => {
  throw new Error("intentional error");
});

const isDirectRun = process.argv[1]?.endsWith("index.ts");
if (isDirectRun) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`kilog example server running on http://localhost:${info.port}`);
  });
}

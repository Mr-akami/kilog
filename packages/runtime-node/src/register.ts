import { clearOnce } from "@kilog/core";
import { createRuntimeContext } from "./context.js";
import { captureConsole } from "./capture-console.js";
import { captureErrors } from "./capture-errors.js";
import { captureFetch } from "./capture-fetch.js";

if (process.env.KILOG_PERSIST !== "1") {
  const baseDir = process.env.KILOG_DIR ?? process.cwd();
  await clearOnce(baseDir);
}

const ctx = createRuntimeContext();

captureConsole(ctx);
captureErrors(ctx);
captureFetch(ctx);

process.on("exit", () => {
  void ctx.writer.close();
});

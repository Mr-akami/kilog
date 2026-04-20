import { createRuntimeContext } from "./context.js";
import { captureConsole } from "./capture-console.js";
import { captureErrors } from "./capture-errors.js";
import { captureFetch } from "./capture-fetch.js";

const ctx = createRuntimeContext();

captureConsole(ctx);
captureErrors(ctx);
captureFetch(ctx);

process.on("exit", () => {
  void ctx.writer.close();
});

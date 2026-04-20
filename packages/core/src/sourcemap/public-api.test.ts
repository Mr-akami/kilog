import { describe, it, expect } from "vite-plus/test";
import * as sourcemapExports from "./index.js";

describe("sourcemap public API boundary", () => {
  it("should only export resolveStackFrames", () => {
    const exportedNames = Object.keys(sourcemapExports);
    expect(exportedNames).toEqual(["resolveStackFrames"]);
  });
});

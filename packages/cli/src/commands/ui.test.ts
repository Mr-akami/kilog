import { describe, it, expect, vi } from "vitest";
import { handleUi } from "./ui.js";

vi.mock("@logit/web-ui", () => ({
  startServer: vi.fn().mockResolvedValue(undefined),
}));

describe("handleUi", () => {
  it("should call startServer with provided port and baseDir", async () => {
    const { startServer } = await import("@logit/web-ui");

    await handleUi({ baseDir: "/project", port: 4000 });

    expect(startServer).toHaveBeenCalledWith({
      port: 4000,
      baseDir: "/project",
    });
  });

  it("should call startServer with default port 3000", async () => {
    const { startServer } = await import("@logit/web-ui");

    await handleUi({ baseDir: "/project", port: 3000 });

    expect(startServer).toHaveBeenCalledWith({
      port: 3000,
      baseDir: "/project",
    });
  });
});

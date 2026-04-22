import { describe, it, expect, vi } from "vite-plus/test";
import { handleUi } from "./ui.js";

vi.mock("@kilog/web-ui", () => ({
  startServer: vi.fn().mockResolvedValue(undefined),
}));

describe("handleUi", () => {
  it("should call startServer with provided port and root", async () => {
    const { startServer } = await import("@kilog/web-ui");

    await handleUi({ root: "/project", port: 4000 });

    expect(startServer).toHaveBeenCalledWith({
      port: 4000,
      root: "/project",
    });
  });

  it("should call startServer with default port 3000", async () => {
    const { startServer } = await import("@kilog/web-ui");

    await handleUi({ root: "/project", port: 3000 });

    expect(startServer).toHaveBeenCalledWith({
      port: 3000,
      root: "/project",
    });
  });
});

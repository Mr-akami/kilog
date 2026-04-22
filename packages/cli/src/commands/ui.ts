import { startServer } from "@kilog/web-ui";

export interface UiOptions {
  root: string;
  port: number;
}

export async function handleUi(options: UiOptions): Promise<void> {
  await startServer({ port: options.port, root: options.root });
}

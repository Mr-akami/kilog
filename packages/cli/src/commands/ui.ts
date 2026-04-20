import { startServer } from "@logit/web-ui";

export interface UiOptions {
  baseDir: string;
  port: number;
}

export async function handleUi(options: UiOptions): Promise<void> {
  await startServer({ port: options.port, baseDir: options.baseDir });
}

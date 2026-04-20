import { raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { SourceDescriptor } from "./sources.js";
import { STYLES } from "./styles.js";
import { Header } from "./components/Header.js";
import { Filters } from "./components/Filters.js";
import { Presets } from "./components/Presets.js";
import { SqlBar } from "./components/SqlBar.js";
import { LogTable } from "./components/LogTable.js";

export interface PageProps {
  assetJs: string;
  initialRoot: string;
  initialSources: SourceDescriptor[];
}

// Safely embed JSON in a <script> tag. Prevents </script> injection.
function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export async function renderPage(props: PageProps): Promise<string> {
  const ssrJson = safeJson({ root: props.initialRoot, sources: props.initialSources });
  const tree = (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>logit</title>
        <style>{raw(STYLES)}</style>
      </head>
      <body>
        <Header root={props.initialRoot} sourceCount={props.initialSources.length} />
        <Filters />
        <Presets />
        <SqlBar />
        <div id="status"></div>
        <LogTable />
        <script>{raw(`window.__LOGIT_SSR__ = ${ssrJson};`)}</script>
        <script type="module" src={props.assetJs}></script>
      </body>
    </html>
  );
  const body = await (tree as HtmlEscapedString | Promise<HtmlEscapedString>);
  return `<!DOCTYPE html>${body.toString()}`;
}

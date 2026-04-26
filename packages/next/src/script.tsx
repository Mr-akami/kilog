import { generateBrowserRuntime } from "@kilog/core/browser";

/**
 * A React Server Component that injects the kilog browser-capture script.
 *
 * Add it once to your root layout so it loads before any other JavaScript:
 *
 * ```tsx
 * // app/layout.tsx
 * import { KilogScript } from "@kilog/next";
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html>
 *       <head>
 *         <KilogScript />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * For the Pages Router, add it to `pages/_document.tsx`:
 * ```tsx
 * import Document, { Html, Head, Main, NextScript } from "next/document";
 * import { KilogScript } from "@kilog/next";
 *
 * export default class MyDocument extends Document {
 *   render() {
 *     return (
 *       <Html>
 *         <Head>
 *           <KilogScript />
 *         </Head>
 *         <body><Main /><NextScript /></body>
 *       </Html>
 *     );
 *   }
 * }
 * ```
 */
export function KilogScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: generateBrowserRuntime() }}
    />
  );
}

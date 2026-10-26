import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const worker = await build({
  entryPoints: ["src/client/expedition/benchmark-worker.ts"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  minify: true,
});
const result = await build({
  entryPoints: ["src/demos/expedition.tsx"],
  bundle: true,
  write: false,
  outfile: "expedition.js",
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  define: {
    __EXPEDITION_WORKER__: JSON.stringify(worker.outputFiles[0].text),
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [
    {
      name: "standalone-client-styles",
      setup(build) {
        build.onLoad({ filter: /[/\\]src[/\\]styles\.css$/ }, async (args) => ({
          loader: "css",
          contents: (await readFile(args.path, "utf8")).replace(
            /^@import[^;]*\/upstream\/[^;]*;\s*/gm,
            "",
          ),
          resolveDir: args.path.replace(/[/\\][^/\\]+$/, ""),
        }));
      },
    },
  ],
});
const js = result.outputFiles
  .find((file) => file.path.endsWith(".js"))
  .text.replace(/<\/script/gi, "<\\/script");
const css = result.outputFiles.find((file) => file.path.endsWith(".css")).text;
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>秘塔远征 · 战斗 Demo</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir("artifacts/demo/expedition", { recursive: true });
await writeFile("artifacts/demo/expedition/index.html", html);
console.log(`Standalone demo: ${Buffer.byteLength(html)} bytes`);

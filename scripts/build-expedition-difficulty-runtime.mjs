import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir(".tmp/expedition-difficulty", { recursive: true });
await build({
  stdin: {
    contents: `
      export { ExpeditionAdventure } from './src/domain/expedition/adventure';
      export { ExpeditionStrategy } from './src/domain/expedition/ai';
      export { allCards } from './src/domain/expedition/rules';
      export { chapters } from './src/domain/expedition/chapters';
      export { evaluateExpeditionRun, conditionalValueAtRisk } from './analysis/expedition-experience/model';
    `,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/expedition-difficulty/runtime.mjs",
  logLevel: "error",
});

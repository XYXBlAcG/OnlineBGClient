import { build } from 'esbuild';

await build({ entryPoints: ['src/server/main.ts', 'src/server/ai-worker.ts'], outdir: 'dist-server', outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', packages: 'external', target: 'node22' });

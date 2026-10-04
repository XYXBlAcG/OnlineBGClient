import { build } from 'esbuild';
import { mkdir, readFile, writeFile, cp, access, rm } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';

const manifest = JSON.parse(await readFile('src-tauri/hosting-runtime.json', 'utf8'));
const platform = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : process.platform;
const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch;
const runtime = manifest.targets[`${platform}-${arch}`];
if (!runtime) throw new Error('This target has no configured hosting runtime');
const binaryName = platform === 'windows' ? runtime.cloudflared.asset : 'cloudflared';
const cache = `.tmp/bin/${platform}-${arch}`;
const root = 'src-tauri/resources/hosting';
await mkdir(root, { recursive: true });
await build({ entryPoints: ['src/server/main.ts', 'src/server/ai-worker.ts'], outdir: root, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', format: 'esm', target: 'node24', define: { 'process.env.NODE_ENV': '"production"' }, banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' } });
await rm(`${root}/web`, { recursive: true, force: true });
await cp('dist', `${root}/web`, { recursive: true });
try { await access(`${cache}/${binaryName}`); } catch {
  await mkdir(cache, { recursive: true });
  const run = promisify(execFile);
  await run('gh', ['release', 'download', runtime.cloudflared.version, '--repo', 'cloudflare/cloudflared', '--pattern', runtime.cloudflared.asset, '--dir', cache, '--clobber']);
  if (platform !== 'windows') await run('tar', ['-xzf', `${cache}/${runtime.cloudflared.asset}`, '-C', cache]);
}
const cloudflared = await readFile(`${cache}/${binaryName}`);
if (createHash('sha256').update(cloudflared).digest('hex') !== runtime.cloudflared.sha256) throw new Error('Tunnel binary checksum mismatch');
await writeFile(`${root}/cloudflared.gz`, gzipSync(cloudflared, { level: 9 }));
await writeFile(`${root}/runtime.json`, JSON.stringify(runtime, null, 2));

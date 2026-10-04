import { TestService } from './service-harness.mjs';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'onlinebg-client-'));
const server = new TestService(directory);
try {
  const endpoint = await server.start();
  const smoke = spawn(process.execPath, ['scripts/smoke-client.mjs'], { env: { ...process.env, TEST_SERVICE: endpoint }, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { smoke.on('error', reject); smoke.on('exit', resolve); });
  if (code !== 0) throw new Error(`Client smoke failed: ${code}`);
} finally {
  await server.stop();
  await rm(directory, { recursive: true, force: true });
}

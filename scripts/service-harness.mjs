import { spawn } from 'node:child_process';

export class TestService {
  constructor(directory) { this.directory = directory; }
  async start() {
    this.process = spawn(process.execPath, ['dist-server/main.mjs'], { env: { ...process.env, PORT: '0', DATA_ROOT: this.directory }, stdio: ['ignore', 'pipe', 'inherit'] });
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Room service did not start')), 30000);
      this.process.on('error', error => { clearTimeout(timeout); reject(error); });
      this.process.on('exit', code => { clearTimeout(timeout); reject(new Error(`Room service exited: ${code}`)); });
      this.process.stdout.on('data', data => { output += data; const match = output.match(/ROOM_READY (\{[^\n]+\})/); if (match) { clearTimeout(timeout); resolve(JSON.parse(match[1]).port); } });
    });
    return `http://127.0.0.1:${port}`;
  }
  async stop() {
    if (!this.process || this.process.exitCode !== null) return;
    const stopped = new Promise(resolve => this.process.once('exit', resolve));
    this.process.kill(); await stopped;
  }
}

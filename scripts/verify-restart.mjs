import { TestService } from './service-harness.mjs';
import { WebSocket } from 'ws';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

class Player {
  messages = [];
  constructor(endpoint) {
    this.socket = new WebSocket(endpoint.replace('http:', 'ws:') + '/connect');
    this.socket.on('message', data => this.messages.push(JSON.parse(data.toString())));
  }
  async open() { await new Promise((resolve, reject) => { this.socket.once('open', resolve); this.socket.once('error', reject); }); }
  send(command) { this.socket.send(JSON.stringify(command)); }
  async wait(predicate) {
    for (let attempt = 0; attempt < 150; attempt++) { const response = this.messages.findLast(predicate); if (response) return response; await new Promise(resolve => setTimeout(resolve, 100)); }
    throw new Error('Server response timeout: ' + JSON.stringify(this.messages));
  }
  close() { this.socket.terminate(); }
}
const directory = await mkdtemp(join(tmpdir(), 'onlinebg-restart-'));
const server = new TestService(directory);
let first, second;
try {
  let endpoint = await server.start();
  first = new Player(endpoint); second = new Player(endpoint); await Promise.all([first.open(), second.open()]);
  first.send({ type: 'create', name: '甲', config: { kind: 'uno', humans: 2, ai: [], team: false, training: false } });
  const owner = await first.wait(response => response.type === 'session');
  second.send({ type: 'join', name: '乙', room: owner.room });
  const guest = await second.wait(response => response.type === 'session');
  second.send({ type: 'ready', token: guest.token, ready: true });
  await first.wait(response => response.type === 'snapshot' && response.snapshot.seats[1].ready);
  first.send({ type: 'start', token: owner.token });
  const initial = (await first.wait(response => response.type === 'snapshot' && response.snapshot.state)).snapshot;
  first.send({ type: 'action', token: owner.token, id: 'deal', version: initial.version, action: { type: 'uno-start' } });
  const dealt = (await first.wait(response => response.type === 'snapshot' && response.snapshot.version > initial.version)).snapshot;
  first.send({ type: 'chat', token: owner.token, id: 'chat', text: '重启后仍保留' });
  await second.wait(response => response.type === 'snapshot' && response.snapshot.chat.length);
  const png = await readFile('tests/fixtures/sticker.png');
  const upload = await fetch(`${endpoint}/stickers?room=${owner.room}&name=持久图片`, {method:'POST',headers:{Authorization:`Bearer ${owner.token}`},body:png});
  assert.equal(upload.status,201); const asset=await upload.json();
  first.send({type:'sticker',token:owner.token,id:'image',asset:asset.id,text:'持久图片'});
  await second.wait(response=>response.type==='snapshot'&&response.snapshot.chat.some(message=>message.asset===asset.id));
  const denied=await fetch(`${endpoint}/stickers`,{method:'OPTIONS',headers:{Origin:'https://unrelated.example'}}); assert.equal(denied.status,403);
  const allowed=await fetch(`${endpoint}/stickers`,{method:'OPTIONS',headers:{Origin:'tauri://localhost'}}); assert.equal(allowed.headers.get('access-control-allow-origin'),'tauri://localhost');
  first.close(); second.close(); await server.stop();
  endpoint = await server.start();
  const restoredImage=await fetch(`${endpoint}/stickers/${asset.id}`);assert.deepEqual(Buffer.from(await restoredImage.arrayBuffer()),png);
  first = new Player(endpoint); second = new Player(endpoint); await Promise.all([first.open(), second.open()]);
  first.send({ type: 'join', name: '甲', room: owner.room, token: owner.token });
  const paused = (await first.wait(response => response.type === 'snapshot')).snapshot;
  assert.equal(paused.paused, true); assert.deepEqual(paused.state, dealt.state); assert.equal(paused.chat[0].text, '重启后仍保留');
  second.send({ type: 'join', name: '乙', room: owner.room, token: guest.token });
  await first.wait(response => response.type === 'snapshot' && !response.snapshot.paused);
  first.send({ type: 'action', token: owner.token, id: 'deal', version: initial.version, action: { type: 'uno-start' } });
  await first.wait(response => response.type === 'ack' && response.id === 'deal');
  first.send({ type: 'close', token: owner.token }); await second.wait(response => response.type === 'closed');
  console.log('PASS: real service restart, durable round and chat, original identities, offline pause, replay reconstruction and action deduplication');
} finally { first?.close(); second?.close(); await server.stop(); await rm(directory, { recursive: true, force: true }); }

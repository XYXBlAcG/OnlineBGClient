import {SnapshotReplica} from '../src/domain/sync.ts';
import WebSocket from 'ws';
import assert from 'node:assert/strict';

const endpoint = process.env.TEST_SERVICE || 'http://127.0.0.1:8787';
const kind = process.env.TEST_GAME || 'uno';
assert.ok(['uno', 'sgs', 'fxq', 'tq'].includes(kind));
class Client {
  messages = [];
  replica = new SnapshotReplica();
  waiters = new Set();
  constructor() {
    const url = new URL('/connect', endpoint);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(url);
    this.socket.on('message', message => {
      let value = JSON.parse(message.toString());
      if(value.type === 'snapshot' || value.type === 'patch') {const snapshot=this.replica.apply(value);assert.ok(snapshot);value={type:'snapshot',snapshot};}
      this.messages.push(value);
      for (const waiter of this.waiters) waiter(value);
    });
  }
  async open() {
    await new Promise((resolve, reject) => { this.socket.once('open', resolve); this.socket.once('error', reject); });
  }
  send(command) { this.socket.send(JSON.stringify(command)); }
  async wait(predicate, after = 0) {
    const latest = this.messages.slice(after).findLast(predicate);
    if (latest) return latest;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiters.delete(waiter); reject(new Error('Timed out waiting for server response')); }, 15000);
      const waiter = value => {
        if (predicate(value)) { clearTimeout(timer); this.waiters.delete(waiter); resolve(value); }
      };
      this.waiters.add(waiter);
    });
  }
  close() { this.socket.close(); }
}

const first = new Client();
const second = new Client();
let resumed;
try {
  await Promise.all([first.open(), second.open()]);
  first.send({ type: 'create', name: '网络测试甲', config: { kind, humans: 2, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false } });
  const sessionA = await first.wait(message => message.type === 'session');
  second.send({ type: 'join', room: sessionA.room, name: '网络测试乙' });
  const sessionB = await second.wait(message => message.type === 'session');
  await first.wait(message => message.type === 'snapshot' && message.snapshot.seats[1].name === '网络测试乙');
  second.send({ type: 'ready', token: sessionB.token, ready: true });
  await first.wait(message => message.type === 'snapshot' && message.snapshot.seats[1].ready);
  first.send({ type: 'start', token: sessionA.token });
  const initial = (await first.wait(message => message.type === 'snapshot' && message.snapshot.state)).snapshot;
  const choice = kind === 'uno' || kind === 'fxq' ? { client: first, token: sessionA.token, snapshot: initial } : await Promise.race([
    first.wait(message => message.type === 'snapshot' && message.snapshot.version >= initial.version && message.snapshot.candidates.length).then(message => ({ client: first, token: sessionA.token, snapshot: message.snapshot })),
    second.wait(message => message.type === 'snapshot' && message.snapshot.version >= initial.version && message.snapshot.candidates.length).then(message => ({ client: second, token: sessionB.token, snapshot: message.snapshot })),
  ]);
  const action = kind === 'uno' ? { type: 'uno-start' } : choice.snapshot.candidates[0].action;
  const command = { type: 'action', token: choice.token, id: 'lead', version: choice.snapshot.version, action };
  choice.client.send(command);
  await first.wait(message => message.type === 'snapshot' && message.snapshot.version > choice.snapshot.version);
  const beforeDuplicate = choice.client.messages.length;
  choice.client.send(command);
  await choice.client.wait(message => message.type === 'ack' && message.id === 'lead', beforeDuplicate);
  first.send({ type: 'chat', token: sessionA.token, id: 'chat', text: '双客户端消息验证' });
  await second.wait(message => message.type === 'snapshot' && message.snapshot.chat.some(message => message.text === '双客户端消息验证'));
  second.close();
  await first.wait(message => message.type === 'snapshot' && !message.snapshot.seats[1].online);
  resumed = new Client();
  await resumed.open();
  resumed.send({ type: 'join', room: sessionA.room, name: '网络测试乙', token: sessionB.token });
  const restored = await resumed.wait(message => message.type === 'session');
  assert.equal(restored.token, sessionB.token);
  const snapshot = (await resumed.wait(message => message.type === 'snapshot')).snapshot;
  assert.equal(snapshot.actor, 1);
  assert.equal(snapshot.decisions.length, 0);
  if (kind === 'fxq') assert.equal(snapshot.state.view.planePositionList.length, 12);
  else if (kind === 'tq') assert.equal(snapshot.state.view.playerPieces.length, 3);
  else {
    const hands = kind === 'uno' ? snapshot.state.view.playerCards : snapshot.state.view.playerHandCard;
    assert.ok(hands[0].every(card => card < 0));
  }
  first.send({ type: 'end', token: sessionA.token });
  await first.wait(message => message.type === 'snapshot' && message.snapshot.finished);
  first.send({ type: 'close', token: sessionA.token });
  await first.wait(message => message.type === 'closed');
  console.log(JSON.stringify({ endpoint, kind, room: sessionA.room, result: 'PASS: two clients, game, chat, duplicate action, visible state, reconnection' }));
} finally {
  first.close();
  second.close();
  resumed?.close();
}

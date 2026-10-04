import { describe, it, expect } from 'vitest';
import { Room } from '../src/domain/room';
import { Gateway } from '../src/domain/gateway';

describe('human readiness and room persistence', () => {
  it('requires connected ready humans and releases a seat only outside a running round', () => {
    const room = new Room('table', { kind: 'uno', humans: 2, ai: [], team: false, training: false });
    const alice = room.claim('Alice');
    const bob = room.claim('Bob');
    expect(() => room.start(alice)).toThrow('准备');
    room.setReady(alice, true); room.setReady(bob, true); room.start(alice);
    expect(() => room.leave(bob)).toThrow('结束');
    room.disconnect(bob);
    expect(room.snapshot(alice).paused).toBe(true);
    expect(() => room.act(alice, 'blocked', room.version, { type: 'uno-start' })).toThrow('掉线');
    room.claim('Bob', bob);
    room.end(alice); room.leave(bob);
    expect(room.claim('Carol')).not.toBe(bob);
  });
  it('restores authoritative state and deduplication without leaking live hidden history', () => {
    const room = new Room('saved', { kind: 'uno', humans: 1, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false });
    const token = room.claim('Alice'); room.setReady(token, true); room.start(token);
    const version = room.version;
    room.act(token, 'first', version, { type: 'uno-start' });
    expect(room.snapshot(token).replay).toBeNull();
    const restored = Room.restore(room.export());
    expect(restored.snapshot(token).paused).toBe(true);
    restored.claim('Alice', token);
    restored.act(token, 'first', version, { type: 'uno-start' });
    expect(restored.version).toBe(room.version);
    expect(restored.state).toEqual(room.state);
    restored.end(token);
    expect(restored.snapshot(token).replay!.events).toHaveLength(1);
  });
  it('allows only the owner to close a room and keeps leave independent from disconnect', () => {
    const gateway = new Gateway();
    const created = gateway.handle({ type: 'create', name: 'Alice', config: { kind: 'uno', humans: 2, ai: [], team: false, training: false } });
    const bob = gateway.handle({ type: 'join', name: 'Bob', room: created.session.room });
    expect(() => gateway.handle({ type: 'close', token: bob.session.token }, bob.session)).toThrow('房主');
    gateway.handle({ type: 'close', token: created.session.token }, created.session);
    expect(gateway.rooms.size).toBe(0);
  });
});

it('changes only unoccupied waiting seats and derives config from the new seat types', () => {
  const room = new Room('seats', { kind: 'uno', humans: 1, ai: [{ difficulty: 'easy', name: '' }, { difficulty: 'easy', name: '' }], team: false, training: false });
  const owner = room.claim('Alice');
  room.configureSeat(owner, 1, { type: 'human' });
  expect(room.config.humans).toBe(2);
  expect(room.config.ai).toHaveLength(1);
  const guest = room.claim('Bob');
  expect(() => room.configureSeat(owner, 1, { type: 'ai', difficulty: 'hard', name: '云雀' })).toThrow('占用');
  expect(() => room.configureSeat(guest, 2, { type: 'human' })).toThrow('房主');
  room.setReady(guest, true); room.start(owner);
  expect(() => room.configureSeat(owner, 2, { type: 'human' })).toThrow('对局');
});

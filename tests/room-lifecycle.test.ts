import { describe, it, expect } from 'vitest';
import { Room } from '../src/domain/room';
import { Gateway } from '../src/domain/gateway';

describe('human readiness and room persistence', () => {
  it('requires connected ready humans and hands a leaving seat to normal AI', () => {
    const room = new Room('table', { kind: 'uno', humans: 2, ai: [], team: false, training: false });
    const alice = room.claim('Alice');
    const bob = room.claim('Bob');
    expect(() => room.start(alice)).toThrow('准备');
    room.setReady(alice, true); room.setReady(bob, true); room.start(alice);
    room.leave(bob);
    const snapshot = room.snapshot(alice);
    expect(snapshot.seats[1].difficulty).toBe('normal');
    expect(snapshot.seats[1].online).toBe(true);
    expect(snapshot.paused).toBe(false);
    room.end(alice);
  });

  it('releases a seat outside a running round', () => {
    const room = new Room('waiting', { kind: 'uno', humans: 2, ai: [], team: false, training: false });
    const alice = room.claim('Alice');
    const bob = room.claim('Bob');
    room.setReady(alice, true); room.setReady(bob, true);
    room.leave(bob);
    expect(room.claim('Carol')).not.toBe(bob);
  });

  it("syncs host AI tempo to every snapshot and keeps guests read-only", () => {
    const room = new Room("pace", {
      kind: "uno",
      humans: 2,
      ai: [{ difficulty: "easy", name: "" }],
      team: false,
      training: false,
    });
    const alice = room.claim("Alice");
    const bob = room.claim("Bob");
    const version = room.version;
    expect(room.snapshot(bob).config.aiDelayMs).toBe(1500);
    room.setTempo(alice, 3000);
    expect(room.version).toBe(version + 1);
    expect(room.snapshot(bob).config.aiDelayMs).toBe(3000);
    expect(() => room.setTempo(bob, 500)).toThrow("房主");
  });

  it("joins and leaves a spectator without taking a seat", () => {
    const room = new Room("watch", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    const alice = room.claim("Alice");
    room.claim("Bob");
    const watcher = room.watch("观战者");
    expect(room.identity(watcher)).toBeLessThan(-1);
    expect(room.snapshot(watcher).spectators).toHaveLength(1);
    expect(
      room
        .snapshot(watcher)
        .seats.every((seat) => seat.name !== "观战者"),
    ).toBe(true);
    room.leave(watcher);
    expect(room.snapshot(alice).spectators).toHaveLength(0);
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

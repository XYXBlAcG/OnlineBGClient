import { it, expect } from 'vitest';
import { Room } from '../src/domain/room';
import { Replay } from '../src/domain/replay';

it('replays original actions deterministically and rejects a rules version mismatch', () => {
  const room = new Room('replay', { kind: 'uno', humans: 1, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false });
  const token = room.claim('Alice'); room.start(token);
  room.act(token, 'lead', room.version, { type: 'uno-start' }); room.end(token);
  const record = room.snapshot(token).replay!;
  expect(new Replay(record).frames().at(-1)).toEqual(room.state);
  expect(() => new Replay({ ...record, rulesVersion: 'unknown' })).toThrow('版本');
  expect(() => new Replay({ ...record, events: [{ type: 'action', actor: 0, action: { type: 'uno-play', card: 1000 }, seed: 'bad', version: 2 }] })).toThrow();
});

import { describe, expect, it } from 'vitest';
import { Strategy } from '../src/domain/strategy';
import { Room } from '../src/domain/room';

describe('authoritative room', () => {
  it('deduplicates moves, enforces versions, and restores identity', () => {
    const room = new Room('table', { kind: 'uno', humans: 2, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false });
    const first = room.claim('Alice');
    const second = room.claim('Bob');
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(first);
    const version = room.version;
    room.act(first, 'lead', version, { type: 'uno-start' });
    room.act(first, 'lead', version, { type: 'uno-start' });
    expect(room.version).toBe(version + 1);
    expect(() => room.act(second, 'stale', version, { type: 'uno-draw' })).toThrow('对局已更新');
    room.disconnect(second);
    expect(room.claim('Bob', second)).toBe(second);
    expect(room.snapshot(second).actor).toBe(1);
    expect(room.snapshot(first).decisions).toEqual([]);
  });

  it('accepts independent hero choices in one round and rejects choices from old rounds', () => {
    const room = new Room('heroes', { kind: 'sgs', humans: 2, ai: [{ difficulty: 'easy', name: '' }, { difficulty: 'easy', name: '' }], team: false, training: false });
    const tokens = [room.claim('甲'), room.claim('乙')];
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(tokens[0]);
    const lord = room.engine.actors(room.state!)[0];
    if (lord < 2) room.act(tokens[lord], 'lord', room.version, room.snapshot(tokens[lord]).candidates[0].action);
    else {
      const request = room.aiRequest()!;
      room.acceptDecision(new Strategy().decide(request.observation, request.actor, 'easy', request.seed), request.version);
    }
    const version = room.version;
    const humanChoices = tokens.map(token => ({ token, action: room.snapshot(token).candidates[0]?.action })).filter(choice => choice.action);
    if (humanChoices.length === 1) {
      const request = room.aiRequest()!;
      room.acceptDecision(new Strategy().decide(request.observation, request.actor, 'easy', request.seed), request.version);
    }
    for (const choice of humanChoices) expect(() => room.act(choice.token, choice.token, version, choice.action!)).not.toThrow();
    room.end(tokens[0]);
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(tokens[0]);
    expect(() => room.act(tokens[0], 'old-round', version, humanChoices[0].action!)).toThrow('对局已更新');
  });

  it('stores chat once and keeps full audit records private until match completion', () => {
    const room = new Room('table', { kind: 'uno', humans: 1, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false });
    const token = room.claim('Alice');
    room.chat(token, 'message', '你好');
    room.chat(token, 'message', '你好');
    expect(room.snapshot(token).chat).toHaveLength(1);
    expect(() => room.chat('wrong-token', 'bad', '你好')).toThrow();
  });
});

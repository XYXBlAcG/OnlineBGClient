import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/domain/protocol';
import { GameEngine } from '../src/domain/engine';
import { Strategy } from '../src/domain/strategy';
import { Room } from '../src/domain/room';

const ai = { difficulty: 'easy' as const, name: '' };
describe('game catalogue and room controls', () => {
  it('supports three humans and five individually named AI seats', () => {
    const config = configSchema.parse({ kind: 'sgs', humans: 3, ai: Array.from({ length: 5 }, () => ai), team: false, training: false, aiDelayMs: 1500 });
    const room = new Room('names', config);
    const tokens = ['甲', '乙', '丙'].map(name => room.claim(name));
    expect(room.snapshot(tokens[0]).seats).toHaveLength(8);
    expect(new Set(room.snapshot(tokens[0]).seats.map(seat => seat.name)).size).toBe(8);
  });
  it('enforces the chosen games capacity', () => {
    expect(() => configSchema.parse({ kind: 'fxq', humans: 3, ai: [ai, ai], team: false, training: false })).toThrow();
  });
  it('waits for the configured visible interval and rejects stale queued decisions', () => {
    const room = new Room('tempo', { kind: 'uno', humans: 1, ai: [ai], team: false, training: false, aiDelayMs: 1500 });
    const token = room.claim('甲');
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(token);
    room.act(token, 'lead', room.version, { type: 'uno-start' });
    while (!room.aiRequest()) {
      const snapshot = room.snapshot(token);
      room.act(token, crypto.randomUUID(), room.version, snapshot.candidates.find(candidate => candidate.action.type === 'uno-draw')!.action);
    }
    const request = room.aiRequest()!;
    const decision = new Strategy().decide(request.observation, request.actor, 'easy', request.seed);
    const now = Date.now();
    expect(room.queueDecision(decision, request.version)).toBe(true);
    expect(room.commitIfDue(now)).toBe(false);
    expect(room.commitIfDue(now + 1600)).toBe(true);
  });
  it('updates automatic Sanguosha names from heroes while preserving custom names', () => {
    const room = new Room('heroes', { kind: 'sgs', humans: 3, ai: [{ difficulty: 'easy', name: '军师' }, ...Array.from({ length: 4 }, () => ai)], team: false, training: false, aiDelayMs: 0 });
    const tokens = ['甲', '乙', '丙'].map(name => room.claim(name));
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(tokens[0]);
    for (let turn = 0; turn < 8; turn++) {
      const actor = room.engine.actors(room.state!)[0];
      if (actor < 3) room.act(tokens[actor], `hero:${turn}`, room.version, room.snapshot(tokens[actor]).candidates[0].action);
      else {
        const request = room.aiRequest()!;
        room.acceptDecision(new Strategy().decide(request.observation, request.actor, 'easy', request.seed), request.version);
      }
    }
    const snapshot = room.snapshot(tokens[0]);
    expect(snapshot.seats[3].name).toBe('军师');
    expect(snapshot.seats.slice(4).every(seat => !['星河', '云雀', '流星', '小满'].includes(seat.name))).toBe(true);
    expect(room.state?.kind === 'sgs' && room.state.view.hero.every(hero => hero > 0)).toBe(true);
  });
  it('drops a queued decision when the host ends the game', () => {
    const room = new Room('stop', { kind: 'uno', humans: 1, ai: [ai], team: false, training: false, aiDelayMs: 5000 });
    const token = room.claim('甲');
    for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
    room.start(token);
    room.act(token, 'lead', room.version, { type: 'uno-start' });
    while (!room.aiRequest()) {
      const snapshot = room.snapshot(token);
      room.act(token, crypto.randomUUID(), room.version, snapshot.candidates.find(candidate => candidate.action.type === 'uno-draw')!.action);
    }
    const request = room.aiRequest()!;
    room.queueDecision(new Strategy().decide(request.observation, request.actor, 'easy', request.seed), request.version);
    room.end(token);
    const version = room.version;
    expect(room.commitIfDue(Date.now() + 10000)).toBe(false);
    expect(room.version).toBe(version);
  });
  it('plays an original flight game to completion with auditable AI', () => {
    const engine = new GameEngine();
    const strategy = new Strategy();
    let game = engine.create('fxq', 4, 'flights');
    for (let turn = 0; turn < 2400 && !engine.finished(game); turn++) {
      const actor = engine.actors(game)[0];
      const decision = strategy.decide(engine.project(game, actor), actor, 'easy', `decision:${turn}`);
      expect(decision.candidates.length).toBeGreaterThan(0);
      game = engine.apply(game, actor, decision.chosen, `move:${turn}`);
    }
    expect(engine.finished(game)).toBe(true);
  }, 30000);
});

import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/domain/engine';
import { Strategy } from '../src/domain/strategy';
import { configSchema } from '../src/domain/protocol';

describe('original Chinese checkers', () => {
  it('supports two through six seats and rejects seven', () => {
    const engine = new GameEngine();
    for (let players = 2; players <= 6; players++) {
      const state = engine.create('tq', players, 'seats');
      expect(state.kind === 'tq' && state.view.playerPieces).toHaveLength(players);
    }
    expect(() => configSchema.parse({ kind: 'tq', humans: 7, ai: [], team: false, training: false })).toThrow();
  });
  it('applies original legal routes and rejects forged actors and destinations', () => {
    const engine = new GameEngine();
    const state = engine.create('tq', 2, 'routes');
    const actor = engine.actors(state)[0];
    const legal = engine.candidates(state, actor);
    expect(legal.length).toBeGreaterThan(0);
    const next = engine.apply(state, actor, legal[0].action, 'move');
    expect(next.kind === 'tq' && next.view.lastOp.route).toEqual(legal[0].action.type === 'tq-move' ? legal[0].action.route : []);
    if (next.kind !== 'tq') throw new Error('Wrong game');
    const restored = engine.checkers.original.my(engine.checkers.codec.decode(engine.checkers.codec.encode(engine.checkers.original.qA(next.view)).finish()), 2);
    expect(restored.recordList).toEqual(next.view.recordList);
    expect(engine.checkers.original.t2(restored, restored.waitFor)).toEqual(engine.checkers.original.t2(next.view, next.view.waitFor));
    expect(() => engine.apply(state, 1 - actor, legal[0].action, 'move')).toThrow();
    expect(() => engine.apply(state, actor, { type: 'tq-move', route: [0, 120] }, 'move')).toThrow();
  });
  it('recognizes target completion and prefers filling the final hole', () => {
    const engine = new GameEngine();
    const state = engine.create('tq', 2, 'finish');
    if (state.kind !== 'tq') throw new Error('Wrong game');
    state.view.waitFor = 0;
    const target = engine.checkers.targets(state.view, 0);
    const hole = target.find(cell => engine.checkers.original.Us(cell).join(',') === '8,8') || target[9];
    const vacant = Array.from({ length: 121 }, (_, cell) => cell).find(cell => !target.includes(cell) && !state.view.playerPieces[1].includes(cell) && engine.checkers.distance(cell, hole) === 1)!;
    state.view.playerPieces[0] = [...target.filter(cell => cell !== hole), vacant];
    state.view.playerPieces[1] = engine.checkers.original.bX(state.view.pos[0], 10);
    state.view.pieces = state.view.playerPieces.flat();
    const decision = new Strategy().decide(state, 0, 'easy', 'last');
    const next = engine.apply(state, 0, decision.chosen, 'win');
    expect(next.kind === 'tq' && next.view.winnerId).toContain(0);
  });
  it('avoids late-game cycles in a six-player match', () => {
    const engine = new GameEngine();
    const strategy = new Strategy();
    let state = engine.create('tq', 6, 'full:6');
    for (let turn = 0; turn < 600 && !engine.finished(state); turn++) {
      const actor = engine.actors(state)[0];
      state = engine.apply(state, actor, strategy.decide(state, actor, 'easy', `decision:${turn}`).chosen, `move:${turn}`);
    }
    expect(engine.finished(state)).toBe(true);
  }, 30000);
  it('completes an auditable original two-player game without hidden information', () => {
    const engine = new GameEngine();
    const strategy = new Strategy();
    let state = engine.create('tq', 2, 'complete');
    for (let turn = 0; turn < 600 && !engine.finished(state); turn++) {
      const actor = engine.actors(state)[0];
      const decision = strategy.decide(engine.project(state, actor), actor, 'easy', `tq:${turn}`);
      expect(decision.candidates.every(candidate => candidate.features.length > 0)).toBe(true);
      state = engine.apply(state, actor, decision.chosen, `move:${turn}`);
    }
    expect(engine.finished(state)).toBe(true);
  }, 30000);
});

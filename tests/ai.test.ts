import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/domain/engine';
import { Strategy } from '../src/domain/strategy';

describe('auditable strategy', () => {
  it('replays decisions using only the visible observation', () => {
    const engine = new GameEngine();
    const game = engine.apply(engine.create('uno', 3, 'cards'), 0, { type: 'uno-start' }, 'start');
    const actor = engine.actors(game)[0];
    const observation = engine.project(game, actor);
    const first = new Strategy().decide(observation, actor, 'normal', 'decision');
    expect(first).toEqual(new Strategy().decide(observation, actor, 'normal', 'decision'));
    expect(first.candidates.find(candidate => JSON.stringify(candidate.action) === JSON.stringify(first.chosen))?.score).toBe(Math.max(...first.candidates.map(candidate => candidate.score)));
    for (const candidate of first.candidates) expect(candidate.score).toBeCloseTo(candidate.features.reduce((sum, feature) => sum + feature.contribution, 0));
    expect(() => engine.apply(game, actor, first.chosen, 'result')).not.toThrow();
  });

  it('completes a real UNO game with original rules', () => {
    const engine = new GameEngine();
    const ai = new Strategy();
    let game = engine.create('uno', 3, 'entire-game');
    for (let i = 0; i < 600 && !engine.finished(game); i++) {
      const actor = engine.actors(game)[0];
      const decision = ai.decide(engine.project(game, actor), actor, 'easy', `turn:${i}`);
      game = engine.apply(game, actor, decision.chosen, `move:${i}`);
    }
    expect(engine.finished(game)).toBe(true);
  });

  it('makes executable decisions throughout a real four-player Sanguosha game', () => {
    const engine = new GameEngine();
    const ai = new Strategy();
    let game = engine.create('sgs', 4, 'sgs-entire');
    for (let i = 0; i < 900 && !engine.finished(game); i++) {
      if (engine.needsResolution(game) && engine.actors(game).length === 0) game = engine.resolve(game, `counter:${i}`);
      const actor = engine.actors(game)[0];
      if (actor === undefined) continue;
      const observation = engine.project(game, actor);
      const decision = ai.decide(observation, actor, 'easy', `decision:${i}`);
      game = engine.apply(game, actor, decision.chosen, `move:${i}`);
    }
    expect(engine.finished(game)).toBe(true);
  }, 30000);
});

import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/domain/engine';
import zeroCard from './fixtures/huogong-zero.json';
import type { GameState } from '../src/domain/types';
import { Strategy } from '../src/domain/strategy';

describe('hidden-information search', () => {
  it('allows declining fire attack after revealing card zero', () => {
    const engine = new GameEngine();
    const game = zeroCard as GameState;
    const actions = engine.candidates(game, 3);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(candidate => candidate.action.type === 'sgs-choice' && candidate.action.button === 1)).toBe(true);
  });
  it('preserves publicly revealed hand cards in hidden-information samples', () => {
    const engine = new GameEngine();
    const visible = engine.project(zeroCard as GameState, 0);
    const sampled = new Strategy().sample(visible, 0, 'revealed');
    if (sampled.kind !== 'sgs') throw new Error('wrong game');
    expect(sampled.view.playerHandCard[2]).toContain(0);
  });
  it('searches Sanguosha responses with legal original transitions', () => {
    const engine = new GameEngine();
    const strategy = new Strategy();
    for (const players of [2, 3, 4, 5]) {
      let game = engine.create('sgs', players, `search:${players}`);
      for (let turn = 0; turn < 24 && !engine.finished(game); turn++) {
        if (engine.needsResolution(game) && !engine.actors(game).length) game = engine.resolve(game, `resolve:${turn}`);
        const actor = engine.actors(game)[0];
        if (actor === undefined) continue;
        const difficulty = turn > players && turn % 5 === 0 ? 'hard' : turn > players && turn % 3 === 0 ? 'normal' : 'easy';
        const decision = strategy.decide(engine.project(game, actor), actor, difficulty, `decision:${players}:${turn}`);
        expect(decision.candidates.length).toBeGreaterThan(0);
        game = engine.apply(game, actor, decision.chosen, `move:${players}:${turn}`);
      }
    }
  }, 60000);
});

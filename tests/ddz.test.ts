import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/domain/engine';
import { configSchema } from '../src/domain/protocol';

describe('original dou dizhu rules', () => {
  it('deals 17 cards per player and isolates hidden hands and bottom cards', () => {
    const engine = new GameEngine();
    const state = engine.create('ddz', 3, 'deal');
    if (state.kind !== 'ddz') throw new Error('wrong game');
    expect(state.view.playerCardLists.slice(1).map(cards => cards.length)).toEqual([17, 17, 17]);
    const observation = engine.project(state, 0);
    if (observation.kind !== 'ddz') throw new Error('wrong game');
    expect(observation.view.playerCardLists[2].every(card => card < 0)).toBe(true);
    expect(observation.view.holeCardList.every(card => card < 0)).toBe(true);
    const next = engine.apply(state, 0, { type: 'ddz-claim' }, 'claim');
    if (next.kind !== 'ddz') throw new Error('wrong game');
    expect(next.view.landlordId).toBe(1);
    expect(next.view.playerCardLists[1]).toHaveLength(20);
    expect(() => engine.apply(next, 1, { type: 'ddz-play', cards: [next.view.playerCardLists[1][0]] }, 'illegal')).toThrow();
    expect(() => engine.apply(next, 0, { type: 'ddz-pass' }, 'lead')).toThrow();
  });
  it('plays a full legal three-human round without an AI strategy', () => {
    const engine = new GameEngine();
    let state = engine.apply(engine.create('ddz', 3, 'match'), 1, { type: 'ddz-claim' }, 'claim');
    for (let turn = 0; turn < 500 && !engine.finished(state); turn++) {
      const actor = engine.actors(state)[0];
      const candidates = engine.candidates(state, actor);
      expect(candidates.length).toBeGreaterThan(0);
      state = engine.apply(state, actor, candidates.find(candidate => candidate.action.type === 'ddz-play')?.action || candidates[0].action, `turn:${turn}`);
    }
    expect(engine.finished(state)).toBe(true);
  });
  it('rejects AI configuration until the dedicated strategy is available', () => {
    expect(() => configSchema.parse({ kind: 'ddz', humans: 1, ai: [{ difficulty: 'easy' }, { difficulty: 'easy' }], team: false, training: false })).toThrow('AI');
  });
});

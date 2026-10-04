import { describe, expect, it } from 'vitest';
import { GameEngine } from '../src/domain/engine';

describe('shared original game rules', () => {
  it('initializes reproducibly and enforces UNO card ownership', () => {
    const engine = new GameEngine();
    const first = engine.create('uno', 3, 'deck');
    expect(first).toEqual(engine.create('uno', 3, 'deck'));
    const started = engine.apply(first, 0, { type: 'uno-start' }, 'lead');
    const actor = engine.actors(started)[0];
    const bad = { type: 'uno-play' as const, card: 109, color: 0, jump: false, saidUno: true };
    expect(() => engine.apply(started, actor, bad, 'draw')).toThrow();
    const next = engine.apply(started, actor, { type: 'uno-draw' }, 'draw');
    expect(next.kind === 'uno' && next.view.cardList).toHaveLength(108);
  });

  it('hides opponents hands and unknown identities', () => {
    const engine = new GameEngine();
    const game = engine.create('sgs', 4, 'hidden');
    const visible = engine.project(game, 0);
    expect(visible.kind).toBe('sgs');
    if (visible.kind !== 'sgs') throw new Error('wrong game');
    expect(visible.view.playerHandCard[0]).toEqual(game.kind === 'sgs' ? game.view.playerHandCard[0] : []);
    expect(visible.view.playerHandCard[1].every(card => card < 0)).toBe(true);
    expect(visible.view.drawCards.every(card => card < 0)).toBe(true);
  });

  it('runs original hero selection and exposes executable decisions in every phase', () => {
    const engine = new GameEngine();
    let game = engine.create('sgs', 4, 'heroes');
    for (let i = 0; i < 4; i++) {
      const actor = engine.actors(game)[0];
      const actions = engine.candidates(game, actor);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].action.type).toBe('sgs-hero');
      game = engine.apply(game, actor, actions[0].action, `hero:${i}`);
    }
    if (game.kind !== 'sgs') throw new Error('wrong game');
    expect(game.view.stage).toBe(0);
    for (let i = 0; i < 80; i++) {
      if (engine.finished(game)) break;
      if (engine.needsResolution(game)) game = engine.resolve(game, `resolve:${i}`);
      const actor = engine.actors(game)[0];
      if (actor === undefined) continue;
      const actions = engine.candidates(game, actor);
      expect(actions.length, JSON.stringify(game.view)).toBeGreaterThan(0);
      game = engine.apply(game, actor, actions[0].action, `move:${i}`);
    }
  });
});

import { it, expect } from 'vitest';
import { Strategies } from '../src/domain/strategies';
import { GameEngine } from '../src/domain/engine';

it('dispatches supported games through one strategy contract and rejects unavailable kernels', () => {
  const registry = new Strategies();
  const engine = new GameEngine();
  const uno = engine.create('uno', 2, 'strategy-contract');
  const decision = registry.decide(engine.project(uno, 0), 0, 'easy', 'audit');
  expect(registry.decide(decision.observation, 0, 'easy', 'audit', decision.version)).toEqual(decision);
  expect(() => registry.decide(uno, 0, 'easy', 'audit', 'unknown')).toThrow('版本');
  expect(() => registry.decide(engine.create('ddz', 3, 'ddz'), 0, 'easy', 'audit')).toThrow('尚未接入');
});

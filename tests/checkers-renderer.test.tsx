import React from 'react';
import { renderToString } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { OriginalGame } from '../src/client/OriginalGame';
import { Room } from '../src/domain/room';
import { Strategy } from '../src/domain/strategy';

it('renders the original completed checkers board inside the client', () => {
  const room = new Room('renderer', { kind: 'tq', humans: 2, ai: [], team: false, training: false, aiDelayMs: 0 });
  const tokens = [room.claim('甲'), room.claim('乙')];
  for (const seat of room.seats) if (seat.token) room.setReady(seat.token, true);
  room.start(tokens[0]);
  const strategy = new Strategy();
  for (let turn = 0; turn < 600 && !room.engine.finished(room.state!); turn++) {
    const actor = room.engine.actors(room.state!)[0];
    const decision = strategy.decide(room.state!, actor, 'easy', `renderer:${turn}`);
    room.act(tokens[actor], `move:${turn}`, room.version, decision.chosen);
  }
  expect(room.engine.finished(room.state!)).toBe(true);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }), body: { appendChild: () => {}, removeChild: () => {} } });
  try {
    expect(renderToString(<OriginalGame snapshot={room.snapshot(tokens[0])} act={() => {}} end={() => {}} onReplay={() => {}} />)).toContain('胜利');
  } finally { vi.unstubAllGlobals(); }
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { OriginalGame } from '../src/client/OriginalGame';
import { Room } from '../src/domain/room';

it('renders the authoritative hand and exposes no unsupported undo action', () => {
  const room = new Room('renderer', { kind: 'ddz', humans: 3, ai: [], team: false, training: false });
  const tokens = ['甲', '乙', '丙'].map(name => room.claim(name));
  tokens.forEach(token => room.setReady(token, true));
  room.start(tokens[0]);
  room.act(tokens[0], 'claim', room.version, { type: 'ddz-claim' });
  room.act(tokens[0], 'play', room.version, room.snapshot(tokens[0]).candidates.find(candidate => candidate.action.type === 'ddz-play')!.action);
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('document', { createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }), body: { appendChild: () => {}, removeChild: () => {} } });
  try {
    const html = renderToString(<OriginalGame snapshot={room.snapshot(tokens[0])} act={() => {}} end={() => {}} onReplay={() => {}} />);
    expect(html).toContain('ddz-poker');
    expect(html).not.toContain('我反悔了');
  } finally { vi.unstubAllGlobals(); }
});

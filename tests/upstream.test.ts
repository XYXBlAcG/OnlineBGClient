import { describe, expect, it } from 'vitest';
import { UpstreamRuntime } from '../src/upstream/runtime';

describe('Hullqin local modules', () => {
  it('loads both original renderers and rules without the original site', () => {
    const runtime = new UpstreamRuntime();
    expect(runtime.load(7707).default).toBeTypeOf('function');
    expect(runtime.load(6749).default).toBeTypeOf('function');
    const uno = runtime.load(6435);
    const state = uno.my(uno.Lq({ playerList: [{}, {}, {}] }));
    expect(state.playerCards.map((hand: number[]) => hand.length)).toEqual([7, 7, 7]);
    const codec = runtime.load(575).L;
    const sgs = runtime.load(5051);
    const data = sgs.Lq({ playerList: [{}, {}, {}] }, codec.encode({ rule: 0 }).finish());
    expect(sgs.my(data, 3).hero).toHaveLength(3);
    expect(runtime.load(6749).actionSpec).toBeTypeOf('function');
  });
});

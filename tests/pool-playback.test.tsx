import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it } from "vitest";
import {
  POOL_OPPONENT_LEAD_IN,
  usePoolPlayback,
} from "../src/client/pool/use-pool-playback";
import { PoolRules } from "../src/domain/pool/rules";
import type { PoolShot, PoolView } from "../src/domain/pool/types";

const shot: PoolShot = {
  actor: 0,
  aim: 0,
  power: 0.5,
  spin: { x: 0, y: 0 },
  cueBefore: { x: -0.5, y: 0 },
  frames: [
    { t: 0, balls: [{ id: 0, x: -0.5, y: 0 }] },
    { t: 500, balls: [{ id: 0, x: -0.4, y: 0 }] },
  ],
  impacts: [],
  pocketed: [],
  firstHit: null,
  railAfterContact: false,
  cuePocketed: false,
  finalBalls: [{ id: 0, x: -0.4, y: 0, pocketed: false }],
};

it("does not replay an existing shot on mount and keeps the clock across views", () => {
  const base = new PoolRules(() => 0.42).create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  }).view;
  const initial: PoolView = { ...base, lastShot: shot };
  let playback!: ReturnType<typeof usePoolPlayback>;
  let tree!: ReactTestRenderer;
  function Harness({ view }: { view: PoolView }) {
    playback = usePoolPlayback(view);
    return null;
  }
  act(() => {
    tree = create(<Harness view={initial} />);
  });
  expect(playback.startedAt).toBe(0);
  expect(playback.leadIn).toBe(0);
  const next = { ...initial, shotNumber: 1 };
  act(() => tree.update(<Harness view={next} />));
  const startedAt = playback.startedAt;
  expect(startedAt).toBeGreaterThan(0);
  expect(playback.leadIn).toBe(POOL_OPPONENT_LEAD_IN);
  act(() =>
    tree.update(
      <Harness
        view={{ ...next, balls: next.balls.map((ball) => ({ ...ball })) }}
      />,
    ),
  );
  expect(playback.startedAt).toBe(startedAt);
  act(() => tree.unmount());
});

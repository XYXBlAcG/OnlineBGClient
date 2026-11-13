import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it } from "vitest";
import { usePoolAim } from "../src/client/pool/use-pool-aim";
import type { PoolBall } from "../src/domain/pool/types";

const balls: PoolBall[] = [
  { id: 0, x: -0.5, y: 0, pocketed: false },
  { id: 1, x: 0.5, y: 0, pocketed: false },
];

it("places the cue ball and includes it in the shot action", () => {
  let aim!: ReturnType<typeof usePoolAim>;
  let tree!: ReactTestRenderer;
  function Harness() {
    aim = usePoolAim({
      balls,
      cue: { x: -0.5, y: 0 },
      own: true,
      ballInHand: true,
      resetKey: "0:0",
    });
    return null;
  }
  act(() => {
    tree = create(<Harness />);
  });
  act(() => {
    expect(aim.begin({ x: 0.6, y: 0.4 })).toBe("place");
  });
  act(() => {
    expect(aim.end()).toBeNull();
  });
  act(() => {
    expect(aim.begin({ x: 0.8, y: 0.4 })).toBe("aim");
  });
  act(() => {
    aim.move({ x: 0.65, y: 0.4 });
  });
  let action: ReturnType<typeof aim.end> = null;
  act(() => {
    action = aim.end();
  });
  expect(action).toMatchObject({ cue: { x: 0.6, y: 0.4 } });
  expect(action!.power).toBeGreaterThan(0.05);
  act(() => tree.unmount());
});

import { expect, it } from "vitest";
import { effectGesture } from "../src/client/motion/effect-gesture";

it("伤害动作先蓄力再向目标出击，左右方向相反且最终归位", () => {
  const left = effectGesture("damage", -100);
  const right = effectGesture("damage", 100);
  expect(left[1].transform).not.toBe(right[1].transform);
  expect(left.at(-1)?.transform).toBe("none");
  expect(effectGesture("block", 100)[1].transform).toContain("scale");
});

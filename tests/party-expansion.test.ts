import { expect, it } from "vitest";
import {
  partyItems,
  partyPrice,
  partyTier,
} from "../src/domain/party/catalogue";
import { PredictionPool } from "../src/domain/party/predictions";
it("商品目录等级、短时蛋雨与价格从唯一目录派生", () => {
  expect(Object.keys(partyItems)).toHaveLength(50);
  expect(
    [0, 200, 600, 1500, 4000].map(
      (earned) =>
        Object.values(partyItems).filter((i) => i.tier <= partyTier(earned))
          .length,
    ),
  ).toEqual([28, 36, 42, 46, 50]);
  expect(partyItems.cometEgg.duration).toBe(6000);
  expect(partyPrice("cometEgg", 600)).toBe(8);
  expect(partyPrice("cheer", 4000)).toBe(3);
});
it("竞猜给足三十秒；资金托管；按最大余数分配全部奖池和补贴；结算幂等", () => {
  const pool = new PredictionPool("m", "r", "谁赢", ["a", "b"], 1000, 30000);
  pool.bet("甲", "a", 20, 100, 2000);
  pool.bet("乙", "a", 30, 100, 2000);
  pool.bet("丙", "b", 50, 100, 2000);
  expect(pool.resolve(["a"], 30999)).toEqual({ 甲: 20, 乙: 30, 丙: 50 });
  const p = new PredictionPool("n", "r", "谁赢", ["a", "b"], 1000, 30000);
  p.bet("甲", "a", 20, 100, 2000);
  p.bet("乙", "a", 30, 100, 2000);
  p.bet("丙", "b", 50, 100, 2000);
  p.lock(31000);
  expect(p.resolve(["a"], 32000)).toEqual({ 甲: 48, 乙: 72 });
  expect(p.resolve(["a"], 33000)).toEqual({});
});
it("改押仅在窗口内；取消和提前产生结果原额退款；单人不产生补贴", () => {
  const p = new PredictionPool("m", "r", "谁赢", ["a", "b"], 0, 30000);
  expect(p.bet("甲", "a", 20, 100, 100)).toBe(-20);
  expect(p.bet("甲", "b", 30, 80, 200)).toBe(-10);
  p.lock(30000);
  expect(() => p.bet("甲", "a", 5, 70, 31000)).toThrow();
  expect(p.resolve(["b"], 31000)).toEqual({ 甲: 30 });
  expect(p.cancel()).toEqual({});
});

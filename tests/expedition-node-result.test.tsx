import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { NodeResultCard } from "../src/client/expedition/NodeResultCard";

it("节点结算卡展示生命、金币、牌组、遗物、药水与罗盘变化", () => {
  const html = renderToStaticMarkup(
    <NodeResultCard
      result={{
        sequence: 9,
        nodeId: "shop-1",
        nodeKind: "shop",
        before: {
          compass: 1,
          heroes: [
            {
              actor: 0,
              name: "铁卫",
              hp: 30,
              maxHp: 48,
              gold: 20,
              cards: 10,
              relics: ["shell"],
              potions: ["tonic"],
            },
          ],
          companions: [],
        },
        after: {
          compass: 2,
          heroes: [
            {
              actor: 0,
              name: "铁卫",
              hp: 42,
              maxHp: 48,
              gold: 75,
              cards: 11,
              relics: ["shell", "lens"],
              potions: ["tonic", "fire"],
            },
          ],
          companions: [],
        },
      }}
      onClose={() => {}}
    />,
  );
  expect(html).toContain("exp-node-result-layer");
  expect(html).toContain("exp-node-result-backdrop");
  expect(html).toContain("节点结算");
  expect(html).toContain("生命 +12");
  expect(html).toContain("金币 +55");
  expect(html).toContain("牌组 +1");
  expect(html).toContain("获得 鹰眼镜");
  expect(html).toContain("药水 +1");
  expect(html).toContain("罗盘 +1");
  expect(html).toContain("继续前进");
});

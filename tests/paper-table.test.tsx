import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GameCover } from "../src/client/lobby/GameCover";
import { generateMap } from "../src/domain/expedition/map";
import { partyEconomy } from "../src/domain/party/model";
import { partyItems } from "../src/domain/party/catalogue";
import { readFileSync } from "node:fs";
it("封面只有图形，选中轮廓不依赖悬停阴影", () => {
  expect(renderToStaticMarkup(<GameCover kind="ccbs" />)).not.toContain("策略");
  const css = readFileSync("src/client/lobby/lobby.css", "utf8");
  expect(css).toContain("outline: 2px solid var(--accent)");
  expect(css).not.toContain("club-cover-category");
});
it("种子路线存在分叉汇合且所有节点可达，最终都进入首领", () => {
  for (let seed = 0; seed < 32; seed++)
    for (let chapter = 0; chapter < 3; chapter++) {
      const map = generateMap(String(seed), 2, chapter);
      expect(generateMap(String(seed), 2, chapter)).toEqual(map);
      const nodes = map.flat();
      const byId = new Map(nodes.map((node) => [node.id, node]));
      expect(map.at(-1)).toHaveLength(1);
      const boss = map.at(-1)![0];
      expect(boss.kind).toBe("boss");
      const seen = new Set(map[0].map((node) => node.id));
      const reachesBoss = new Set([boss.id]);
      let branches = 0;
      let merges = 0;
      for (const node of nodes) {
        const forward = node.next
          .map((id) => {
            const target = byId.get(id);
            expect(target).toBeDefined();
            return target!;
          })
          .filter((target) => target.floor > node.floor);
        expect(seen.has(node.id)).toBe(true);
        forward.forEach((target) => seen.add(target.id));
        branches += Number(forward.length > 1);
        merges += Number(
          nodes.filter(
            (source) =>
              source.floor < node.floor && source.next.includes(node.id),
          ).length > 1,
        );
      }
      for (const node of [...nodes].reverse()) {
        if (
          node.next.some(
            (id) => byId.get(id)!.floor > node.floor && reachesBoss.has(id),
          )
        )
          reachesBoss.add(node.id);
      }
      expect(reachesBoss.size).toBe(nodes.length);
      expect(branches).toBeGreaterThan(0);
      expect(merges).toBeGreaterThan(0);
    }
});
it("降低新账户开局币，普通全屏演出保持四到六秒", () => {
  expect(partyEconomy.initial).toBe(30);
  for (const item of Object.values(partyItems).filter((i) =>
    ["轰炸", "场景"].includes(i.category),
  )) {
    expect(item.duration).toBeGreaterThanOrEqual(4000);
    expect(item.duration).toBeLessThanOrEqual(6000);
  }
});

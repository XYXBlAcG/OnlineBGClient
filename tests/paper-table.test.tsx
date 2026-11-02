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
  let branches = 0,
    merges = 0,
    wide = 0;
  for (let seed = 0; seed < 32; seed++)
    for (let chapter = 0; chapter < 3; chapter++) {
      const map = generateMap(String(seed), 2, chapter),
        seen = new Set(map[0].map((n) => n.id));
      expect(generateMap(String(seed), 2, chapter)).toEqual(map);
      for (let floor = 0; floor < map.length - 1; floor++) {
        const targets = map[floor + 1];
        for (const node of map[floor]) {
          expect(seen.has(node.id)).toBe(true);
          expect(node.next.length).toBeGreaterThan(0);
          branches += Number(node.next.length >= 3);
          for (const id of node.next) {
            expect(targets.some((n) => n.id === id)).toBe(true);
            seen.add(id);
          }
        }
        merges += targets.filter(
          (n) => map[floor].filter((p) => p.next.includes(n.id)).length > 1,
        ).length;
        wide += Number(map[floor].length >= 6);
      }
      expect(seen.size).toBe(map.flat().length);
      expect(map.at(-1)).toHaveLength(1);
      expect(map.at(-1)![0].kind).toBe("boss");
    }
  expect(branches).toBeGreaterThan(200);
  expect(merges).toBeGreaterThan(200);
  expect(wide).toBeGreaterThan(100);
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

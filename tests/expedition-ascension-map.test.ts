import { expect, it } from "vitest";
import {
  ascensionLevels,
  ascensionProfile,
} from "../src/domain/expedition/ascension";
import { expeditionOptionsSchema } from "../src/domain/expedition/adventure-types";
import { encounterFor, generateMap } from "../src/domain/expedition/map";
import { encounterModifiers } from "../src/domain/expedition/modifiers";
import { routeProfiles } from "../src/domain/expedition/route-profiles";
import {
  pointOnCurves,
  routeLayout,
} from "../src/client/expedition/map-layout";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { expeditionAiDifficultyNames } from "../src/client/expedition/ExpeditionOptionsControl";

it("N0 到 N10 使用同一张累积阶位表，数值单调且边界可解析", () => {
  expect(expeditionAiDifficultyNames).toEqual({
    easy: "能力较弱",
    normal: "能力中等",
    hard: "能力较强",
  });
  expect(ascensionLevels.map((level) => level.label)).toEqual(
    Array.from({ length: 11 }, (_, level) => `N${level}`),
  );
  expect(expeditionOptionsSchema.parse({ ascension: 0 }).ascension).toBe(0);
  expect(expeditionOptionsSchema.parse({ ascension: 10 }).ascension).toBe(10);
  expect(() => expeditionOptionsSchema.parse({ ascension: 11 })).toThrow();

  const neutral = ascensionProfile(0);
  expect(neutral).toMatchObject({
    enemyHealth: 1,
    enemyAttack: 1,
    shopPrice: 1,
    campHealing: 1,
    modifierCount: 0,
    extraBossMinions: 0,
    extraRouteCost: 0,
    mechanicStart: 0,
  });

  for (let level = 1; level <= 10; level++) {
    const previous = ascensionProfile(level - 1);
    const current = ascensionProfile(level);
    expect(current.enemyHealth).toBeGreaterThanOrEqual(previous.enemyHealth);
    expect(current.enemyAttack).toBeGreaterThanOrEqual(previous.enemyAttack);
    expect(current.shopPrice).toBeGreaterThanOrEqual(previous.shopPrice);
    expect(current.campHealing).toBeLessThanOrEqual(previous.campHealing);
    expect(ascensionLevels[level].penalties.length).toBeGreaterThan(
      ascensionLevels[level - 1].penalties.length,
    );
    expect(ascensionLevels[level].boosts.length).toBeGreaterThan(
      ascensionLevels[level - 1].boosts.length,
    );
  }

  expect(ascensionProfile(5).extraBossMinions).toBe(1);
  expect(ascensionProfile(7).extraRouteCost).toBe(1);
  expect(ascensionProfile(8).modifierCount).toBe(2);
  expect(ascensionProfile(10)).toMatchObject({
    extraBossMinions: 1,
    extraRouteCost: 1,
    modifierCount: 2,
    mechanicStart: 1,
  });
  expect(ascensionProfile(-1)).toEqual(neutral);
  expect(ascensionProfile(99)).toEqual(ascensionProfile(10));
});

it("前进路线控制分叉数量，并把捷径与回溯限制在曲线外侧走线", () => {
  for (let seed = 0; seed < 96; seed++) {
    const map = generateMap(String(seed), 2, 0);
    const nodes = map.flat(),
      links = nodes.reduce((sum, node) => sum + node.next.length, 0);
    expect(links).toBeGreaterThanOrEqual(map.length);
    expect(links).toBeLessThan(nodes.length * 1.65);
    expect(nodes.every((node) => node.next.length <= 2)).toBe(true);
    expect(nodes.some((node) => node.next.length === 2)).toBe(true);
    expect(nodes.every((node) => node.route)).toBe(true);
    for (const row of map.slice(0, -1))
      expect(new Set(row.map((node) => node.kind)).size).toBeGreaterThanOrEqual(
        Math.min(2, row.length),
      );
  }

  const map = generateMap("layout", 2, 3);
  const layout = routeLayout(map);
  const nodeRects = [...layout.points.entries()].map(([id, point]) => ({
    id,
    left: point.x - layout.nodeWidth / 2,
    right: point.x + layout.nodeWidth / 2,
    top: point.y - layout.nodeHeight / 2,
    bottom: point.y + layout.nodeHeight / 2,
  }));
  expect(
    layout.links.filter((link) => link.shortcut || link.backward).length,
  ).toBeGreaterThan(0);
  for (const link of layout.links) {
    for (let sample = 1; sample < 50; sample++) {
      const point = pointOnCurves(link.curves, sample / 50);
      for (const rect of nodeRects)
        expect(
          point.x > rect.left + 2 &&
            point.x < rect.right - 2 &&
            point.y > rect.top + 2 &&
            point.y < rect.bottom - 2,
          `${link.from}->${link.to} crosses ${rect.id}`,
        ).toBe(false);
    }
  }
});

it("随机遭遇词条扩展为可持续组合，并公开效果数据", () => {
  expect(Object.keys(encounterModifiers)).toEqual(
    expect.arrayContaining([
      "reinforced",
      "volatile",
      "frenzy",
      "ambush",
      "thorns",
      "siphon",
      "renewal",
      "awakened",
    ]),
  );
  for (const definition of Object.values(encounterModifiers)) {
    expect(definition.name.length).toBeGreaterThan(0);
    expect(definition.description.length).toBeGreaterThan(0);
    expect(definition.effects).toBeTypeOf("object");
  }
});

it("N4 让普通战斗出现词条，N8 叠加第二词条", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  for (const [ascension, count] of [
    [4, 1],
    [8, 2],
  ] as const) {
    const state = adventure.create(1, false, {
      expedition: { difficulty: "standard", ascension },
    });
    const battle = state.view.map
      .flat()
      .find((node) => node.kind === "battle")!;
    expect(encounterFor(state.view, battle).modifiers).toHaveLength(count);
  }
});

it("开局提供更多独立路线原型和节点选择", () => {
  expect(Object.keys(routeProfiles)).toHaveLength(8);
  for (let seed = 0; seed < 48; seed++) {
    const map = generateMap(String(seed), 2, 0);
    expect(map[0].length).toBeGreaterThanOrEqual(3);
    expect(
      new Set(map[0].map((node) => node.route)).size,
    ).toBeGreaterThanOrEqual(3);
  }
});

import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BattleScene } from "../src/client/expedition/BattleScene";
import { creatures } from "../src/domain/expedition/world";
import type { Creature } from "../src/domain/expedition/extra-creatures";
import {
  type EncounterDefinition,
  type EnemyDefinition,
} from "../src/domain/expedition/content";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import { migrateExpedition } from "../src/domain/expedition/migration";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { encounterFor, generateMap } from "../src/domain/expedition/map";

function bossEncounter(id: keyof typeof creatures): EncounterDefinition {
  const creature = creatures[id] as Creature;
  return {
    name: creature.name,
    subtitle: "机制测试",
    mechanic: creature.mechanic,
    enemies: [
      { ...creature, role: "boss" },
      ...(creature.parts ?? []).map((part) => ({
        ...part,
        role: "part" as const,
      })),
    ],
  };
}

function neutralEnemy(
  overrides: Partial<EnemyDefinition> = {},
): EnemyDefinition {
  return {
    name: "木桩",
    hp: 500,
    icon: "sentinel",
    pattern: [{ kind: "block", amount: 1, target: 0 }],
    ...overrides,
  };
}

it("十一个首领都有独立机制，部件与双生身体进入统一敌人列表", () => {
  const bosses = Object.values(creatures).filter(
    (creature) => creature.rank === "boss",
  ) as Creature[];
  expect(bosses).toHaveLength(11);
  expect(new Set(bosses.map((boss) => boss.mechanic?.id)).size).toBe(11);
  expect(bosses.every((boss) => boss.mechanic)).toBe(true);
  expect((creatures.warden as Creature).parts).toHaveLength(2);
  expect((creatures.mycelium as Creature).parts).toHaveLength(1);
  expect((creatures.colossus as Creature).parts).toHaveLength(2);
});

it("四大层生成的首领遭遇保留单一首领、机制和最多四个目标", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  const state = adventure.create(4);
  for (let chapter = 0; chapter < 4; chapter++) {
    state.view.chapter = chapter;
    state.view.map = generateMap(`boss-map-${chapter}`, 2, chapter);
    state.view.seed = `boss-seed-${chapter}`;
    const encounter = encounterFor(state.view, state.view.map.at(-1)![0]);
    expect(encounter.mechanic).toBeDefined();
    expect(encounter.enemies.length).toBeLessThanOrEqual(4);
    expect(encounter.enemies[0].role).toBe("boss");
    expect(
      encounter.enemies.slice(1).every((enemy) => enemy.role === "part"),
    ).toBe(true);
  }
});

it("审判议程满值时伤害全队，击破裁决碑会清空议程", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("trial", [0], [bossEncounter("warden")]);
  expect(state.mechanic?.id).toBe("trial");
  state.mechanic!.track = 4;
  const hp = state.heroes[0].hp;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].hp).toBeLessThan(hp);
  expect(state.mechanic!.track).toBeLessThan(4);

  const judgment = state.enemies.findIndex(
    (enemy) => enemy.part === "judgment",
  );
  expect(judgment).toBeGreaterThan(0);
  state.enemies[judgment].hp = 1;
  state.enemies[judgment].block = 0;
  state.heroes[0].hand = [
    { id: "break-judgment", card: "strike", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "break-judgment",
    target: { side: "enemy", index: judgment },
  });
  expect(state.enemies[judgment].hp).toBe(0);
  expect(state.mechanic!.track).toBe(0);
  expect(state.visuals.some((event) => event.kind === "break")).toBe(true);
});

it("命运读取实际出牌，净化可以降低命运议程", () => {
  const rules = new ExpeditionRules();
  const fate: EncounterDefinition = {
    name: "命运测试",
    subtitle: "机制测试",
    mechanic: {
      id: "fate",
      name: "未来序列",
      summary: "命运随出牌与回合推进。",
      track: { label: "命运", max: 6, initial: 0 },
      phaseThreshold: 0.5,
      phaseName: "加速预言",
      phaseSummary: "命运上限降低。",
    },
    enemies: [neutralEnemy()],
  };
  let state = rules.create("fate", [0], [fate]);
  state.heroes[0].hand = [
    { id: "fate-card", card: "quick", upgradeLevel: 0 },
    { id: "fate-card-2", card: "quick", upgradeLevel: 0 },
    { id: "cleanse-card", card: "alchemy_filter", upgradeLevel: 0 },
  ];
  for (const id of ["fate-card", "fate-card-2"])
    state = rules.apply(state, {
      type: "play",
      actor: 0,
      instance: id,
      target: { side: "enemy", index: 0 },
    });
  expect(state.mechanic!.track).toBeGreaterThan(0);
  const before = state.mechanic!.track;
  rules.effects(
    state,
    0,
    [{ kind: "cleanse", amount: 1 }],
    [{ side: "hero", index: 0 }],
  );
  expect(state.mechanic!.track).toBe(before - 1);
});

it("根须连接分担伤害，净化会斩断连接", () => {
  const rules = new ExpeditionRules();
  const roots: EncounterDefinition = {
    name: "根须测试",
    subtitle: "机制测试",
    mechanic: {
      id: "roots",
      name: "根须纠葛",
      summary: "连接角色分担伤害。",
      track: { label: "缠绕", max: 2, initial: 0 },
      phaseThreshold: 0.5,
      phaseName: "荆棘根须",
      phaseSummary: "根须开始反击。",
    },
    enemies: [
      {
        ...neutralEnemy(),
        pattern: [{ kind: "attack", amount: 12, target: 0 }],
      },
    ],
  };
  let state = rules.create("roots", [0, 1], [roots]);
  expect(state.heroes[0].tether).toBe(1);
  expect(state.heroes[1].tether).toBe(0);
  for (const actor of [0, 1])
    state = rules.apply(state, { type: "ready", actor });
  expect(state.heroes[1].hp).toBeLessThan(state.heroes[1].maxHp);
  const hp = state.heroes[1].hp;
  rules.effects(
    state,
    1,
    [{ kind: "cleanse", amount: 1 }],
    [{ side: "hero", index: 1 }],
  );
  expect(state.heroes[1].tether).toBeNull();
  expect(state.heroes[1].hp).toBe(hp);
});

it("熔炉热量可由冷却阀降低", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("furnace", [0], [bossEncounter("colossus")]);
  expect(state.mechanic?.id).toBe("furnace");
  const valve = state.enemies.findIndex((enemy) => enemy.part === "valve");
  expect(valve).toBeGreaterThan(0);
  state.enemies[valve].hp = 1;
  state.enemies[valve].block = 0;
  state.mechanic!.track = 8;
  state.heroes[0].hand = [
    { id: "vent-valve", card: "strike", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "vent-valve",
    target: { side: "enemy", index: valve },
  });
  expect(state.mechanic!.track).toBeLessThan(8);
  expect(state.visuals.some((event) => event.kind === "break")).toBe(true);
});

it("双生孢子可被净化，钟摆按实际出牌累积", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("spores", [0], [bossEncounter("mycelium")]);
  expect(state.mechanic?.id).toBe("symbiosis");
  state.enemies.forEach((enemy) => {
    enemy.hp = enemy.maxHp = 500;
    enemy.intent = { kind: "block", amount: 1, target: 0 };
  });
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].spore).toBeGreaterThan(0);
  rules.effects(
    state,
    0,
    [{ kind: "cleanse", amount: 1 }],
    [{ side: "hero", index: 0 }],
  );
  expect(state.heroes[0].spore).toBe(0);

  state = rules.create("tempo", [0], [bossEncounter("clocksmith")]);
  expect(state.mechanic?.id).toBe("tempo");
  state.enemies[0].hp = state.enemies[0].maxHp = 500;
  state.heroes[0].hand = [
    { id: "clock-1", card: "quick", upgradeLevel: 0 },
    { id: "clock-2", card: "quick", upgradeLevel: 0 },
    { id: "clock-3", card: "quick", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  for (const id of ["clock-1", "clock-2", "clock-3"])
    state = rules.apply(state, {
      type: "play",
      actor: 0,
      instance: id,
      target: { side: "enemy", index: 0 },
    });
  expect(state.mechanic!.track).toBeGreaterThan(0);
  expect(state.mechanic!.roundCards).toBe(3);
});

it("镜面惩罚同类牌连用，月潮满值时爆发", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("mirror", [0], [bossEncounter("mirrorqueen")]);
  state.enemies[0].hp = state.enemies[0].maxHp = 500;
  state.heroes[0].hand = [
    { id: "mirror-a", card: "quick", upgradeLevel: 0 },
    { id: "mirror-b", card: "quick", upgradeLevel: 0 },
    { id: "mirror-c", card: "alchemy_filter", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  for (const id of ["mirror-a", "mirror-b"])
    state = rules.apply(state, {
      type: "play",
      actor: 0,
      instance: id,
      target: { side: "enemy", index: 0 },
    });
  expect(state.mechanic!.track).toBeGreaterThan(0);
  const before = state.mechanic!.track;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "mirror-c",
    target: { side: "hero", index: 0 },
  });
  expect(state.mechanic!.track).toBeLessThan(before);

  state = rules.create("tide", [0], [bossEncounter("reflectionlord")]);
  state.mechanic!.track = 4;
  const hp = state.heroes[0].hp;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].hp).toBeLessThan(hp);
});

it("Boss 机制阶段提前展示并接入静态场面", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("phase", [0], [bossEncounter("warden")]);
  state.enemies[0].hp = Math.floor(state.enemies[0].maxHp * 0.4);
  state.enemies[0].block = 0;
  state.heroes[0].hand = [{ id: "phase-hit", card: "strike", upgradeLevel: 0 }];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "phase-hit",
    target: { side: "enemy", index: 0 },
  });
  expect(state.mechanic!.phase).toBe(1);
  expect(state.visuals.some((event) => event.kind === "phase")).toBe(true);
  const html = renderToStaticMarkup(
    <BattleScene
      state={state}
      actor={0}
      names={["甲"]}
      onActor={() => {}}
      onTarget={() => {}}
      legalTargets={[]}
      previewTarget={null}
      onPreview={() => {}}
    />,
  );
  expect(html).toContain('data-guide-target="expedition.mechanic"');
  expect(html).toContain("审判天平");
});

it("旧远征存档补入新机制字段但保留已有战斗状态", () => {
  const adventure = new ExpeditionAdventure();
  const state = adventure.create(1);
  const hero = state.view.combat.heroes[0] as unknown as Record<
    string,
    unknown
  >;
  delete hero.spore;
  delete hero.tether;
  delete state.view.combat.mechanic;
  const before = structuredClone(state.view.combat.log);
  migrateExpedition(state.view);
  expect(hero.spore).toBe(0);
  expect(hero.tether).toBeNull();
  expect(state.view.combat.mechanic).toBeUndefined();
  expect(state.view.combat.log).toEqual(before);
});

it("旧战斗存档为敌人补入特性数组", () => {
  const state = new ExpeditionAdventure().create(1);
  state.view.combat = new ExpeditionRules().create(
    "trait-save",
    [0],
    [bossEncounter("warden")],
  );
  delete state.view.combat.enemies[0].traits;
  migrateExpedition(state.view);
  expect(state.view.combat.enemies[0].traits).toEqual([]);
});

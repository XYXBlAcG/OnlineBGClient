import { expect, it } from "vitest";
import type {
  EncounterDefinition,
  EnemyDefinition,
} from "../src/domain/expedition/content";
import { enemyTraits } from "../src/domain/expedition/enemy-traits";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import { creatures } from "../src/domain/expedition/world";
import type { Creature } from "../src/domain/expedition/extra-creatures";

function enemy(overrides: Partial<EnemyDefinition>): EnemyDefinition {
  return {
    name: "测试敌人",
    hp: 40,
    icon: "sentinel",
    pattern: [{ kind: "block", amount: 1, target: 0 }],
    ...overrides,
  };
}

function encounter(
  enemies: EnemyDefinition[],
  modifiers: EncounterDefinition["modifiers"] = [],
): EncounterDefinition {
  return { name: "特性测试", subtitle: "机制测试", enemies, modifiers };
}

it("四大主题加入可识别的敌人特性，并复用统一特性注册", () => {
  expect(Object.keys(enemyTraits)).toEqual(
    expect.arrayContaining(["vengeful", "leech", "overclock", "bulwark"]),
  );
  const traitCreatures = (Object.values(creatures) as Creature[]).filter(
    (creature) => creature.traits?.length,
  );
  expect(traitCreatures.length).toBeGreaterThanOrEqual(4);
  expect(new Set(traitCreatures.map((creature) => creature.biome))).toEqual(
    new Set(["ruins", "garden", "forge", "mirror"]),
  );
});

it("复仇敌人在同伴倒下时强化，壁垒敌人开局获得格挡", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "vengeful",
    [0],
    [
      encounter(
        [
          enemy({ name: "先倒者", hp: 1 }),
          enemy({ name: "复仇者", hp: 80, traits: ["vengeful"] }),
        ],
        ["renewal"],
      ),
    ],
  );
  state.heroes[0].hand = [{ id: "kill", card: "strike", upgradeLevel: 0 }];
  state.heroes[0].energy = 3;
  state.enemies[1].hp = 60;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "kill",
    target: { side: "enemy", index: 0 },
  });
  expect(state.enemies[1].strength).toBe(
    enemyTraits.vengeful.allyDeathStrength,
  );
  expect(state.enemies[1].hp).toBe(64);

  state = rules.create(
    "bulwark",
    [0],
    [encounter([enemy({ name: "壁垒者", traits: ["bulwark"] })])],
  );
  expect(state.enemies[0].block).toBe(enemyTraits.bulwark.openingBlock);
});

it("汲取与超载由敌方攻击触发，词条可把特性赋予随机敌人", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "leech",
    [0],
    [
      encounter(
        [
          enemy({
            name: "汲取者",
            hp: 40,
            traits: ["leech"],
            pattern: [{ kind: "attack", amount: 8, target: 0 }],
          }),
        ],
        ["siphon"],
      ),
    ],
  );
  state.enemies[0].hp = 10;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[0].hp).toBeGreaterThan(10);

  state = rules.create(
    "overclock",
    [0],
    [
      encounter([
        enemy({
          name: "超载者",
          traits: ["overclock"],
          pattern: [{ kind: "attack", amount: 5, target: 0 }],
        }),
      ]),
    ],
  );
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[0].strength).toBeGreaterThanOrEqual(
    enemyTraits.overclock.attackStrength,
  );

  state = rules.create(
    "awakened",
    [0],
    [encounter([enemy({ name: "觉醒者", hp: 60 })], ["awakened"])],
  );
  expect(state.enemies[0].traits?.length).toBe(1);
  expect(Object.keys(enemyTraits)).toContain(state.enemies[0].traits?.[0]);
});

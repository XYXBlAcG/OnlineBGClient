import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BattleScene } from "../src/client/expedition/BattleScene";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import type {
  ExpeditionGameState,
  ExpeditionMove,
} from "../src/domain/expedition/adventure-types";
import type {
  EncounterDefinition,
  EnemyDefinition,
  Intent,
} from "../src/domain/expedition/content";
import { generateMap } from "../src/domain/expedition/map";
import { encounterFor, travelCost } from "../src/domain/expedition/map";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import { ascensionProfile } from "../src/domain/expedition/ascension";
import { expeditionDifficulties } from "../src/domain/expedition/adventure-types";
import { creatures } from "../src/domain/expedition/world";

const shieldPattern: readonly Intent[] = [
  { kind: "block", amount: 1, target: 0 },
];

const broodling: EnemyDefinition = {
  key: "broodling",
  name: "裂巢幼体",
  hp: 8,
  icon: "beast",
  pattern: [{ kind: "attack", amount: 3, target: 0 }],
  deathBurst: 4,
};

const summoner: EncounterDefinition = {
  name: "孵化测试",
  subtitle: "机制测试",
  enemies: [
    {
      key: "mother",
      name: "裂巢母体",
      hp: 120,
      icon: "warden",
      role: "boss",
      pattern: shieldPattern,
    },
  ],
  summons: [
    {
      source: "mother",
      template: broodling,
      first: 1,
      every: 2,
      max: 2,
    },
  ],
};

it("首领会周期性召唤小兵，小兵占用战斗槽并在下一轮才行动", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("summon", [0], [summoner]);
  state.heroes[0].maxHp = state.heroes[0].hp = 100;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies).toHaveLength(2);
  expect(state.enemies[1].role).toBe("minion");
  expect(state.enemies[1].ownerIndex).toBe(0);
  expect(state.heroes[0].hp).toBe(100);
  const round = state.round;
  state.heroes[0].hand = [];
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.round).toBe(round + 1);
  expect(state.heroes[0].hp).toBeLessThan(100);
});

it("首领死亡会无触发地清理所属小兵，普通小兵死亡会爆炸", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("cascade", [0], [summoner]);
  state.heroes[0].maxHp = state.heroes[0].hp = 100;
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.enemies[1].ownerIndex).toBe(0);
  state.enemies[0].hp = 1;
  state.enemies[0].block = 0;
  state.heroes[0].hand = [
    { id: "finish-boss", card: "strike", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "finish-boss",
    target: { side: "enemy", index: 0 },
  });
  expect(state.phase).toBe("won");
  expect(state.enemies[1].hp).toBe(0);
  expect(state.heroes[0].hp).toBeGreaterThan(90);
  expect(state.visuals.some((event) => event.label?.includes("连锁消散"))).toBe(
    true,
  );
});

it("小兵自然死亡触发爆裂伤害", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("burst", [0], [summoner]);
  state.heroes[0].maxHp = state.heroes[0].hp = 100;
  state = rules.apply(state, { type: "ready", actor: 0 });
  state.enemies[1].hp = 1;
  state.enemies[1].block = 0;
  state.heroes[0].hand = [
    { id: "break-minion", card: "strike", upgradeLevel: 0 },
  ];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "break-minion",
    target: { side: "enemy", index: 1 },
  });
  expect(state.enemies[1].hp).toBe(0);
  expect(state.heroes[0].hp).toBeLessThan(100);
});

it("生成地图包含跨层捷径，并保持全部路线可达首领", () => {
  let found = false;
  for (let seed = 0; seed < 256 && !found; seed++) {
    const map = generateMap(String(seed), 2, 0);
    found = map.some((row) =>
      row.some((node) =>
        node.next.some(
          (id) =>
            map.flat().find((target) => target.id === id)!.floor >
            node.floor + 1,
        ),
      ),
    );
    if (!found) continue;
    let reachable = new Set(map[0].map((node) => node.id));
    for (let floor = 1; floor < map.length; floor++) {
      reachable = new Set(
        map[floor - 1]
          .filter((node) => reachable.has(node.id))
          .flatMap((node) => node.next),
      );
      expect(map[floor].every((node) => reachable.has(node.id))).toBe(true);
    }
  }
  expect(found).toBe(true);
});

it("任何非终点节点至少保留一个免费的非隐秘出口", () => {
  for (let seed = 0; seed < 128; seed++) {
    const map = generateMap(String(seed), 2, 0);
    for (let floor = 0; floor < map.length - 1; floor++)
      for (const node of map[floor]) {
        const next = map[floor + 1];
        expect(
          node.next.some((id) => {
            const target = next.find((candidate) => candidate.id === id);
            return target && target.kind !== "secret";
          }),
          `${seed}:${node.id}`,
        ).toBe(true);
      }
  }
});

it("地图包含反向环边，且回访已探索节点只作为中转", () => {
  let cycleSeed = -1;
  for (let seed = 0; seed < 512 && cycleSeed < 0; seed++) {
    const map = generateMap(String(seed), 2, 0);
    if (
      map.some((row) =>
        row.some((node) =>
          node.next.some(
            (id) =>
              map.flat().find((target) => target.id === id)!.floor < node.floor,
          ),
        ),
      )
    )
      cycleSeed = seed;
  }
  expect(cycleSeed).toBeGreaterThanOrEqual(0);

  const rules = new ExpeditionAdventure();
  let state = rules.create(1);
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const source = state.view.map[2][0],
    visited = state.view.map[0][0];
  source.next = [visited.id];
  state.view.current = source.id;
  state.view.floor = source.floor;
  state.view.path = [visited.id, source.id];
  state.view.phase = "map";
  state.view.votes = {};
  expect(travelCost(state.view, visited)).toEqual({
    cost: 1,
    backward: true,
    shortcut: false,
    visited: true,
  });
  state.view.compass = 1;
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: visited.id },
  });
  expect(state.view.compass).toBe(0);
  expect(state.view.phase).toBe("map");
  expect(state.view.current).toBe(visited.id);
});

it("观星台与誓约碑通过全队投票产生实际收益和 Boss 风险", () => {
  const rules = new ExpeditionAdventure();
  let state: ExpeditionGameState = rules.create(2),
    actor = 0;
  for (const profession of [0, 1])
    state = rules.apply(state, actor++, {
      type: "expedition-action",
      move: { type: "profession", profession },
    });
  state.view.phase = "oracle";
  state.view.current = "f0-0";
  state.view.votes = {};
  state.view.nodeReady = [false, false];
  const oracleMove: ExpeditionMove = { type: "vote", choice: "luck" };
  for (let i = 0; i < 2; i++)
    state = rules.apply(state, i, {
      type: "expedition-action",
      move: oracleMove,
    });
  expect(state.view.luck).toEqual([2, 2]);
  expect(state.view.phase).toBe("map");

  state.view.phase = "contract";
  state.view.current = "f1-0";
  state.view.votes = {};
  state.view.nodeReady = [false, false];
  for (let i = 0; i < 2; i++)
    state = rules.apply(state, i, {
      type: "expedition-action",
      move: { type: "vote", choice: "accept" },
    });
  expect(state.view.contract).toBe("brood");
  expect(state.view.combat.heroes.every((hero) => hero.gold >= 130)).toBe(true);
  const boss = state.view.map.at(-1)![0];
  expect(
    encounterFor(state.view, boss).enemies.some(
      (enemy) => enemy.role === "minion",
    ),
  ).toBe(true);
});

it("锻造所提供定向升级，隐秘裂隙消耗罗盘打开宝藏", () => {
  const rules = new ExpeditionAdventure();
  const start = () => {
    let state = rules.create(1);
    return rules.apply(state, 0, {
      type: "expedition-action",
      move: { type: "profession", profession: 0 },
    });
  };
  let state = start();
  const forge = state.view.map[0][0];
  forge.kind = "forge";
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: forge.id },
  });
  expect(state.view.phase).toBe("recovery");
  expect(state.view.pending[0]).toEqual([{ kind: "upgrade", left: 1 }]);

  state = start();
  const secret = state.view.map[0][0];
  secret.kind = "secret";
  state.view.compass = 1;
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: secret.id },
  });
  expect(state.view.compass).toBe(0);
  expect(state.view.phase).toBe("treasure");
});

it("N10 应用累积负面与补偿，随机词条进入战斗状态", () => {
  const profile = ascensionProfile(10);
  expect(profile.enemyHealth).toBeCloseTo(1.1, 5);
  expect(profile.extraBossMinions).toBe(1);
  expect(profile.modifierCount).toBe(2);

  const adventure = new ExpeditionAdventure();
  let state = adventure.create(1, false, {
    expedition: { difficulty: "standard", ascension: 10 },
  });
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  expect(state.view.ascension).toBe(10);
  expect(state.view.compass).toBe(4);
  expect(state.view.combat.heroes[0].gold).toBe(
    50 + profile.startGold + expeditionDifficulties.standard.compensation.gold,
  );
  expect(state.view.combat.heroes[0].maxHp).toBeGreaterThan(48);
  const bossEncounter = encounterFor(state.view, state.view.map.at(-1)![0]);
  expect(bossEncounter.modifiers).toHaveLength(2);
  expect(bossEncounter.enemies.some((enemy) => enemy.role === "minion")).toBe(
    true,
  );
  const baseBoss = Object.values(creatures).find(
    (creature) => creature.name === bossEncounter.name,
  )!;
  const baseMechanic = "mechanic" in baseBoss ? baseBoss.mechanic : undefined;
  expect(bossEncounter.mechanic?.track.initial).toBe(
    (baseMechanic?.track.initial ?? 0) + 1,
  );

  const levelFive = adventure.create(1, false, {
    expedition: { difficulty: "standard", ascension: 5 },
  });
  levelFive.view.ascension = 5;
  const levelFiveBoss = encounterFor(
    levelFive.view,
    levelFive.view.map.at(-1)![0],
  );
  expect(levelFiveBoss.enemies.some((enemy) => enemy.role === "minion")).toBe(
    true,
  );

  const encounter: EncounterDefinition = {
    name: "词条测试",
    subtitle: "N10",
    modifiers: ["reinforced", "ambush", "frenzy"],
    enemies: [
      {
        name: "词条木桩",
        hp: 30,
        icon: "sentinel",
        pattern: shieldPattern,
      },
    ],
  };
  let combat = new ExpeditionRules().create("modifiers", [0], [encounter]);
  expect(combat.heroes[0].vulnerable).toBe(1);
  expect(combat.enemies[0].block).toBe(3);
  expect(combat.enemies[0].maxHp).toBeGreaterThan(30);
  combat = new ExpeditionRules().apply(combat, { type: "ready", actor: 0 });
  expect(combat.enemies[0].strength).toBeGreaterThan(0);
});

it("小兵和召唤队列在战斗界面公开", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("summon-ui", [0], [summoner]);
  state.heroes[0].maxHp = state.heroes[0].hp = 100;
  state = rules.apply(state, { type: "ready", actor: 0 });
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
  expect(html).toContain("裂巢幼体");
  expect(html).toContain("下一次孵化");
  expect(html).toContain("1 / 2");
});

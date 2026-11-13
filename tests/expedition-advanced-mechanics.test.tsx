import { expect, it } from "vitest";
import { ExpeditionRules } from "../src/domain/expedition/rules";
import type { EncounterDefinition } from "../src/domain/expedition/content";
import { cardText, definition } from "../src/domain/expedition/content";
import {
  cards,
  cardPools,
  commonCards,
  heroContent,
} from "../src/domain/expedition/content";
import { creatures, relics } from "../src/domain/expedition/world";
import type { Creature } from "../src/domain/expedition/extra-creatures";
import { nodeNames } from "../src/domain/expedition/map";
import { routeProfiles } from "../src/domain/expedition/route-profiles";
import {
  combatGoldReward,
  ExpeditionAdventure,
} from "../src/domain/expedition/adventure";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfessionDetail } from "../src/client/expedition/ProfessionDetail";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";

function encounter(
  pattern: EncounterDefinition["enemies"][number]["pattern"],
): EncounterDefinition {
  return {
    name: "机制测试",
    subtitle: "高级状态",
    enemies: [
      {
        name: "机制木桩",
        hp: 80,
        icon: "sentinel",
        pattern,
      },
    ],
  };
}

it("封牌会替换可出牌且只保留到下一次玩家行动结束", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "seal-mechanic",
    [0],
    [
      encounter([
        { kind: "seal", amount: 2, target: 0 },
        { kind: "block", amount: 1, target: 0 },
      ]),
    ],
  );
  state.heroes[0].hand = ["a", "b", "c", "d"].map((id) => ({
    id,
    card: "strike" as const,
    upgradeLevel: 0,
  }));
  const original = state.heroes[0].hand.map((card) => card.id);
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.round).toBe(2);
  const sealed = state.heroes[0].hand.filter(
    (card) => definition(card).unplayable,
  );
  expect(sealed).toHaveLength(2);
  expect(definition(sealed[0]).temporary).toBe(true);
  expect(cardText(sealed[0])).toContain("自动消散");
  expect(
    rules
      .candidates(state, 0)
      .some(
        (action) =>
          action.type === "play" &&
          sealed.some((card) => card.id === action.instance),
      ),
  ).toBe(false);
  expect(
    [...state.heroes[0].discard, ...state.heroes[0].deck].map(
      (card) => card.id,
    ),
  ).toEqual(expect.arrayContaining(original.slice(0, 4)));
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].hand.some((card) => definition(card).unplayable)).toBe(
    false,
  );
});

it("封口只禁止目标玩家出牌，净化可以提前解除", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "silence-mechanic",
    [0, 1],
    [encounter([{ kind: "silence", amount: 1, target: 0 }])],
  );
  state = rules.apply(state, { type: "ready", actor: 0 });
  state = rules.apply(state, { type: "ready", actor: 1 });
  expect(state.round).toBe(2);
  expect(state.heroes[0].silenced).toBeGreaterThan(0);
  expect(rules.candidates(state, 0).map((action) => action.type)).toEqual([
    "ready",
  ]);
  expect(
    rules.candidates(state, 1).some((action) => action.type === "play"),
  ).toBe(true);
  rules.effects(
    state,
    1,
    [{ kind: "cleanse", amount: 1 }],
    [{ side: "hero", index: 0 }],
  );
  expect(state.heroes[0].silenced).toBe(0);
  expect(
    rules.candidates(state, 0).some((action) => action.type === "play"),
  ).toBe(true);
});

it("敌人夺取的金币和遗物保存在掠夺者身上，击杀后归还", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "loot-mechanic",
    [0],
    [
      encounter([
        { kind: "steal-gold", amount: 35, target: 0 },
        { kind: "block", amount: 1, target: 0 },
      ]),
    ],
  );
  state.heroes[0].gold = 90;
  state.heroes[0].relics = ["shell"];
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].gold).toBe(55);
  expect(state.enemies[0].stolenGold).toBe(35);
  state.enemies[0].stolenRelics.push({ relic: "shell", owner: 0 });
  state.heroes[0].relics = [];
  state.enemies[0].hp = 1;
  state.heroes[0].hand = [{ id: "recover", card: "strike", upgradeLevel: 0 }];
  state.heroes[0].energy = 3;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: "recover",
    target: { side: "enemy", index: 0 },
  });
  expect(state.heroes[0].gold).toBe(90);
  expect(state.heroes[0].relics).toContain("shell");
  expect(state.enemies[0].stolenGold).toBe(0);
  expect(state.enemies[0].stolenRelics).toEqual([]);
});

it("遗物夺取意图会进入敌人赃物栏，反制遗物会响应封牌与封口", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "steal-relic",
    [0],
    [encounter([{ kind: "steal-relic", amount: 1, target: 0 }])],
  );
  state.heroes[0].relics = ["shell"];
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].relics).toEqual([]);
  expect(state.enemies[0].stolenRelics).toEqual([{ relic: "shell", owner: 0 }]);

  state = rules.create(
    "counter-relics",
    [0],
    [
      encounter([
        { kind: "seal", amount: 2, target: 0 },
        { kind: "silence", amount: 1, target: 0 },
      ]),
    ],
  );
  state.heroes[0].relics = ["lockpick", "silentBell"];
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].strength).toBeGreaterThan(0);
  state = rules.apply(state, { type: "ready", actor: 0 });
  expect(state.heroes[0].silenced).toBe(0);
});

it("新增掠夺、封牌、封口敌人与两个主题首领", () => {
  const all = Object.values(creatures) as Creature[];
  expect(all.filter((creature) => creature.rank === "boss")).toHaveLength(11);
  expect(all.find((creature) => creature.name === "缄默抄写员")).toBeDefined();
  expect(all.find((creature) => creature.name === "熔金税吏")).toBeDefined();
  expect(all.find((creature) => creature.name === "遗物贪食者")).toBeDefined();
  expect(
    all.find((creature) => creature.name === "失语圣像")?.mechanic?.id,
  ).toBe("silence");
  expect(
    all.find((creature) => creature.name === "熔金暴君")?.mechanic?.id,
  ).toBe("tribute");
  expect(
    all.find((creature) => creature.name === "熔金掠夺者"),
  ).toBeDefined();
  expect(all.find((creature) => creature.name === "裂隙塞壬")).toBeDefined();
  expect(all.find((creature) => creature.name === "断契者")).toBeDefined();
});

it("新节点、路线和反制遗物进入唯一注册表", () => {
  expect(nodeNames).toMatchObject({
    pawnshop: "当铺",
    gamble: "赌局",
    library: "禁书库",
    hunt: "追猎台",
    rift: "深渊裂隙",
  });
  expect(routeProfiles.provision.sequence).toContain("pawnshop");
  expect(routeProfiles.ritual.sequence).toContain("library");
  expect(routeProfiles.descent.sequence).toContain("rift");
  expect(routeProfiles.gambit.sequence).toContain("gamble");
  expect(routeProfiles.companionship.sequence).toContain("recruit");
  expect(Object.keys(relics)).toEqual(
    expect.arrayContaining([
      "lockpick",
      "pawnTicket",
      "relicSatchel",
      "silentBell",
      "curseIndex",
      "secondFate",
      "lootScales",
      "blackLedger",
    ]),
  );
  expect(Object.keys(relics)).toEqual(
    expect.arrayContaining([
      "prismVeil",
      "diceCrown",
      "turretCore",
      "ventCharm",
      "volatileHeart",
      "sporeVial",
      "redThread",
      "boneWheel",
      "oathSigil",
      "crystalChoir",
      "pilgrimCharm",
      "woundEtcher",
      "mirrorPact",
      "lastWord",
      "lootCrown",
      "sunDial",
      "cinderPact",
      "blackMass",
    ]),
  );
  expect(
    new Set(
      Object.values(relics).flatMap((relic) =>
        relic.effects.map((effect) => effect.kind),
      ),
    ).size,
  ).toBeGreaterThanOrEqual(16);
});

it("当铺、赌局、禁书库、追猎台与深渊裂隙通过真实冒险动作结算", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  let state = adventure.create(1);
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  state.view.combat.heroes[0].gold = 100;
  state.view.combat.heroes[0].relics = ["shell"];
  state.view.phase = "pawnshop";
  state.view.current = "f0-0";
  state.view.votes = {};
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "sell" },
  });
  expect(state.view.combat.heroes[0].gold).toBe(165);
  expect(state.view.combat.heroes[0].relics).toEqual([]);

  state.view.phase = "gamble";
  state.view.votes = {};
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "safe" },
  });
  expect(state.view.combat.heroes[0].gold).toBe(180);

  const deckSize = state.view.combat.heroes[0].discard.length;
  state.view.phase = "library";
  state.view.votes = {};
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "bargain" },
  });
  expect(state.view.combat.heroes[0].gold).toBe(230);
  expect(state.view.combat.heroes[0].discard.length).toBe(deckSize + 1);
  expect(
    state.view.combat.heroes[0].discard.some(
      (card) => card.card === "black_debt",
    ),
  ).toBe(true);
  expect(state.view.combat.heroes[0].relics.length).toBe(1);

  state.view.phase = "hunt";
  state.view.votes = {};
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "accept" },
  });
  expect(state.view.hunt).toBe(true);

  let riftState = adventure.create(1);
  riftState = adventure.apply(riftState, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const parentMap = riftState.view.map,
    rift = parentMap[0][0];
  rift.kind = "rift";
  riftState.view.phase = "map";
  riftState.view.current = null;
  riftState.view.path = [];
  riftState.view.votes = {};
  riftState = adventure.apply(riftState, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: rift.id },
  });
  expect(riftState.view.phase).toBe("rift");
  riftState = adventure.apply(riftState, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "enter" },
  });
  expect(riftState.view.side).toBe(true);
  expect(riftState.view.map).toHaveLength(6);
  const sideExit = riftState.view.map.at(-1)![0],
    sideBeforeExit = riftState.view.map.at(-2)![0];
  riftState.view.current = sideBeforeExit.id;
  riftState.view.floor = sideBeforeExit.floor;
  riftState.view.path = [sideBeforeExit.id];
  riftState.view.votes = {};
  riftState.view.phase = "map";
  riftState = adventure.apply(riftState, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: sideExit.id },
  });
  expect(riftState.view.side).toBe(false);
  expect(riftState.view.map).toEqual(parentMap);
  expect(riftState.view.phase).toBe("map");
  expect(riftState.view.combat.heroes[0].gold).toBe(146);
});

it("两个新职业各有 24 张独立职业牌并进入统一卡池", () => {
  expect(heroContent.slice(-2).map((hero) => hero.name)).toEqual([
    "契刃客",
    "骰术师",
  ]);
  expect(cardPools).toHaveLength(9);
  expect(
    Object.keys(cards).filter((id) => id.startsWith("covenant_")),
  ).toHaveLength(24);
  expect(
    Object.keys(cards).filter((id) => id.startsWith("dice_")),
  ).toHaveLength(24);
  expect(heroContent[6].deck).toHaveLength(10);
  expect(heroContent[7].deck).toHaveLength(10);
  expect(commonCards).not.toContain("black_debt");
  expect(commonCards).not.toContain("sealed_echo");
});

it("骰术师开局获得两枚骰子，骰子不足时对应卡牌不可出", () => {
  const rules = new ExpeditionRules();
  let state = rules.create(
    "dice-cost",
    [7],
    [encounter([{ kind: "block", amount: 1, target: 0 }])],
  );
  expect(state.heroes[0].dice).toBe(2);
  state.heroes[0].hand = [
    { id: "dice-card", card: "dice_shot", upgradeLevel: 0 },
  ];
  expect(
    rules
      .candidates(state, 0)
      .some(
        (action) => action.type === "play" && action.instance === "dice-card",
      ),
  ).toBe(true);
  state.heroes[0].dice = 0;
  expect(
    rules
      .candidates(state, 0)
      .some(
        (action) => action.type === "play" && action.instance === "dice-card",
      ),
  ).toBe(false);
});

it("职业详情展示定位、资源提示、起始牌组和完整职业牌池", () => {
  for (let index = 0; index < heroContent.length; index++) {
    const html = renderToStaticMarkup(<ProfessionDetail profession={index} />);
    expect(html).toContain(heroContent[index].name);
    expect(html).toContain(heroContent[index].title);
    expect(html).toContain("起始牌组");
    expect(html).toContain("查看全部 24 张职业牌");
    expect(html.match(/data-card=/g)?.length).toBeGreaterThanOrEqual(33);
  }
});

it("精英战斗收益高于普通战斗，首领收益最高", () => {
  expect(combatGoldReward("battle", 2)).toBe(43);
  expect(combatGoldReward("elite", 2)).toBe(83);
  expect(combatGoldReward("boss", 2)).toBe(128);
  expect(combatGoldReward("elite", 2)).toBeGreaterThan(
    combatGoldReward("battle", 2),
  );
});

it("困难 AI 会评估未探索的回溯节点作为主动路线", () => {
  const adventure = new ExpeditionAdventure(() => 0.37);
  let state = adventure.create(1);
  state = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const nodes = state.view.map.flat(),
    source = nodes.find((node) =>
      node.next.some(
        (id) => nodes.find((target) => target.id === id)!.floor < node.floor,
      ),
    )!,
    target = nodes.find(
      (node) => source.next.includes(node.id) && node.floor < source.floor,
    )!;
  target.kind = "camp";
  source.next = [target.id];
  state.view.current = source.id;
  state.view.floor = source.floor;
  state.view.path = [source.id];
  state.view.votes = {};
  const ai = new ExpeditionStrategy(),
    request = {
      observation: adventure.project(state, 0),
      actor: 0,
      difficulty: "hard" as const,
      seed: "backtrack-test",
      audit: false,
    },
    candidate = ai
      .candidates(request)
      .find(
        (item) =>
          item.action.type === "expedition-action" &&
          item.action.move.type === "vote" &&
          item.action.move.choice === target.id,
      );
  expect(candidate).toBeDefined();
  expect(ai.score(request, [candidate!])[0].score).toBeGreaterThan(0);
});

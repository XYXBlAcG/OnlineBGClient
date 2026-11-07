import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";
import { mapChoices, shopRaidBalance } from "../src/domain/expedition/map";
import type { CompanionMode } from "../src/domain/expedition/adventure-types";
import { migrateExpedition } from "../src/domain/expedition/migration";

function startedAdventure(players = 1) {
  const adventure = new ExpeditionAdventure(() => 0.37);
  let state = adventure.create(players);
  for (let actor = 0; actor < players; actor++)
    state = adventure.apply(state, actor, {
      type: "expedition-action",
      move: { type: "profession", profession: actor % 3 },
    });
  return { adventure, state };
}

it("非战斗节点结束后保留可见的资源结算快照", () => {
  const { adventure, state } = startedAdventure(),
    node = state.view.map[0][0];
  node.kind = "gamble";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: node.id },
  });
  const goldBefore = next.view.combat.heroes[0].gold;
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "safe" },
  });
  expect(next.view.phase).toBe("map");
  expect(next.view.lastNodeResult).toMatchObject({
    nodeId: node.id,
    nodeKind: "gamble",
  });
  expect(
    next.view.lastNodeResult!.after.heroes[0].gold -
      next.view.lastNodeResult!.before.heroes[0].gold,
  ).toBe(15);
  expect(next.view.lastNodeResult!.after.heroes[0].gold).toBe(goldBefore + 15);
});

it("深渊支线只有抵达最后一行的出口才会返回主线", () => {
  const { adventure, state } = startedAdventure(),
    rift = state.view.map[0][0],
    ai = new ExpeditionStrategy();
  rift.kind = "rift";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: rift.id },
  });
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "enter" },
  });
  expect(next.view.side).toBe(true);
  const visited = new Set<string>();
  for (let step = 0; step < 160 && next.view.side; step++) {
    const actor = adventure.actors(next)[0];
    expect(actor).not.toBeUndefined();
    const decision = ai.decide(
      adventure.project(next, actor!),
      actor!,
      "hard",
      `side-traversal:${step}`,
    );
    if (
      decision.chosen.type === "expedition-action" &&
      decision.chosen.move.type === "vote" &&
      next.view.phase === "map"
    )
      visited.add(decision.chosen.move.choice);
    next = adventure.apply(next, actor!, decision.chosen);
  }
  expect(next.view.side).toBe(false);
  expect(visited.size).toBeGreaterThanOrEqual(6);
  expect(next.view.lastNodeResult?.nodeKind).toBe("rift");
});

it("抢商店胜利后进入免费商店，并永久封死所有商店节点", () => {
  const { adventure, state } = startedAdventure(),
    shop = state.view.map[0][0],
    battle = state.view.map[1][0];
  shop.kind = "shop";
  battle.kind = "battle";
  const shopCount = state.view.map
    .flat()
    .filter((node) => node.kind === "shop").length;
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: shop.id },
  });
  expect(next.view.phase).toBe("shop");
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "raid-shop" },
  });
  expect(next.view.phase).toBe("battle");
  expect(next.view.shopRaidActive).toBe(true);
  expect(next.view.shopRaidDeadlineRound).toBe(shopRaidBalance.roundLimit);
  expect(next.view.combat.enemies[0].name).toBe("熔金掠夺者");
  next.view.combat.enemies[0].hp = 1;
  next.view.combat.enemies[0].block = 0;
  next.view.combat.heroes[0].hand = [
    { id: "raid-finisher", card: "strike", upgradeLevel: 0 },
  ];
  next.view.combat.heroes[0].energy = 3;
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: {
      type: "card",
      instance: "raid-finisher",
      target: { side: "enemy", index: 0 },
    },
  });
  expect(next.view.phase).toBe("shop");
  expect(next.view.shopsSealed).toBe(true);
  expect(next.view.shopRaidFailed).toBe(false);
  expect(next.view.shop[0].every((item) => item.price === 0)).toBe(true);
  expect(next.view.map.flat().filter((node) => node.kind === "shop")).toEqual(
    [],
  );
  expect(
    next.view.map.flat().filter((node) => node.kind === "empty"),
  ).toHaveLength(shopCount);
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "done" },
  });
  const sideEntrance = mapChoices(next.view)[0];
  sideEntrance.kind = "rift";
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: sideEntrance.id },
  });
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: "enter" },
  });
  expect(next.view.map.flat().some((node) => node.kind === "shop")).toBe(false);
});

it("抢商店超过回合上限时老板带走全部商品，不把商品变成免费", () => {
  const { adventure, state } = startedAdventure(),
    shop = state.view.map[0][0];
  shop.kind = "shop";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: shop.id },
  });
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "raid-shop" },
  });
  next.view.combat.round = next.view.shopRaidDeadlineRound! + 1;
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "ready" },
  });
  expect(next.view.phase).toBe("shop");
  expect(next.view.shopRaidActive).toBe(false);
  expect(next.view.shopRaidFailed).toBe(true);
  expect(next.view.shopRaidDeadlineRound).toBeNull();
  expect(next.view.shopsSealed).toBe(false);
  expect(next.view.shop[0].every((item) => item.sold)).toBe(true);
});

it("冒险进度累计进入的节点和每个角色打出的卡牌", () => {
  const { adventure, state } = startedAdventure(),
    node = state.view.map[0][0];
  node.kind = "battle";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: node.id },
  });
  expect(next.view.stats.nodesVisited).toBe(1);
  const cardsBefore = next.view.stats.cardsPlayed[0];
  next.view.combat.heroes[0].hand = [
    { id: "progress-card", card: "strike", upgradeLevel: 0 },
  ];
  next.view.combat.heroes[0].energy = 3;
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: {
      type: "card",
      instance: "progress-card",
      target: { side: "enemy", index: 0 },
    },
  });
  expect(next.view.stats.cardsPlayed[0]).toBe(cardsBefore + 1);
});

it("招募节点提供不同存续规则的 AI 队友，并能在战斗前选择是否上场", () => {
  const { adventure, state } = startedAdventure(),
    recruit = state.view.map[0][0];
  recruit.kind = "recruit";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: recruit.id },
  });
  expect(next.view.phase).toBe("recruit");
  expect(next.view.companionOffers).toHaveLength(3);
  expect(
    new Set(next.view.companionOffers.map((candidate) => candidate.mode)).size,
  ).toBe(3);
  const offer = next.view.companionOffers[0];
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: offer.id },
  });
  expect(next.view.companions).toHaveLength(1);
  expect(next.view.companions[0]).toMatchObject({
    name: offer.name,
    mode: offer.mode,
    active: true,
  });
  const battle = mapChoices(next.view)[0];
  battle.kind = "battle";
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: battle.id },
  });
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "toggle-companion", enabled: true },
  });
  expect(next.view.companionBattle).toMatchObject({
    companionId: next.view.companions[0].id,
    chosen: true,
  });
  expect(next.view.combat.visuals.length).toBeGreaterThan(0);
});

function companionBattle(mode: CompanionMode) {
  const { adventure, state } = startedAdventure(),
    recruit = state.view.map[0][0];
  recruit.kind = "recruit";
  let next = adventure.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: recruit.id },
  });
  const offer = next.view.companionOffers[0];
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: offer.id },
  });
  next.view.companions[0].mode = mode;
  next.view.companions[0].battlesLeft = 1;
  next.view.companions[0].hp = 1;
  const battle = mapChoices(next.view)[0];
  battle.kind = "battle";
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: battle.id },
  });
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: { type: "toggle-companion", enabled: true },
  });
  next.view.combat.heroes[0].hp -= 10;
  next.view.combat.metrics.healthLost += 40;
  next.view.combat.enemies[0].hp = 1;
  next.view.combat.enemies[0].block = 0;
  next.view.combat.heroes[0].hand = [
    { id: "companion-finisher", card: "strike", upgradeLevel: 0 },
  ];
  next.view.combat.heroes[0].energy = 3;
  next = adventure.apply(next, 0, {
    type: "expedition-action",
    move: {
      type: "card",
      instance: "companion-finisher",
      target: { side: "enemy", index: 0 },
    },
  });
  return next;
}

it("三种 AI 队友分别执行永久死亡、限次离队与战后复活规则", () => {
  const fragile = companionBattle("fragile").view.companions[0];
  expect(fragile).toMatchObject({ active: false, dead: true });

  const limitedState = companionBattle("limited");
  expect(limitedState.view.companions[0]).toMatchObject({
    active: false,
    dead: true,
  });
  expect(limitedState.view.combat.heroes[0].hp).toBeGreaterThan(
    limitedState.view.combat.heroes[0].maxHp - 10,
  );

  const eternal = companionBattle("eternal").view.companions[0];
  expect(eternal).toMatchObject({ active: true, dead: false });
  expect(eternal.hp).toBeGreaterThan(0);
});

it("旧远征存档补齐结算、封店与队友字段", () => {
  const { state } = startedAdventure(),
    run = state.view as unknown as Record<string, unknown>;
  Reflect.deleteProperty(run, "shopsSealed");
  Reflect.deleteProperty(run, "shopRaidActive");
  Reflect.deleteProperty(run, "companions");
  Reflect.deleteProperty(run, "companionOffers");
  Reflect.deleteProperty(run, "companionBattle");
  Reflect.deleteProperty(run, "nodeStart");
  Reflect.deleteProperty(run, "lastNodeResult");
  migrateExpedition(state.view);
  expect(state.view).toMatchObject({
    shopsSealed: false,
    shopRaidActive: false,
    shopRaidFailed: false,
    shopRaidDeadlineRound: null,
    stats: { nodesVisited: 0, battlesWon: 0, cardsPlayed: [0] },
    companions: [],
    companionOffers: [],
    companionBattle: null,
    nodeStart: null,
    lastNodeResult: null,
  });
});

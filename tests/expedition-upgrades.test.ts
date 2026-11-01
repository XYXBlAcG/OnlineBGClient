import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { allCards, ExpeditionRules } from "../src/domain/expedition/rules";
import {
  canUpgrade,
  definition,
  maxUpgradeLevel,
  type CardInstance,
} from "../src/domain/expedition/content";
import { cardComparison } from "../src/client/expedition/presentation";
import { Room } from "../src/domain/room";

it("同一张牌可反复强化五次，预览与实际执行使用相同等级", () => {
  const rules = new ExpeditionAdventure();
  let state = rules.create(1);
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "profession", profession: 0 },
  });
  const id = allCards(state.view.combat.heroes[0]).find(
    (card) => card.card === "strike",
  )!.id;
  for (let level = 1; level <= maxUpgradeLevel; level++) {
    state.view.phase = "recovery";
    state.view.nodeReady = [false];
    state.view.pending = [[{ kind: "upgrade", left: 1 }]];
    const before = allCards(state.view.combat.heroes[0]).find(
      (card) => card.id === id,
    )!;
    const preview = cardComparison(before);
    state = rules.apply(state, 0, {
      type: "expedition-action",
      move: { type: "upgrade", instance: id },
    });
    const after = allCards(state.view.combat.heroes[0]).find(
      (card) => card.id === id,
    )!;
    expect(after.upgradeLevel).toBe(level);
    expect(definition(after)).toEqual(definition(preview.upgraded));
    expect(definition(after).effects[0].amount).toBe(6 + level * 3);
    expect(before.upgradeLevel).toBe(level - 1);
  }
  state.view.phase = "camp";
  state.view.nodeReady = [false];
  expect(
    rules
      .candidates(state, 0)
      .some(
        (c) =>
          c.action.type === "expedition-action" &&
          c.action.move.type === "upgrade" &&
          c.action.move.instance === id,
      ),
  ).toBe(false);
  expect(() =>
    rules.apply(state, 0, {
      type: "expedition-action",
      move: { type: "upgrade", instance: id },
    }),
  ).toThrow();
});

it("资源牌强化有限，无法强化的牌不收取无效升级", () => {
  const card: CardInstance = {
    id: "test",
    card: "alchemy_renew",
    upgradeLevel: maxUpgradeLevel,
  };
  expect(
    definition(card).effects.find((e) => e.kind === "energy")!.amount,
  ).toBe(2);
  expect(definition(card).effects.find((e) => e.kind === "draw")!.amount).toBe(
    6,
  );
  expect(canUpgrade(card)).toBe(false);
  expect(definition({ ...card, upgradeLevel: 1 }).effects).toEqual([
    { kind: "draw", amount: 4 },
    { kind: "energy", amount: 2 },
  ]);
});

it("多级强化后的实际伤害与牌面一致，卡牌实例始终保留", () => {
  const rules = new ExpeditionRules();
  let state = rules.create("upgraded-combat", [0]);
  const card: CardInstance = { id: "multi", card: "strike", upgradeLevel: 4 };
  state.heroes[0].hand = [card];
  state.enemies[0].hp = state.enemies[0].maxHp = 100;
  const hp = state.enemies[0].hp;
  state = rules.apply(state, {
    type: "play",
    actor: 0,
    instance: card.id,
    target: { side: "enemy", index: 0 },
  });
  expect(hp - state.enemies[0].hp).toBe(definition(card).effects[0].amount);
  expect(allCards(state.heroes[0]).find((c) => c.id === card.id)).toEqual(card);
});

it("旧房间检查点恢复时一次迁移布尔升级，原始存档保持不变", () => {
  const room = new Room("upgrade-save", {
    kind: "expedition",
    humans: 1,
    ai: [],
    team: false,
    training: false,
  });
  const token = room.claim("甲");
  room.start(token);
  const archive = room.export();
  if (archive.checkpoint?.state.kind !== "expedition")
    throw new Error("missing checkpoint");
  const savedRun = archive.checkpoint.state.view as unknown as Record<
    string,
    unknown
  >;
  for (const field of [
    "campaignVersion",
    "chapter",
    "history",
    "luck",
    "rerolls",
    "eventRerolls",
  ])
    delete savedRun[field];
  delete archive.replay!.expeditionCampaign;
  const hero = archive.checkpoint.state.view.combat.heroes[0];
  const card = allCards(hero)[0] as unknown as Record<string, unknown>;
  delete card.upgradeLevel;
  card.upgraded = true;
  const original = structuredClone(archive);
  const restored = Room.restore(archive);
  if (restored.state?.kind !== "expedition")
    throw new Error("missing restored state");
  const upgraded = allCards(restored.state.view.combat.heroes[0]).find(
    (c) => c.id === card.id,
  )!;
  expect(restored.state.view.campaignVersion).toBe(1);
  expect(restored.state.view.chapter).toBe(0);
  expect(upgraded.upgradeLevel).toBe(1);
  expect(upgraded).not.toHaveProperty("upgraded");
  expect(archive).toEqual(original);
});

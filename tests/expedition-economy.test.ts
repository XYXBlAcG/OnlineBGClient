import { it, expect } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import type {
  ExpeditionGameState,
  NodeKind,
  ExpeditionMove,
} from "../src/domain/expedition/adventure-types";
import { allCards, ExpeditionRules } from "../src/domain/expedition/rules";
import { cards, type CardId } from "../src/domain/expedition/content";
const rules = new ExpeditionAdventure();
function apply(
  state: ExpeditionGameState,
  actor: number,
  move: ExpeditionMove,
) {
  return rules.apply(state, actor, { type: "expedition-action", move });
}
function atNode(kind: NodeKind, count = 2) {
  let state = rules.create(count);
  for (let actor = 0; actor < count; actor++)
    state = apply(state, actor, { type: "profession", profession: actor % 3 });
  state.view.map[0][0].kind = kind;
  for (let actor = 0; actor < count; actor++)
    state = apply(state, actor, { type: "vote", choice: "f0-0" });
  return state;
}
it("商店购买扣本人金币并只获得一次；其他玩家行装不变化", () => {
  const before = atNode("shop");
  before.view.combat.heroes[0].gold = 300;
  const item = before.view.shop[0].find((i) => i.kind === "card")!;
  const after = apply(before, 0, { type: "buy", item: item.id });
  expect(after.view.combat.heroes[0].gold).toBe(300 - item.price);
  expect(allCards(after.view.combat.heroes[0])).toHaveLength(11);
  expect(after.view.combat.heroes[1]).toEqual(before.view.combat.heroes[1]);
  expect(() => apply(after, 0, { type: "buy", item: item.id })).toThrow();
  expect(before.view.shop[0][0].sold).toBe(false);
});
it("营地升级、移除、休息互斥且全员完成才离开", () => {
  let state = atNode("camp");
  const id = allCards(state.view.combat.heroes[0])[0].id;
  state = apply(state, 0, { type: "upgrade", instance: id });
  expect(
    allCards(state.view.combat.heroes[0]).find((c) => c.id === id)?.upgraded,
  ).toBe(true);
  expect(state.view.phase).toBe("camp");
  expect(() => apply(state, 0, { type: "rest" })).toThrow();
  state = apply(state, 1, { type: "rest" });
  expect(state.view.phase).toBe("map");
});
it("共享遗物先票选再分配，仅有持有人获得；平票由轮值领队裁决", () => {
  let state = atNode("treasure");
  const a = state.view.treasure.find((id) =>
      state.view.combat.heroes.every((h) => !h.relics.includes(id)),
    )!,
    b = state.view.treasure.find((id) => id !== a)!;
  state = apply(state, 0, { type: "vote", choice: a });
  state = apply(state, 1, { type: "vote", choice: b });
  expect(state.view.phase).toBe("tie");
  expect(() => apply(state, 1, { type: "tie", choice: a })).toThrow();
  state = apply(state, 0, { type: "tie", choice: a });
  expect(state.view.phase).toBe("holder");
  state = apply(state, 0, { type: "vote", choice: "1" });
  state = apply(state, 1, { type: "vote", choice: "1" });
  expect(state.view.phase).toBe("map");
  expect(
    state.view.combat.heroes.filter((h) => h.relics.includes(a)),
  ).toHaveLength(1);
});
it("全部 66 张卡牌及升级版通过同一个执行器产生有限数值且守恒实例", () => {
  const combat = new ExpeditionRules();
  for (const card of Object.keys(cards) as CardId[])
    for (const upgraded of [false, true]) {
      let state = combat.create("all-effects", [0, 1, 2]);
      state.heroes[0].hand = [{ id: "test-card", card, upgraded }];
      state.heroes[0].energy = 10;
      const action = combat
        .candidates(state, 0)
        .find((a) => a.type === "play")!;
      expect(action, card).toBeDefined();
      state = combat.apply(state, action);
      expect(
        state.heroes.flatMap(allCards).filter((c) => c.id === "test-card"),
      ).toHaveLength(1);
      for (const fighter of [...state.heroes, ...state.enemies])
        expect(
          Object.values(fighter)
            .filter((v) => typeof v === "number")
            .every(Number.isFinite),
          card,
        ).toBe(true);
    }
});

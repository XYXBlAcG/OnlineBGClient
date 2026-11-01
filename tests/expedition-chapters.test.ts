import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { chapters } from "../src/domain/expedition/chapters";
import { generateMap, encounterFor } from "../src/domain/expedition/map";
import {
  expeditionMapSchema,
  type ExpeditionGameState,
  type ExpeditionMove,
} from "../src/domain/expedition/adventure-types";
import { allCards, ExpeditionRules } from "../src/domain/expedition/rules";

const rules = new ExpeditionAdventure();
const apply = (
  state: ExpeditionGameState,
  actor: number,
  move: ExpeditionMove,
) => rules.apply(state, actor, { type: "expedition-action", move });

it("前三主题地图随着层数变复杂，所有分支都连接下一行并可到达唯一首领", () => {
  expect(chapters).toHaveLength(3);
  for (let seed = 0; seed < 10000; seed++)
    for (let chapter = 0; chapter < chapters.length; chapter++) {
      const map = generateMap(String(seed), 2, chapter);
      expect(expeditionMapSchema.safeParse(map).success).toBe(true);
      expect(map.length).toBe(chapters[chapter].depth);
      let reachable = new Set(map[0].map((n) => n.id));
      for (let row = 1; row < map.length; row++) {
        reachable = new Set(
          map[row - 1]
            .filter((n) => reachable.has(n.id))
            .flatMap((n) => n.next),
        );
        expect(map[row].every((n) => reachable.has(n.id))).toBe(true);
      }
      expect(map.at(-1)).toHaveLength(1);
      expect(map.at(-1)![0].kind).toBe("boss");
      if (chapter > 0) expect(map.some((row) => row.length > 6)).toBe(true);
    }
}, 120000);

it("击败首领先进入个人奖励，全员准备后才切层，保留牌组、房间内远征身份及行装", () => {
  let state = rules.create(2);
  for (let actor = 0; actor < 2; actor++)
    state = apply(state, actor, { type: "profession", profession: actor });
  const boss = state.view.map.at(-1)![0];
  state.view.current = boss.id;
  state.view.floor = boss.floor;
  state.view.path = [boss.id];
  state.view.phase = "battle";
  state.view.combat = new ExpeditionRules().begin(
    state.view.combat,
    encounterFor(state.view, boss),
  );
  state.view.combat.enemies.forEach((enemy) => (enemy.hp = 1));
  state.view.combat.heroes[0].hand = [
    { id: "boss-finisher", card: "sweep", upgradeLevel: 0 },
  ];
  state = apply(state, 0, { type: "card", instance: "boss-finisher" });
  expect(state.view.phase).toBe("reward");
  const runId = state.view.runId;
  const ids = state.view.combat.heroes
    .map(allCards)
    .map((pile) => pile.map((c) => c.id).sort());
  state = apply(state, 0, { type: "reward", choice: "skip" });
  expect(state.view.phase).toBe("reward");
  state = apply(state, 1, { type: "reward", choice: "skip" });
  expect(state.view.phase).toBe("waystation");
  state.view.combat.heroes[0].hp = 0;
  const hp = (state.view.combat.heroes[1].hp = 10);
  state = apply(state, 0, { type: "advance", choice: "supplies" });
  expect(state.view.chapter).toBe(0);
  state = apply(state, 1, { type: "advance", choice: "supplies" });
  expect(state.view.chapter).toBe(1);
  expect(state.view.phase).toBe("map");
  expect(state.view.runId).toBe(runId);
  expect(state.view.current).toBeNull();
  expect(state.view.history).toHaveLength(1);
  expect(
    state.view.combat.heroes
      .map(allCards)
      .map((pile) => pile.map((c) => c.id).sort()),
  ).toEqual(ids);
  expect(state.view.combat.heroes[0].hp).toBe(
    Math.ceil(state.view.combat.heroes[0].maxHp * 0.3),
  );
  expect(state.view.combat.heroes[1].hp).toBe(
    hp + Math.ceil((state.view.combat.heroes[1].maxHp - hp) * 0.3),
  );
  expect(() =>
    apply(state, 1, { type: "advance", choice: "supplies" }),
  ).toThrow();
});

it("个人奖励重选只花本人的筹码；全队一致才重选奇遇", () => {
  let state = rules.create(2);
  for (let actor = 0; actor < 2; actor++)
    state = apply(state, actor, { type: "profession", profession: actor });
  state.view.phase = "reward";
  state.view.offers = [
    ["bash", "shield", "sweep"],
    ["mark", "venom", "volley"],
  ];
  state.view.nodeReady = [false, false];
  const original = [...state.view.offers[0]];
  state = apply(state, 0, { type: "reroll" });
  expect(state.view.luck).toEqual([0, 1]);
  expect(state.view.offers[0].every((card) => !original.includes(card))).toBe(
    true,
  );
  expect(state.view.offers[1]).toEqual(["mark", "venom", "volley"]);
  expect(() => apply(state, 0, { type: "reroll" })).toThrow();
  state.view.phase = "event";
  state.view.event = "spring";
  state.view.luck = [1, 1];
  state.view.votes = {};
  state = apply(state, 0, { type: "vote", choice: "reroll" });
  expect(state.view.luck).toEqual([1, 1]);
  expect(state.view.event).toBe("spring");
  state = apply(state, 1, { type: "vote", choice: "reroll" });
  expect(state.view.luck).toEqual([0, 0]);
  expect(state.view.event).not.toBe("spring");
  expect(state.view.phase).toBe("event");
});

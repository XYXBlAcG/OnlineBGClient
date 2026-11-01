import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { observerSeats } from "../src/domain/party";
function table() {
  const room = new Room("party", {
    kind: "scmj",
    humans: 4,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = ["甲", "乙", "丙", "丁"].map((n) => room.claim(n));
  tokens.slice(1).forEach((t) => room.setReady(t, true));
  room.start(tokens[0]);
  return { room, tokens };
}
it("房主开启派对，积分扣除幂等，雨伞反弹一次且不改变游戏版本或牌局", () => {
  const { room, tokens } = table();
  expect(() =>
    room.partyAction(tokens[1], "enable", { type: "enabled", enabled: true }),
  ).toThrow("房主");
  room.partyAction(tokens[0], "enable", { type: "enabled", enabled: true });
  const before = structuredClone(room.state),
    version = room.version;
  room.partyAction(
    tokens[1],
    "shield",
    { type: "buy", item: "umbrella", target: 1 },
    10000,
  );
  const event = room.partyAction(
    tokens[0],
    "throw",
    { type: "buy", item: "giantSlipper", target: 1 },
    10000,
  );
  expect(event).toMatchObject({
    from: room.seats[1].id,
    target: room.seats[0].id,
    item: "giantSlipper",
  });
  expect(
    room.partyAction(
      tokens[0],
      "throw",
      { type: "buy", item: "giantSlipper", target: 1 },
      10000,
    ),
  ).toBeUndefined();
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    85,
  );
  expect(
    room.snapshot(tokens[0]).party.balances[room.seats[1].id!].shield,
  ).toBe(false);
  expect(room.version).toBe(version);
  expect(room.state).toEqual(before);
  const restored = Room.restore(room.export());
  expect(restored.snapshot(tokens[0]).party.balances).toEqual(
    room.snapshot(tokens[0]).party.balances,
  );
});
it("已离场者可助威和支持，仍在场者不能冒充旁观者，禁止给自己或其他离场者助威", () => {
  const { room, tokens } = table();
  room.partyAction(tokens[0], "enable", { type: "enabled", enabled: true });
  if (room.state!.kind !== "scmj") throw Error();
  room.state!.view.wins.push({
    player: 0,
    from: 1,
    tile: 0,
    fan: 1,
    labels: [],
    value: 2,
  });
  expect(observerSeats(room.state!, 4)).toEqual([0]);
  expect(room.snapshot(tokens[0]).party.observers).toEqual([0]);
  expect(() =>
    room.partyAction(tokens[1], "cheat", { type: "support", target: 2 }),
  ).toThrow("旁观");
  expect(() =>
    room.partyAction(tokens[0], "self", { type: "support", target: 0 }),
  ).toThrow("场上");
  room.partyAction(tokens[0], "support", { type: "support", target: 2 });
  expect(() =>
    room.partyAction(tokens[0], "again", { type: "support", target: 3 }),
  ).toThrow("支持");
  expect(
    room.partyAction(
      tokens[0],
      "cheer",
      { type: "buy", item: "cheer", target: 2 },
      10000,
    ),
  ).toMatchObject({ item: "cheer", target: room.seats[2].id });
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    100,
  );
});
it("自然结束发放一次参与奖励，重载不重复发币，手动结束不发币", () => {
  const { room, tokens } = table();
  room.partyAction(tokens[0], "enable", { type: "enabled", enabled: true });
  if (room.state!.kind !== "scmj") throw Error();
  room.state!.view.phase = "finished";
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    100,
  );
  room.tickParty();
  const a = room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins;
  expect(a).toBe(160);
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    a,
  );
  expect(
    Room.restore(room.export()).snapshot(tokens[0]).party.balances[
      room.seats[0].id!
    ].coins,
  ).toBe(a);
  const other = table();
  other.room.partyAction(other.tokens[0], "enable", {
    type: "enabled",
    enabled: true,
  });
  other.room.end(other.tokens[0]);
  expect(
    other.room.snapshot(other.tokens[0]).party.balances[other.room.seats[0].id!]
      .coins,
  ).toBe(100);
});
it("未开启时不允许消费，关闭后余额保留且不能透支", () => {
  const { room, tokens } = table();
  expect(() =>
    room.partyAction(tokens[0], "off", {
      type: "buy",
      item: "giantSlipper",
      target: 1,
    }),
  ).toThrow("未开启");
  room.partyAction(tokens[0], "enable", { type: "enabled", enabled: true });
  for (let i = 0; i < 6; i++)
    room.partyAction(
      tokens[0],
      `buy${i}`,
      { type: "buy", item: "giantSlipper", target: 1 },
      10000 + i * 2100,
    );
  expect(() =>
    room.partyAction(
      tokens[0],
      "poor",
      { type: "buy", item: "giantSlipper", target: 1 },
      30000,
    ),
  ).toThrow("不足");
  room.partyAction(tokens[0], "disable", { type: "enabled", enabled: false });
  room.partyAction(tokens[0], "reenable", { type: "enabled", enabled: true });
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    10,
  );
});
it("付费道具不能从免费互动接口绕过扣币", () => {
  const { room, tokens } = table();
  expect(() =>
    room.interact(tokens[0], "bypass", 1, "giantSlipper" as never),
  ).toThrow("购买");
});
it("各类牌桌只把真正完成或阵亡者列为旁观者，选将与等回合不是旁观", async () => {
  const { GameEngine } = await import("../src/domain/engine");
  const engine = new GameEngine();
  for (const kind of ["uno", "sgs", "scmj", "tq", "fxq", "graphwar"] as const) {
    const state = engine.create(kind, kind === "scmj" ? 4 : 3, "observer");
    expect(observerSeats(state, kind === "scmj" ? 4 : 3)).toEqual([]);
    switch (state.kind) {
      case "uno":
        state.view.playerFinish[1] = 1;
        break;
      case "sgs":
        state.view.stage = 0;
        state.view.eventStack = [];
        state.view.alivePlayerIds = state.view.alivePlayerIds.filter(
          (i) => i !== 1,
        );
        break;
      case "scmj":
        state.view.wins.push({
          player: 1,
          from: 2,
          tile: 0,
          fan: 1,
          labels: [],
          value: 2,
        });
        break;
      case "tq":
        state.view.winnerId.push(1);
        break;
      case "fxq":
        state.view.winners.push(1);
        break;
      case "graphwar":
        state.view.soldiers
          .filter((s) => s.player === 1)
          .forEach((s) => (s.hp = 0));
        break;
    }
    expect(observerSeats(state, kind === "scmj" ? 4 : 3)).toEqual([1]);
  }
});
it("本局颁奖在下一局结算一次，跨局保留余额并清除反弹伞与支持票", () => {
  const { room, tokens } = table();
  room.partyAction(tokens[0], "enable", { type: "enabled", enabled: true });
  if (room.state!.kind !== "scmj") throw Error();
  room.state!.view.phase = "finished";
  room.partyAction(tokens[1], "award", {
    type: "award",
    target: 0,
    title: "teammate",
  });
  expect(() =>
    room.partyAction(tokens[1], "award2", {
      type: "award",
      target: 2,
      title: "comic",
    }),
  ).toThrow("已经颁奖");
  room.start(tokens[0]);
  const party = room.snapshot(tokens[0]).party;
  expect(party.balances[room.seats[0].id!].coins).toBe(170);
  expect(party.awards).toEqual({});
  expect(party.support).toEqual({});
  expect(room.snapshot(tokens[0]).party.balances[room.seats[0].id!].coins).toBe(
    170,
  );
});
it("Graphwar 派对特效锚定地图士兵，而不是底部玩家按钮", () => {
  const room = new Room("anchors", {
    kind: "graphwar",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  room.partyAction(a, "enable", { type: "enabled", enabled: true });
  const event = room.partyAction(a, "throw", {
    type: "buy",
    item: "giantSlipper",
    target: 1,
  });
  expect(event?.units?.game).toBe("graphwar");
  if (room.state!.kind !== "graphwar") throw Error();
  expect(
    room.state!.view.soldiers.find((s) => s.id === event!.units!.from)?.player,
  ).toBe(0);
  expect(
    room.state!.view.soldiers.find((s) => s.id === event!.units!.target)
      ?.player,
  ).toBe(1);
});

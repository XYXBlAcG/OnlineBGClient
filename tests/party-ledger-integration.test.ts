import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
function table() {
  const room = new Room("expansion", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    party: { enabled: true, unlockAll: true },
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  const x = room.watch("观众甲"),
    y = room.watch("观众乙");
  return { room, a, b, x, y };
}
it("真实观众盘口锁盘与结算，重载不重复发奖，持币本金不计入累计收入", () => {
  const { room, a, x, y } = table();
  room.tickParty();
  const market = room.snapshot(x).party.markets[0],
    ids = room.snapshot(x).seats.map((s) => s.id),
    sx = room.snapshot(x).spectators![0].id,
    sy = room.snapshot(y).spectators![1].id;
  room.partyAction(x, "x", {
    type: "bet",
    market: market.id,
    option: ids[0],
    amount: 20,
  });
  room.partyAction(y, "y", {
    type: "bet",
    market: market.id,
    option: ids[1],
    amount: 50,
  });
  room.tickParty(market.closesAt);
  if (room.state?.kind !== "uno") throw Error();
  room.state.view.playerFinish[0] = 1;
  room.state.view.isEnd = true;
  room.tickParty(market.closesAt + 1);
  const party = room.snapshot(x).party;
  expect(party.markets[0].payouts).toEqual({ [sx]: 84 });
  expect(party.balances[sx]).toMatchObject({ coins: 204, earned: 104 });
  expect(party.balances[sy]).toMatchObject({ coins: 90, earned: 40 });
  const restored = Room.restore(room.export());
  expect(restored.snapshot(x).party.balances).toEqual(party.balances);
  expect(room.snapshot(a).version).toBe(restored.snapshot(a).version);
});
it("开放盘口重启退款，锁定盘口保留；手动结束仅退本金", () => {
  const { room, x, y, a } = table();
  room.tickParty();
  const m = room.snapshot(x).party.markets[0],
    id = room.snapshot(x).spectators![0].id;
  room.partyAction(x, "bet", {
    type: "bet",
    market: m.id,
    option: m.options[0],
    amount: 20,
  });
  const restored = Room.restore(room.export());
  expect(restored.snapshot(x).party.balances[id]).toMatchObject({
    coins: 100,
    earned: 0,
  });
  room.partyAction(y, "bet", {
    type: "bet",
    market: m.id,
    option: m.options[1],
    amount: 20,
  });
  room.tickParty(m.closesAt);
  const locked = Room.restore(room.export());
  expect(locked.snapshot(x).party.markets[0].status).toBe("locked");
  room.end(a);
  expect(room.snapshot(x).party.balances[id]).toMatchObject({
    coins: 100,
    earned: 0,
  });
});
it("已付费十秒演出排队而非截断；取消排队返还实际成交价；活跃演出保留", () => {
  const { room, a } = table(),
    time = Date.now();
  for (let i = 0; i < 5; i++)
    room.partyAction(
      a,
      `egg${i}`,
      { type: "buy", item: "cometEgg", target: 1 },
      time + i * 2100,
    );
  const party = room.snapshot(a).party;
  expect(party.events).toHaveLength(5);
  expect(party.events[3].time).toBe(time + 10000);
  room.partyAction(a, "off", { type: "enabled", enabled: false }, time + 8500);
  const after = room.snapshot(a).party,
    id = room.seats[0].id!;
  expect(after.events).toHaveLength(3);
  expect(after.balances[id].coins).toBe(70);
  expect(after.events[0].duration).toBe(10000);
});
it("真实观众抢币活动：金币不重复拾取，最低参与人数、退款和奖池补贴", () => {
  const { room, a, x, y } = table(),
    time = Date.now();
  room.partyAction(
    a,
    "grab",
    { type: "buy", item: "coinGrab", target: 0 },
    time,
  );
  const game = room.snapshot(x).party.minigames[0];
  room.partyAction(
    x,
    "joinx",
    { type: "minigame", game: game.id, operation: "join", value: "" },
    time + 1,
  );
  room.partyAction(
    y,
    "joiny",
    { type: "minigame", game: game.id, operation: "join", value: "" },
    time + 1,
  );
  room.partyAction(
    x,
    "coin",
    { type: "minigame", game: game.id, operation: "collect", value: "0" },
    time + 2,
  );
  expect(() =>
    room.partyAction(
      y,
      "duplicate",
      { type: "minigame", game: game.id, operation: "collect", value: "0" },
      time + 3,
    ),
  ).toThrow("拾取");
  room.partyAction(
    y,
    "coin2",
    { type: "minigame", game: game.id, operation: "collect", value: "1" },
    time + 3,
  );
  room.tickParty(game.closesAt);
  const party = room.snapshot(a).party;
  expect(party.minigames[0].status).toBe("won");
  expect(party.balances[room.snapshot(x).spectators![0].id].coins).toBe(130);
  expect(party.balances[room.snapshot(y).spectators![1].id].coins).toBe(130);
  expect(party.balances[room.seats[0].id!].coins).toBe(50);
});
it("装扮只对当前游戏装备一次，过局指令不扣币，装备与财富跨局边界明确", () => {
  const { room, a } = table(),
    time = Date.now();
  room.partyAction(
    a,
    "aura",
    { type: "buy", item: "unoNeon", target: 0 },
    time,
  );
  expect(() =>
    room.partyAction(
      a,
      "duplicate",
      { type: "buy", item: "unoNeon", target: 0 },
      time + 2100,
    ),
  ).toThrow("装备");
  expect(() =>
    room.partyAction(
      a,
      "wrong-game",
      { type: "buy", item: "sgsSlash", target: 0 },
      time + 2100,
    ),
  ).toThrow("不适用");
  expect(() =>
    room.partyAction(
      a,
      "old",
      { type: "buy", item: "cometEgg", target: 1, round: "obsolete" },
      time + 2100,
    ),
  ).toThrow("上一局");
  expect(room.snapshot(a).party.balances[room.seats[0].id!].coins).toBe(60);
  room.end(a);
  room.start(a);
  expect(room.snapshot(a).party.balances[room.seats[0].id!].auras).toEqual([]);
});

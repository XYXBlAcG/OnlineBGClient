import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { preparePartyPurchase } from "../src/client/party/purchase";
import type { PartyContext } from "../src/domain/party";
it("浏览选择只生成草稿，不发射或扣币；确认动作才消费一次，支持全桌与指定玩家", () => {
  const room = new Room("select", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      party: { enabled: true },
    }),
    a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  const snapshot = room.snapshot(a),
    context: PartyContext = {
      players: snapshot.seats.map((s) => ({
        id: s.id,
        name: s.name,
        human: true,
      })),
      round: snapshot.party.round,
      playing: true,
      finished: false,
      observers: [],
      state: snapshot.state,
    };
  const selected = preparePartyPurchase(
    { type: "builtin", item: "cometEgg" },
    snapshot,
    context,
    0,
    "table",
    false,
  )!;
  expect(selected.action).toMatchObject({ type: "buy", target: "table" });
  expect(selected.duration).toBe(10000);
  expect(room.snapshot(a).party.events).toHaveLength(0);
  expect(room.snapshot(a).party.balances[snapshot.seats[0].id].coins).toBe(100);
  const individual = preparePartyPurchase(
    { type: "builtin", item: "cometEgg" },
    snapshot,
    context,
    0,
    snapshot.seats[1].id,
    false,
  )!;
  expect(individual.action).toMatchObject({ target: 1 });
  room.partyAction(a, "confirm", selected.action);
  room.partyAction(a, "confirm", selected.action);
  expect(room.snapshot(a).party.events).toHaveLength(1);
  expect(room.snapshot(a).party.balances[snapshot.seats[0].id].coins).toBe(90);
});

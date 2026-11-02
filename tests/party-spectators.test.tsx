import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, beforeEach, afterEach, vi } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
import { gameKinds, gameCatalogue } from "../src/domain/catalogue";
beforeEach(() =>
  vi.stubGlobal("document", {
    createElement: () => ({ setAttribute: () => {}, clientWidth: 16 }),
    body: { appendChild: () => {}, removeChild: () => {} },
  }),
);
afterEach(() => vi.unstubAllGlobals());
it("独立观众不占席位，不能管理或出牌，可在对局中加入、退出并重连", () => {
  const room = new Room("watch", {
    kind: "uno",
    humans: 2,
    ai: [],
    team: false,
    training: false,
    party: { enabled: true },
  });
  const a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  const token = room.watch("观众");
  expect(room.seats).toHaveLength(2);
  expect(room.canManage(token)).toBe(false);
  const view = room.snapshot(token);
  expect(view.actor).toBeLessThan(-1);
  expect(view.party.balances[view.spectators![0].id].coins).toBe(30);
  if (view.state?.kind !== "uno") throw Error();
  expect(view.state.view.playerCards.flat().every((c) => c < 0)).toBe(true);
  expect(() =>
    room.act(token, "bad", room.version, { type: "uno-draw" }),
  ).toThrow();
  room.chat(token, "hi", "观战中");
  expect(room.snapshot(a).chat.at(-1)?.text).toBe("观战中");
  room.disconnect(token);
  room.claim("", token);
  expect(room.snapshot(token).spectators?.[0].online).toBe(true);
  const restored = Room.restore(room.export());
  expect(restored.claim("", token)).toBe(token);
  expect(restored.canManage(token)).toBe(false);
  room.leave(token);
  expect(() => room.snapshot(token)).toThrow();
});
it.each(gameKinds)("%s 的公共旁观投影可渲染且不提供游戏操作", (kind) => {
  const humans = gameCatalogue[kind].minPlayers;
  const room = new Room("watch", {
    kind,
    humans,
    ai: [],
    team: false,
    training: false,
  });
  const tokens = Array.from({ length: humans }, (_, i) =>
    room.claim(`玩家${i}`),
  );
  tokens.slice(1).forEach((t) => room.setReady(t, true));
  room.start(tokens[0]);
  const token = room.watch("旁观");
  const snapshot = room.snapshot(token);
  expect(snapshot.candidates).toEqual([]);
  expect(() =>
    renderToStaticMarkup(
      <OriginalGame
        snapshot={snapshot}
        act={() => {
          throw Error("不可操作");
        }}
        end={() => {}}
      />,
    ),
  ).not.toThrow();
});

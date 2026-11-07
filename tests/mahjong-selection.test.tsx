import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { SichuanTable } from "../src/client/mahjong/SichuanTable";
import { MahjongOptionsControl } from "../src/client/mahjong/MahjongOptionsControl";

it("换三张阶段自己的手牌始终可点击选择", () => {
  const room = new Room(
      "mahjong-selection",
      { kind: "scmj", humans: 4, ai: [], team: false, training: false },
      "mahjong-selection",
    ),
    tokens = [0, 1, 2, 3].map((index) => room.claim(`玩家${index}`));
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  const snapshot = room.snapshot(tokens[0]),
    html = renderToStaticMarkup(
      <SichuanTable
        snapshot={snapshot}
        act={() => {}}
        replay={false}
        avatar={{ snapshot, replay: false }}
      />,
    ),
    tiles = html.match(/<button[^>]*class="scmj-tile[^"]*"[^>]*>/g) ?? [];
  expect(tiles).toHaveLength(14);
  expect(tiles.every((tile) => !tile.includes("disabled"))).toBe(true);
});

it("日本立直作为第三种麻将模式提供隐藏手牌牌桌", () => {
  const options = renderToStaticMarkup(
    <MahjongOptionsControl
      value={{ mode: "riichi", cap: 3, selfDraw: "base" }}
      onChange={() => {}}
    />,
  );
  expect(options).toContain("日本立直");
  const room = new Room(
      "mahjong-riichi",
      {
        kind: "scmj",
        humans: 4,
        ai: [],
        team: false,
        training: false,
        mahjong: { mode: "riichi", cap: 3, selfDraw: "base" },
      },
      "mahjong-riichi",
    ),
    tokens = [0, 1, 2, 3].map((index) => room.claim(`玩家${index}`));
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  const snapshot = room.snapshot(tokens[0]),
    html = renderToStaticMarkup(
      <SichuanTable
        snapshot={snapshot}
        act={() => {}}
        replay={false}
        avatar={{ snapshot, replay: false }}
      />,
    );
  expect(html).toContain("日本立直");
  expect(html).toContain("scmj-hidden-hand");
  expect(html).not.toContain("定缺：");
});

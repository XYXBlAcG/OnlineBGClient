import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
it("renders a themed Dominion table, card details and live legal actions without leaking opposing hands", () => {
  const room = new Room("dominion-table", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  const html = renderToStaticMarkup(
    <OriginalGame
      snapshot={room.snapshot(first)}
      act={() => {}}
      end={() => {}}
    />,
  );
  expect(html).toContain('aria-label="领土牌桌"');
  expect(html).toContain('data-guide-target="dominion.supply"');
  expect(html).toContain("打出全部财宝");
  expect(html).toContain("民兵");
  const replay = renderToStaticMarkup(
    <OriginalGame
      snapshot={room.snapshot(first)}
      act={() => {}}
      end={() => {}}
      replay
    />,
  );
  expect(replay).not.toContain("结束游戏");
  expect(replay).not.toContain("打出全部财宝");
});

it("limits hand effects and supply gains to their respective card surfaces", () => {
  const room = new Room("dom-surfaces", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("甲"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  const snapshot = room.snapshot(first);
  if (snapshot.state?.kind !== "dominion") throw new Error("Wrong table");
  const view = snapshot.state.view;
  view.players[0].hand = ["village"];
  const render = () =>
    renderToStaticMarkup(
      <OriginalGame snapshot={snapshot} act={() => {}} end={() => {}} />,
    );
  view.prompt = {
    kind: "chapel",
    actor: 0,
    cards: ["village"],
    count: 0,
    title: "废除手牌",
  };
  const chapel = render();
  const villageCards = (html: string) =>
    [
      ...html.matchAll(
        /<article[^>]*data-card-id="village"[^>]*><button([^>]*)>/g,
      ),
    ].map((match) => match[1]);
  expect(villageCards(chapel)[0]).toContain("disabled");
  expect(villageCards(chapel).at(-1)).not.toContain("disabled");
  view.prompt = {
    kind: "gain",
    actor: 0,
    cards: [],
    limit: 4,
    title: "获得一张牌",
  };
  const gain = render();
  expect(villageCards(gain)[0]).not.toContain("disabled");
  expect(villageCards(gain).at(-1)).toContain("disabled");
  expect(gain).toContain("牌库与记录");
});
it("separates the circular avatar from the player summary and opts client tables into shared controls", () => {
  const room = new Room("dom-player-ui", {
    kind: "dominion",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const first = room.claim("名字应完整显示"),
    second = room.claim("乙");
  room.setReady(second, true);
  room.start(first);
  const html = renderToStaticMarkup(
    <OriginalGame
      snapshot={room.snapshot(first)}
      act={() => {}}
      end={() => {}}
    />,
  );
  expect(html).toContain('data-renderer="client"');
  expect(html).toContain('class="dominion-player-info"');
  expect(html).toContain('class="dominion-player-name">名字应完整显示');
  const avatar = html.match(
    /<button[^>]*data-game-avatar="0"[\s\S]*?<\/button>/,
  )?.[0];
  expect(avatar).toBeDefined();
  expect(avatar).not.toContain("game-avatar-name");
  expect(avatar).not.toContain("手牌");
});

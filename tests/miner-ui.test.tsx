import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { MinerTable } from "../src/client/miner/MinerTable";
import { toGameSnapshot } from "../src/client/game-snapshot";

it("renders the shared route map and HUD", () => {
  const room = new Room("miner-ui", {
    kind: "miner",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const host = room.claim("甲");
  const guest = room.claim("乙");
  room.setReady(guest, true);
  room.start(host);
  const snapshot = toGameSnapshot(room.snapshot(host));
  const html = renderToStaticMarkup(
    <MinerTable
      snapshot={snapshot}
      act={() => {}}
      pending={false}
      replay={false}
    />,
  );
  expect(html).toContain("黄金矿脉");
  expect(html).toContain("团队目标");
  expect(html).toContain("秘塔矿脉");
  expect(html).toContain("玩家 1");
  expect(html).toContain("玩家 2");
});

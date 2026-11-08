import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
it("正式远征使用职业、路线、场景和本人手牌，回放不提供出牌与结束游戏操作", () => {
  const room = new Room("exp-ui", {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
    }),
    token = room.claim("甲");
  room.start(token);
  const render = (replay = false) =>
    renderToStaticMarkup(
      <OriginalGame
        snapshot={room.snapshot(token)}
        act={() => {}}
        end={() => {}}
        replay={replay}
      />,
    );
  expect(render()).toContain("exp-health");
  expect(render()).toContain("exp-gold");
  expect(render()).toContain('data-guide-target="expedition.profession"');
  room.act(token, "class", room.version, {
    type: "expedition-action",
    move: { type: "profession", profession: 2 },
  });
  expect(render()).toContain('data-guide-target="expedition.map"');
  const mapSnapshot = room.snapshot(token),
    battleId =
      mapSnapshot.state?.kind === "expedition"
        ? mapSnapshot.state.view.map[0].find((node) => node.kind === "battle")!
            .id
        : "",
    battleAction = mapSnapshot.candidates.find(
      (candidate) =>
        candidate.action.type === "expedition-action" &&
        candidate.action.move.type === "vote" &&
        candidate.action.move.choice === battleId,
    )!.action;
  room.act(token, "map", room.version, battleAction);
  const html = render();
  expect(html).toContain('data-guide-target="expedition.hand"');
  expect(html).toContain('data-guide-target="expedition.scene"');
  expect(html).toContain("结束行动");
  expect(html).toContain('data-game-avatar="0"');
  expect(render(true)).not.toContain("结束游戏");
  expect(render(true)).not.toContain("结束行动 · E");
});

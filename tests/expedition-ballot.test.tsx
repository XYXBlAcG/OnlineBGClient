import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ballotOption, ballotPhase } from "../src/domain/expedition/ballot";
import { ExpeditionMap } from "../src/client/expedition/ExpeditionMap";
import { VoteStatus } from "../src/client/expedition/VoteStatus";

it("同类型节点使用地图相对位置区分，不向玩家暴露节点 id 或字母代号", () => {
  const run = new ExpeditionAdventure().create(2).view;
  run.map[0].forEach((node) => (node.kind = "camp"));
  expect(ballotOption(run, "map", run.map[0][0].id).label).toContain("左");
  expect(ballotOption(run, "map", run.map[0].at(-1)!.id).label).toContain("右");
  expect(
    new Set(run.map[0].map((node) => ballotOption(run, "map", node.id).label))
      .size,
  ).toBe(run.map[0].length);
});
it("平票保留原地图，逐人展示选择和未投票；观战没有确认按钮", () => {
  const run = new ExpeditionAdventure().create(3).view;
  run.phase = "tie";
  run.votePhase = "map";
  run.tieChoices = run.map[0].map((node) => node.id);
  run.votes = { 0: run.map[0][0].id, 1: run.map[0].at(-1)!.id };
  expect(ballotPhase(run)).toBe("map");
  const html = renderToStaticMarkup(
    <ExpeditionMap
      run={run}
      actor={-1}
      available={[]}
      names={["同名", "同名", "长名字"]}
      onVote={() => {}}
    />,
  );
  expect(html).toContain("exp-route-nodes");
  expect(html).toContain("领队");
  expect(html).not.toContain("确认前往");
  const status = renderToStaticMarkup(
    <VoteStatus run={run} names={["同名", "同名", "长名字"]} actor={0} />,
  );
  expect(status).toContain("未投票");
  expect(status).toContain("我的选择");
  expect(status.match(/data-voter=/g) || []).toHaveLength(3);
});
it("最终路线记录历史票箱，重连后仍能解释裁决结果", () => {
  const rules = new ExpeditionAdventure();
  let state = rules.create(2);
  for (let actor = 0; actor < 2; actor++)
    state = rules.apply(state, actor, {
      type: "expedition-action",
      move: { type: "profession", profession: actor },
    });
  const [a, b] = state.view.map[0];
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "vote", choice: a.id },
  });
  state = rules.apply(state, 1, {
    type: "expedition-action",
    move: { type: "vote", choice: b.id },
  });
  state = rules.apply(state, 0, {
    type: "expedition-action",
    move: { type: "tie", choice: a.id },
  });
  expect(state.view.lastBallot?.votes).toEqual({ 0: a.id, 1: b.id });
  expect(state.view.lastBallot?.label).toContain("战斗");
  expect(state.view.lastBallot?.choice).toBe(a.id);
  expect(state.view.votes).toEqual({});
});

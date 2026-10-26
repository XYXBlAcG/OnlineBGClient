import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionMap } from "../src/client/expedition/ExpeditionMap";
it("renders actual graph edges, an independently sized zoom surface, votes and a current-position control", () => {
  const state = new ExpeditionAdventure().create(2),
    run = state.view;
  run.votes[0] = run.map[0][0].id;
  const html = renderToStaticMarkup(
    <ExpeditionMap
      run={run}
      available={run.map[0].map((n) => n.id)}
      names={["甲", "乙"]}
      onVote={() => {}}
    />,
  );
  expect(html).toContain("当前位置");
  expect(html).not.toContain("当前士兵");
  expect(html).toContain("min-width:0");
  expect(html).toContain("甲已投票");
  expect((html.match(/<path /g) || []).length).toBe(
    run.map.flat().reduce((sum, n) => sum + n.next.length, 0),
  );
});

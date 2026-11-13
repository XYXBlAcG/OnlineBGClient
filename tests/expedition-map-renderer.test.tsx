import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionMap } from "../src/client/expedition/ExpeditionMap";
afterEach(() => vi.unstubAllGlobals());
it("renders actual graph edges, an independently sized zoom surface, votes and a current-position control", () => {
  const state = new ExpeditionAdventure().create(2),
    run = state.view;
  run.phase = "map";
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
  expect(html).not.toContain("exp-vote-status");
  expect(html).toContain("投票面板");
  expect(html).not.toContain("当前士兵");
  expect(html).toContain("min-width:0");
  expect(html).toContain("甲已投票");
  expect(
    (
      html
        .match(/<g class="exp-route-links"[^>]*>(.*?)<\/g>/)?.[1]
        .match(/<path /g) || []
    ).length,
  ).toBe(run.map.flat().reduce((sum, n) => sum + n.next.length, 0));
});
it("turns the route panel into a drawer toolbar when the wide map is enabled", async () => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === "expedition.wide-map" ? "1" : null),
    setItem: () => {},
  });
  const state = new ExpeditionAdventure().create(2),
    run = state.view;
  run.phase = "map";
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <ExpeditionMap
        run={run}
        available={run.map[0].map((node) => node.id)}
        names={["甲", "乙"]}
        onVote={() => {}}
      />,
    );
  });
  expect(
    tree.root.findAllByProps({ className: "exp-route-toolbar" }),
  ).toHaveLength(1);
  expect(
    tree.root.findAllByProps({ className: "exp-route-choice" }),
  ).toHaveLength(0);
  expect(
    tree.root.findAllByProps({ "data-wide": true }).length,
  ).toBeGreaterThan(0);
  expect(
    tree.root
      .findAllByType("button")
      .some((button) => button.children.join("").includes("投票面板")),
  ).toBe(true);
  await act(async () => tree.unmount());
});

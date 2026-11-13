import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionMap } from "../src/client/expedition/ExpeditionMap";
import { readingMapZoom, fitMapZoom } from "../src/client/map-view";
it("keeps a long horizontal map readable without fitting the whole route", () => {
  expect(
    readingMapZoom({ width: 1000, height: 600 }, { width: 784, height: 480 }),
  ).toBeGreaterThanOrEqual(1);
  expect(
    readingMapZoom({ width: 500, height: 300 }, { width: 784, height: 480 }),
  ).toBeGreaterThanOrEqual(0.85);
});
it("hides the independent vote panel by default but retains map votes and explicit confirmation", () => {
  const run = new ExpeditionAdventure().create(2).view;
  run.phase = "map";
  run.votes[0] = run.map[0][0].id;
  const html = renderToStaticMarkup(
    <ExpeditionMap
      run={run}
      actor={0}
      available={run.map[0].map((n) => n.id)}
      names={["甲", "乙"]}
      avatars={["🐱", "🐶"]}
      onVote={() => {}}
    />,
  );
  expect(html).not.toContain("exp-vote-status");
  expect(html).toContain("投票面板");
  expect(html).toContain("甲已投票");
  expect(html).toContain('data-my-vote="true"');
  expect(html).not.toContain("打开「选择路线」投票");
});

it("fits the complete overview of a very long map without lowering normal zoom limits", () => {
  expect(
    fitMapZoom({ width: 500, height: 300 }, { width: 5000, height: 800 }, 0.05),
  ).toBe(0.1);
  expect(
    fitMapZoom({ width: 500, height: 300 }, { width: 5000, height: 800 }),
  ).toBe(0.25);
});

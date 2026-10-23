import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
import {
  readFormulaHistory,
  saveFormulaHistory,
} from "../src/client/graphwar/formula-history";
import { guidePosition } from "../src/client/guide-position";
import { beginnerGuides } from "../src/client/beginner-guides";
import { guideTarget } from "../src/client/guide-targets";
import { readFileSync } from "node:fs";

function snapshot() {
  const room = new Room("table", {
    kind: "graphwar",
    humans: 2,
    ai: [],
    team: false,
    training: false,
  });
  const a = room.claim("Alice"),
    b = room.claim("Bob");
  room.setReady(b, true);
  room.start(a);
  return room.snapshot(a);
}
it("renders a real game surface, soldier targets, formula controls and meaningful guide anchors", () => {
  const s = snapshot();
  const html = renderToStaticMarkup(
    <OriginalGame snapshot={s} act={() => {}} end={() => {}} />,
  );
  expect(html).toContain('data-game="graphwar"');
  for (const target of [
    "gw.soldier",
    "gw.axes",
    "gw.terrain",
    "gw.formula",
    "gw.controls",
  ])
    expect(html).toContain(`data-guide-target="${target}"`);
  expect(html).toContain('aria-label="发射函数"');
  expect(html).not.toContain('aria-label="数学键盘"');
  expect(html).toContain('data-game-unit="0"');
  expect(html).toContain("选择此士兵");
  expect(html).toContain('class="gw-player-status"');
  expect(html).not.toContain('class="gw-roster"');
  expect(beginnerGuides.graphwar!.steps.length).toBeGreaterThanOrEqual(4);
  expect(guidePosition(s).length).toBeGreaterThan(0);
  for (const step of beginnerGuides.graphwar!.steps)
    expect(guideTarget(step.focus.target, s).key).toBe(step.focus.target);
  expect(readFileSync("src/client/ui/mobile-landscape.css", "utf8")).toContain(
    '[data-game="graphwar"]',
  );
});
it("keeps the replay read only and hides firing controls and end-game actions", () => {
  const html = renderToStaticMarkup(
    <OriginalGame snapshot={snapshot()} act={() => {}} end={() => {}} replay />,
  );
  expect(html).not.toContain('aria-label="发射函数"');
  expect(html).not.toContain("结束游戏");
});
it("bounds formula history and ignores malformed local input", () => {
  let saved = "[]";
  const store = {
    getItem: () => saved,
    setItem: (_key: string, value: string) => {
      saved = value;
    },
  };
  saveFormulaHistory(
    store,
    Array.from({ length: 20 }, (_, i) => `${i}*x`),
  );
  expect(readFormulaHistory(store)).toHaveLength(12);
  saved = "{";
  expect(readFormulaHistory(store)).toEqual([]);
  saved = JSON.stringify([true, "x", "x".repeat(300)]);
  expect(readFormulaHistory(store)).toEqual(["x"]);
});

it("anchors every map soldier independently and excludes player status from effect targeting", () => {
  const s = snapshot();
  const html = renderToStaticMarkup(
    <OriginalGame snapshot={s} act={() => {}} end={() => {}} />,
  );
  if (s.state?.kind !== "graphwar") throw new Error("wrong game");
  for (const unit of s.state.view.soldiers)
    expect(
      html.match(new RegExp(`data-game-unit="${unit.id}"`, "g")),
    ).toHaveLength(1);
  expect(html).not.toContain("data-game-avatar=");
});

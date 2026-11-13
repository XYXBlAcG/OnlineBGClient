import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Room } from "../src/domain/room";
import { OriginalGame } from "../src/client/OriginalGame";
import { guidePosition } from "../src/client/guide-position";
import { beginnerGuides } from "../src/client/beginner-guides";
import { guideTarget } from "../src/client/guide-targets";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllGlobals());

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
  expect(html).toContain('data-relation="ally"');
  expect(html).toContain('data-relation="enemy"');
  expect(html).not.toContain("gw-relation-legend");
  expect(html).toContain("蓝队 3");
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
it("keeps the system formula keyboard and shows the full shot log", () => {
  const html = renderToStaticMarkup(
    <OriginalGame snapshot={snapshot()} act={() => {}} end={() => {}} />,
  );
  expect(html).toContain('aria-label="发射函数"');
  expect(html).toContain("gw-shot-panel");
  expect(html).toContain("射击日志");
  expect(html).toContain("还没有操作记录");
  expect(html).not.toContain("上一发射击");
  expect(html).toContain("gw-preview-switch");
  expect(html).not.toContain("数学键盘 · 模板 · 伤害明细");
  expect(html).not.toContain("gw-tools");
  expect(html).not.toContain("gw-keyboard");
  expect(html).not.toContain("模板与历史");
  const css = readFileSync("src/client/graphwar/graphwar.css", "utf8");
  expect(css).not.toContain(".math-keyboard-hide");
  expect(css).not.toContain('[data-math-keyboard="open"]');
  expect(css).toContain("::part(virtual-keyboard-toggle)");
  expect(css).toContain(".gw-impact-badge");
  expect(css).toContain("button:not(.ui-switch)");
  expect(css).toContain(".gw-preview-switch");
  expect(css).toContain("inset 0 0 0 3px #3489ef66");
  expect(css).toContain(".gw-relation-badge");
  expect(css).toContain('.gw-soldier[data-relation="enemy"]');
  expect(css).toContain("min-height: 200px");
  expect(css).not.toContain(".gw-toolbar");
  const formula = readFileSync(
    "src/client/graphwar/MathFormulaField.tsx",
    "utf8",
  );
  expect(formula).toContain("insertMultiply");
  expect(formula).toContain("\\times ");
  expect(formula).toContain("inlineShortcuts = {}");
  expect(formula).not.toContain("mathVirtualKeyboard");
  expect(formula).not.toContain("scrollIntoView");
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

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PoolPreview } from "../src/client/dev/PoolPreview";
import { PoolGame } from "../src/client/pool/PoolGame";
import { PoolRules } from "../src/domain/pool/rules";

it("renders the pool prototype with both rule modes and table controls", () => {
  const html = renderToStaticMarkup(<PoolPreview />);
  expect(html).toContain("台球原型");
  expect(html).toContain("8-Ball");
  expect(html).toContain("9-Ball");
  expect(html).toContain("pool-canvas");
  expect(html).toContain("击球");
  expect(html).toContain("高杆");
  expect(html).toContain("低杆");
  expect(html).toContain("左塞");
  expect(html).toContain("按住桌面向后拖动");
  expect(html).toContain("松手击球");
  expect(html).toContain("pool-power-track");
  expect(html).toContain("平杆");
  expect(html).toContain("60°");
  expect(html).toContain('data-guide-target="pool.table"');
  expect(html).toContain("预计轨迹");
  expect(html).not.toContain('aria-label="击球力度"');
});

it("falls back to the 2D renderer when no 3D environment is available", () => {
  const view = new PoolRules(() => 0.42).create(2, false, {
    pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
  }).view;
  const html = renderToStaticMarkup(
    <PoolGame
      view={view}
      actor={0}
      act={() => {}}
      replay={false}
      pending={false}
    />,
  );
  expect(html).toContain("pool-canvas");
  expect(html).not.toContain("切换到 3D 渲染");
  expect(html).toContain("<strong>台球</strong>");
  expect(html).not.toContain("<strong>8-Ball</strong>");
});

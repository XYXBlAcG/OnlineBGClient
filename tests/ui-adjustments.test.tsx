import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { GameIcon } from "../src/client/GameIcon";
import { NodeSymbol } from "../src/client/expedition/NodeSymbol";
import { nodeIcons } from "../src/domain/expedition/map";
import { readFileSync } from "node:fs";
it("跳棋、三国杀、麻将使用图形而非字符替代", () => {
  for (const kind of ["tq", "sgs", "scmj"] as const) {
    const html = renderToStaticMarkup(<GameIcon kind={kind} />);
    expect(html).toContain("<svg");
    expect(html).not.toContain("<text");
  }
});
it("每种路线节点使用同一矢量图标规范", () => {
  for (const kind of Object.keys(nodeIcons) as (keyof typeof nodeIcons)[]) {
    const html = renderToStaticMarkup(<NodeSymbol kind={kind} />);
    expect(html).toContain("<svg");
    expect(html).not.toContain("exp-route-chest");
  }
});
it("联机加入不移除左侧目录，也不使用卡片上浮表示悬停", () => {
  const source = readFileSync("src/client/Lobby.tsx", "utf8");
  expect(source).not.toContain("hidden={!creating}");
  expect(readFileSync("src/client/lobby/lobby.css", "utf8")).not.toContain(
    "translateY(-2px)",
  );
  expect(readFileSync("src/client/GameCommands.tsx", "utf8")).not.toContain(
    "useNativeWindow",
  );
});

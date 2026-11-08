import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ResumeDrawer } from "../src/client/lobby/ResumeDrawer";

it("keeps unfinished runs and room recovery in a closed drawer", () => {
  const html = renderToStaticMarkup(
    <ResumeDrawer
      busy={false}
      hosted
      localSave
      lastRoom="room-link"
      onRestoreHosted={() => {}}
      onRestoreLocal={() => {}}
      onRestoreNetwork={() => {}}
      onRestoreRun={() => {}}
      onAbandonRun={async () => {}}
    />,
  );
  expect(html).toContain("继续对局");
  expect(html).not.toContain("秘塔远征");
  const drawer = readFileSync("src/client/lobby/ResumeDrawer.tsx", "utf8");
  expect(drawer).toContain("<RunShelf");
  expect(drawer).toContain("其他未完成");
  expect(drawer).toContain("恢复我创建的公网房间");
  expect(drawer).toContain("恢复本地对局");
  expect(drawer).toContain("恢复最近联机房间");
  const main = readFileSync("src/main.tsx", "utf8");
  expect(main).toContain("<ResumeDrawer");
  expect(main).not.toContain("recent-rooms");
  expect(main).not.toContain("<RunShelf");
});

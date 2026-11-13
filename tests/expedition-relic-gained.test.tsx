// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { RelicGainedOverlay } from "../src/client/expedition/RelicGainedOverlay";
import type { ExpeditionNodeResult } from "../src/domain/expedition/adventure-types";

const result: ExpeditionNodeResult = {
  sequence: 3,
  nodeId: "node",
  nodeKind: "treasure",
  before: {
    compass: 0,
    heroes: [
      {
        actor: 0,
        name: "甲",
        hp: 10,
        maxHp: 20,
        gold: 5,
        cards: 3,
        relics: [],
        potions: [],
      },
    ],
    companions: [],
  },
  after: {
    compass: 1,
    heroes: [
      {
        actor: 0,
        name: "甲",
        hp: 10,
        maxHp: 20,
        gold: 5,
        cards: 3,
        relics: ["ember"],
        potions: [],
      },
    ],
    companions: [],
  },
};

it("shows only the newly gained relic with its effect", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <RelicGainedOverlay result={result} actor={0} onClose={() => {}} />,
    );
  });
  const html = document.body.innerHTML;
  expect(html).toContain("获得遗物");
  expect(html).toContain("余烬徽章");
  expect(html).toContain("点击任意位置关闭");
  expect(html).not.toContain("节点结算");
  await act(async () => root.unmount());
  container.remove();
});

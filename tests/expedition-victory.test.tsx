import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ExpeditionVictory } from "../src/client/expedition/ExpeditionVictory";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";

function finishedRun(outcome: "won" | "lost") {
  const rules = new ExpeditionAdventure(() => 0.42);
  const run = structuredClone(
    rules.create(1, false, {
      expedition: { difficulty: "standard", ascension: 3 },
    }).view,
  );
  run.phase = outcome;
  run.chapter = 3;
  run.path = ["a", "b", "c"];
  run.combat.metrics.battlesWon = 9;
  run.combat.metrics.cards = 42;
  return run;
}

it("celebrates the conquered spire with the run summary", () => {
  const html = renderToStaticMarkup(
    <ExpeditionVictory run={finishedRun("won")} />,
  );
  expect(html).toContain("秘塔已被征服");
  expect(html).toContain("最终章 · 塔心崩落");
  expect(html).toContain("深入层数");
  expect(html).toContain("战斗胜场");
  expect(html).toContain("标准难度");
  expect(html).toContain("N3 阶");
  expect(html).toContain("exp-victory-rays");
  expect(html).toContain("走到了最后");
});

it("keeps the defeat summary calm and factual", () => {
  const html = renderToStaticMarkup(
    <ExpeditionVictory run={finishedRun("lost")} />,
  );
  expect(html).toContain("这一次旅程停在这里");
  expect(html).toContain("止步 3 层");
  expect(html).not.toContain("秘塔已被征服");
});

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
  expect(html).toContain("深入层数");
  expect(html).toContain("战斗胜场");
  expect(html).toContain("exp-victory-rays");
  expect(html).not.toContain("exp-victory-subtitle");
});

it("settles an endless run with a score panel", () => {
  const rules = new ExpeditionAdventure(() => 0.42);
  const run = structuredClone(
    rules.create(1, false, {
      expedition: { difficulty: "challenge", endless: true },
    }).view,
  );
  run.phase = "lost";
  run.chapter = 5;
  run.path = Array.from({ length: 18 }, (_, index) => `${index}`);
  run.combat.metrics.battlesWon = 11;
  run.combat.metrics.cards = 96;
  const html = renderToStaticMarkup(<ExpeditionVictory run={run} />);
  expect(html).toContain("远征失败");
  expect(html).toContain("本次得分");
  expect(html).toContain("累计层数");
  expect(html).not.toContain("exp-victory-rays");
});

it("keeps the defeat summary calm and factual", () => {
  const html = renderToStaticMarkup(
    <ExpeditionVictory run={finishedRun("lost")} />,
  );
  expect(html).toContain("远征失败");
  expect(html).toContain("深入层数");
  expect(html).not.toContain("秘塔已被征服");
  expect(html).not.toContain("exp-victory-rays");
  expect(html).not.toContain("exp-victory-crown");
});

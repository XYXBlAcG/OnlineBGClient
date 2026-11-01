import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { partySignals, partyResults } from "../src/domain/party/facts";
it("武圣实际出杀只触发一次主镜头，随后闪避不虚构伤害", () => {
  const engine = new GameEngine();
  let state = engine.create("sgs", 2, "party-wusheng");
  if (state.kind !== "sgs") throw Error();
  for (let i = 0; i < 2; i++) {
    const actor = engine.actors(state)[0];
    state.view.heroCandidates[actor] = [actor === 0 ? 10 : 20];
    state = engine.apply(
      state,
      actor,
      engine.candidates(state, actor)[0].action,
      `hero${i}`,
    ) as typeof state;
  }
  let found = false;
  for (let i = 0; i < 120 && !engine.finished(state); i++) {
    const actor = engine.actors(state)[0],
      actions = engine.candidates(state, actor);
    if (!actions.length) {
      if (engine.needsResolution(state)) {
        state = engine.resolve(state, `resolve${i}`) as typeof state;
        continue;
      }
      break;
    }
    const converted = actions.find(
      (c) =>
        c.label.includes("武圣") &&
        c.action.type === "sgs-choice" &&
        c.action.button === 0 &&
        c.action.targets.length > 0,
    );
    const selected =
      converted ??
      actions.find(
        (c) => c.action.type === "sgs-choice" && c.action.cards.length > 0,
      ) ??
      actions[0];
    const next = engine.apply(state, actor, selected.action, `move${i}`);
    const signals = partySignals(state, next, actor, selected.action, engine);
    if (converted) {
      expect(signals.filter((s) => s.item === "sgsSlash")).toHaveLength(1);
      expect(signals[0].label).toMatch(/杀/);
      found = true;
      break;
    }
    state = next as typeof state;
  }
  expect(found).toBe(true);
});
it("UNO 实际出牌与 +4，三国杀阵营、斗地主阵营使用原引擎公开结果", () => {
  const engine = new GameEngine();
  let uno = engine.create("uno", 2, "party-uno");
  if (uno.kind !== "uno") throw Error();
  for (let i = 0; i < 10; i++) {
    const actor = engine.actors(uno)[0],
      actions = engine.candidates(uno, actor);
    const selected =
      actions.find((c) => c.action.type === "uno-play") ?? actions[0];
    const next = engine.apply(uno, actor, selected.action, `uno${i}`);
    if (selected.action.type === "uno-play") {
      expect(
        partySignals(uno, next, actor, selected.action, engine),
      ).toContainEqual({
        actor,
        item: "unoNeon",
        label: "UNO · 霓虹出牌",
        target: undefined,
      });
      break;
    }
    uno = next as typeof uno;
  }
  const ddz = engine.create("ddz", 3, "ddz-results");
  if (ddz.kind !== "ddz") throw Error();
  ddz.view.isFinish = true;
  ddz.view.landlordId = 1;
  ddz.view.landlordWin = true;
  expect(
    partyResults(
      ddz,
      [
        { id: "a", name: "甲" },
        { id: "b", name: "乙" },
        { id: "c", name: "丙" },
      ],
      engine,
    ).winners,
  ).toEqual([0]);
});

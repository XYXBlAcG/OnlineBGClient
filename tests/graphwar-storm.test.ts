import { expect, it } from "vitest";
import { GameEngine } from "../src/domain/engine";
import { formulaFamily } from "../src/domain/graphwar/expression";
import type { GraphwarState } from "../src/domain/graphwar/types";

it("classifies formula families deterministically", () => {
  expect(formulaFamily("0.2*x")).toBe("linear");
  expect(formulaFamily("sin(x)")).toBe("trig");
  expect(formulaFamily("sqrt(x)")).toBe("root");
  expect(formulaFamily("x^2")).toBe("power");
});

it("runs the rift storm scenario with wind and rotating function limits", () => {
  const engine = new GameEngine();
  const state = engine.create("graphwar", 2, "storm", false, {
    graphwar: {
      scenario: "storm",
      mode: "classic",
      map: "open",
      size: "standard",
      soldiers: 3,
      preview: true,
      turnSeconds: 0,
    },
  }) as GraphwarState;
  expect(state.view.wind).toBeDefined();
  expect(state.view.allowedFamily).toBe("any");
  state.view.allowedFamily = "linear";
  expect(() =>
    engine.apply(state, 0, { type: "graphwar-fire", formula: "sin(x)" }, "bad"),
  ).toThrow("linear");
  const next = engine.apply(
    state,
    0,
    { type: "graphwar-fire", formula: "x/20" },
    "good",
  ) as GraphwarState;
  expect(next.view.sequence).toBe(1);
});

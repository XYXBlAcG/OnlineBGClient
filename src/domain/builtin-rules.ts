import { GameAdapter } from "./plugin";
import { UpstreamRuntime } from "../upstream/runtime";
import { UnoRules } from "./uno";
import { SgsRules } from "./sgs";
import { DdzRules } from "./ddz";
import { CheckersRules } from "./checkers";
import { FlightRules } from "./flight";

export function unoPlugin(runtime: UpstreamRuntime) {
  return new GameAdapter("uno", new UnoRules(runtime));
}
export function sgsPlugin(runtime: UpstreamRuntime) {
  return new GameAdapter("sgs", new SgsRules(runtime));
}
export function ddzPlugin(runtime: UpstreamRuntime) {
  const rules = new DdzRules(runtime);
  return new GameAdapter("ddz", {
    create: (players) => ({ kind: "ddz", view: rules.create(players) }),
    finished: (state) => state.view.isFinish,
    actors: (state) => rules.actors(state.view),
    candidates: (state, actor) => rules.candidates(state.view, actor),
    apply: (state, actor, action) => ({
      kind: "ddz",
      view: rules.apply(state.view, actor, action),
    }),
    project: (state, actor) => ({
      kind: "ddz",
      view: rules.project(state.view, actor),
    }),
  });
}
export function checkersPlugin(runtime: UpstreamRuntime) {
  const rules = new CheckersRules(runtime);
  return new GameAdapter("tq", {
    create: (players) => ({ kind: "tq", view: rules.create(players) }),
    finished: (state) => state.view.finish,
    actors: (state) => (state.view.finish ? [] : [state.view.waitFor]),
    candidates: (state, actor) => rules.candidates(state.view, actor),
    apply: (state, actor, action) => ({
      kind: "tq",
      view: rules.apply(state.view, actor, action),
    }),
    project: (state) => structuredClone(state),
  });
}
export function flightPlugin(runtime: UpstreamRuntime) {
  const rules = new FlightRules(runtime);
  return new GameAdapter("fxq", {
    create: (players) => ({ kind: "fxq", view: rules.create(players) }),
    finished: (state) => rules.finished(state.view),
    actors: (state) =>
      rules.finished(state.view) ? [] : [state.view.state & 3],
    candidates: (state, actor) => rules.candidates(state.view, actor),
    apply: (state, actor, action) => ({
      kind: "fxq",
      view: rules.apply(state.view, actor, action),
    }),
    project: (state) => structuredClone(state),
  });
}

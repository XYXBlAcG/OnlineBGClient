import { mapChoices } from "./map";
import type {
  ExpeditionGameState,
  NodeKind,
} from "./adventure-types";
import type { ExpeditionAdventure } from "./adventure";
import type { ExpeditionStrategy } from "./ai";

export interface ExpeditionBreakpoint {
  timing: "before" | "after";
  nodeKind: NodeKind;
}

export interface ExpeditionAutomationStep {
  actor: number;
  phase: ExpeditionGameState["view"]["phase"];
  label: string;
}

export function expeditionBreakpointReached(
  state: ExpeditionGameState,
  breakpoint: ExpeditionBreakpoint,
  afterSequence = -1,
) {
  if (breakpoint.timing === "before")
    return (
      state.view.phase === "map" &&
      mapChoices(state.view).some(
        (node) => node.kind === breakpoint.nodeKind,
      )
    );
  return (
    state.view.lastNodeResult?.nodeKind === breakpoint.nodeKind &&
    state.view.lastNodeResult.sequence > afterSequence
  );
}

export function runExpeditionAutomation({
  adventure,
  state,
  strategy,
  breakpoint,
  maxSteps = 500,
}: {
  adventure: ExpeditionAdventure;
  state: ExpeditionGameState;
  strategy: ExpeditionStrategy;
  breakpoint?: ExpeditionBreakpoint | null;
  maxSteps?: number;
}) {
  let current = state,
    steps = 0,
    paused = false,
    reason = "";
  const actions: ExpeditionAutomationStep[] = [];
  while (!adventure.finished(current) && steps < maxSteps) {
    if (
      breakpoint &&
      expeditionBreakpointReached(
        current,
        breakpoint,
        breakpoint.timing === "after"
          ? state.view.lastNodeResult?.sequence ?? -1
          : -1,
      )
    ) {
      paused = true;
      reason = `${breakpoint.nodeKind} 节点${
        breakpoint.timing === "before" ? "开始前" : "结算后"
      }已暂停`;
      break;
    }
    const actor = adventure.actors(current)[0];
    if (actor === undefined) {
      paused = true;
      reason = "当前状态没有可自动执行的玩家动作";
      break;
    }
    const request = {
        observation: adventure.project(current, actor),
        actor,
        difficulty: "hard" as const,
        seed: `lab:${steps}:${actor}`,
        audit: false,
      },
      decision = strategy
        .score(request, strategy.candidates(request))
        .sort((left, right) => right.score - left.score)[0];
    if (!decision) {
      paused = true;
      reason = "AI 没有生成合法决策";
      break;
    }
    actions.push({
      actor,
      phase: current.view.phase,
      label: decision.label,
    });
    current = adventure.apply(current, actor, decision.action);
    steps++;
    if (
      breakpoint?.timing === "after" &&
      expeditionBreakpointReached(
        current,
        breakpoint,
        state.view.lastNodeResult?.sequence ?? -1,
      )
    ) {
      paused = true;
      reason = `${breakpoint.nodeKind} 节点结算后已暂停`;
      break;
    }
  }
  if (!paused && steps >= maxSteps) reason = "达到自动执行步数上限";
  return { state: current, steps, paused, reason, actions };
}

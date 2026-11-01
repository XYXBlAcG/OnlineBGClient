import type { ExpeditionRun, MapNode } from "./adventure-types";
import { nodeNames } from "./map";
import { relics, storyEvents, type RelicId } from "./world";
export type BallotPhase = ExpeditionRun["votePhase"];
export function ballotPhase(run: ExpeditionRun): BallotPhase | undefined {
  const phase = run.phase === "tie" ? run.votePhase : run.phase;
  return ["map", "event", "treasure", "holder"].includes(phase)
    ? (phase as BallotPhase)
    : undefined;
}
export function routeLabel(map: MapNode[][], node: MapNode): string {
  const row = map[node.floor];
  const position =
    row.length === 1
      ? "中央"
      : node.lane === 0
        ? "最左侧"
        : node.lane === row.length - 1
          ? "最右侧"
          : `从左第 ${node.lane + 1} 处`;
  return `${position}${nodeNames[node.kind]} · 第 ${node.floor + 1} 站`;
}
export function ballotOption(
  run: ExpeditionRun,
  phase: BallotPhase,
  choice: string,
  names: string[] = [],
) {
  if (phase === "map") {
    const node = run.map.flat().find((node) => node.id === choice)!;
    return {
      label: routeLabel(run.map, node),
      node,
      detail: `后续：${
        node.next.length
          ? [
              ...new Set(
                run.map
                  .flat()
                  .filter((next) => node.next.includes(next.id))
                  .map((next) => nodeNames[next.kind]),
              ),
            ].join("、")
          : "本层终点"
      }`,
    };
  }
  const label =
    phase === "event"
      ? choice === "leave"
        ? "离开"
        : choice === "reroll"
          ? "全员同意重选奇遇"
          : storyEvents[run.event!].choices[Number(choice)].name
      : phase === "treasure"
        ? relics[choice as RelicId].name
        : (names[Number(choice)] ?? run.combat.heroes[Number(choice)].name);
  return { label, node: undefined, detail: "" };
}

export function ballotResult(
  run: ExpeditionRun,
  phase: BallotPhase,
  choice: string,
) {
  return {
    sequence: run.sequence,
    phase,
    choice,
    label: ballotOption(run, phase, choice).label,
    votes: { ...run.votes },
    options: Object.fromEntries(
      [...new Set(Object.values(run.votes))].map((id) => [
        id,
        ballotOption(run, phase, id!).label,
      ]),
    ),
  };
}

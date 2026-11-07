import type { ExpeditionRun, MapNode } from "./adventure-types";
import { nodeNames, travelCost } from "./map";
import { relics, storyEvents, type RelicId } from "./world";
import { routeProfiles } from "./route-profiles";
export type BallotPhase = ExpeditionRun["votePhase"];
export function ballotPhase(run: ExpeditionRun): BallotPhase | undefined {
  const phase = run.phase === "tie" ? run.votePhase : run.phase;
  return [
    "map",
    "event",
    "treasure",
    "holder",
    "oracle",
    "contract",
    "pawnshop",
    "gamble",
    "library",
    "hunt",
    "rift",
    "recruit",
  ].includes(phase)
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
    const travel = travelCost(run, node);
    return {
      label: routeLabel(run.map, node),
      node,
      detail: `${node.route ? `${routeProfiles[node.route].name}：${routeProfiles[node.route].summary} ` : ""}${travel.visited ? "已探索，仅可通行 · " : ""}${travel.cost ? `罗盘 ${travel.cost} · ` : ""}后续：${
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
  if (phase === "oracle")
    return {
      label:
        choice === "luck"
          ? "每人获得 1 幸运筹码"
          : choice === "heal"
            ? "每人恢复 8 生命"
            : choice === "compass"
              ? "罗盘充能 +1"
              : "观星选项",
      node: undefined,
      detail: "全队选择后统一结算",
    };
  if (phase === "contract")
    return {
      label:
        choice === "accept"
          ? "签订孵巢契约"
          : choice === "refuse"
            ? "拒绝契约"
            : "誓约选项",
      node: undefined,
      detail:
        choice === "accept"
          ? "每人获得 80 金币，下一首领增加一只幼体"
          : "不改变后续首领",
    };
  if (phase === "pawnshop")
    return {
      label:
        choice === "sell"
          ? "典当遗物"
          : choice === "buy"
            ? "购入随机遗物"
            : "离开当铺",
      node: undefined,
      detail:
        choice === "sell"
          ? "每人失去 1 件遗物并回复 65 金币"
          : choice === "buy"
            ? "每人支付 45 金币获得随机遗物"
            : "不进行交换",
    };
  if (phase === "gamble")
    return {
      label:
        choice === "safe"
          ? "稳妥分赃"
          : choice === "risk"
            ? "押上命运"
            : "离开赌局",
      node: undefined,
      detail:
        choice === "safe"
          ? "每人获得 15 金币"
          : choice === "risk"
            ? "约六成概率获得 55 金币，否则失去 12 生命"
            : "不冒险",
    };
  if (phase === "library")
    return {
      label: choice === "bargain" ? "签下禁书契约" : "离开禁书库",
      node: undefined,
      detail:
        choice === "bargain"
          ? "每人获得 1 张永久废牌和 1 件遗物、50 金币"
          : "不带走禁书",
    };
  if (phase === "hunt")
    return {
      label: choice === "accept" ? "接下悬赏" : "离开追猎台",
      node: undefined,
      detail:
        choice === "accept"
          ? "下一次精英获得额外词条，胜利后每人多得 50 金币"
          : "不改变下一场精英",
    };
  if (phase === "rift")
    return {
      label: choice === "enter" ? "进入深渊裂隙" : "离开裂隙",
      node: undefined,
      detail:
        choice === "enter"
          ? "随机消耗队伍 2 张牌与 1 件遗物，进入短支线层；归来时全队获得 80 金币与 1 罗盘"
          : "不进入深层",
    };
  if (phase === "recruit") {
    const offer = run.companionOffers.find((candidate) => candidate.id === choice);
    return {
      label: offer ? `招募${offer.name}` : "不招募，继续前进",
      node: undefined,
      detail: offer
        ? `${offer.mode === "fragile" ? "阵亡后永久离队" : offer.mode === "limited" ? "仅能出战 1–3 场，阵亡时全队恢复 6 生命" : "每场战斗后可复起"} · ${offer.deck.length} 张简易牌`
        : "保留当前队伍",
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

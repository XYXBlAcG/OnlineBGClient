import { catanResourceNames } from "../domain/catan";
import { splendorColors } from "../domain/splendor";
import type { Snapshot } from "../domain/protocol";
export type GuideSnapshot = Pick<
  Snapshot,
  "state" | "candidates" | "finished" | "actor" | "version"
>;

export function guidePosition({
  state,
  actor,
  candidates,
}: GuideSnapshot): string[] {
  if (!state || actor < 0) return [];
  switch (state.kind) {
    case "ccbs": {
      const v = state.view;
      return [
        `你现在有 ${v.playerScore[actor]} 分，已购 ${v.playerCard[actor].length} 张发展卡，预留 ${v.playerBooked[actor].length} 张。`,
        `你手上的宝石：${splendorColors.map((name, i) => `${name}${v.playerGem[actor][i]}`).join("、")}。`,
        `银行库存：${splendorColors.map((name, i) => `${name}${v.bankGem[i]}`).join("、")}。`,
      ];
    }
    case "dy": {
      const v = state.view;
      return [
        `三口锅当前总值：红 ${v.potValues[0]}、蓝 ${v.potValues[1]}、紫 ${v.potValues[2]}。`,
        `你还有 ${v.players[actor].length} 张手牌，收牌区有 ${v.eats[actor].length} 张；当前罚分 ${v.scores[actor]}，最终免罚以结算为准。`,
      ];
    }
    case "ktd": {
      const v = state.view.playerData[actor];
      return [
        `你当前的资源：${catanResourceNames.map((name, i) => `${name}${v.resources[i]}`).join("、")}。`,
        `你目前有 ${v.roads.length} 段道路；现在可用的建设、交易与响应见下方合法动作。`,
      ];
    }
    case "sgs": {
      const v = state.view;
      return v.hero[actor]
        ? [
            `你现在有 ${v.playerBlood[actor]} / ${v.playerMaxBlood[actor]} 体力，${v.playerHandCard[actor].length} 张手牌。`,
            `当前提供 ${candidates.length} 个合法选择；选牌前先看当前阶段与响应提示。`,
          ]
        : ["当前仍在选择武将，先选择候选武将，开局完成后再查看手牌与锦囊。"];
    }
    case "tq": {
      const routes = candidates.filter((c) => c.action.type === "tq-move");
      return [
        `你有 ${state.view.playerPieces[actor].length} 枚棋子，需要全部搬到对面营地。`,
        `当前有 ${routes.length} 条合法路线，其中 ${routes.filter((c) => c.action.type === "tq-move" && c.action.route.length > 2).length} 条为连续跳跃。`,
      ];
    }
    default:
      return [];
  }
}

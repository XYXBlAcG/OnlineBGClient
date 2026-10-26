import { incoming } from "../domain/expedition/rules";
import { definition, cardText } from "../domain/expedition/content";
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
    case "expedition": {
      const run = state.view,
        hero = run.combat.heroes[actor];
      if (!hero) return [];
      const playable = candidates.find(
        (c) =>
          c.action.type === "expedition-action" &&
          c.action.move.type === "card",
      );
      const card =
        playable?.action.type === "expedition-action" &&
        playable.action.move.type === "card"
          ? hero.hand.find(
              (c) =>
                playable.action.type === "expedition-action" &&
                playable.action.move.type === "card" &&
                c.id === playable.action.move.instance,
            )
          : undefined;
      return [
        `你是${hero.name}，${hero.hp}/${hero.maxHp} 生命，${hero.energy} 能量，${hero.gold} 金币。`,
        ...(run.phase === "battle"
          ? [
              `敌方本轮预计对你造成 ${incoming(run.combat, actor)} 点攻击伤害；当前 ${hero.block} 格挡。`,
              card
                ? `现在可出${definition(card).name}：${cardText(card)}`
                : "没有可出的手牌时可以使用药水或结束行动。",
            ]
          : ["全员完成当前选择后继续；票数相同由本层领队裁决。"]),
      ];
    }

    case "graphwar": {
      const v = state.view,
        me = v.soldiers.filter((s) => s.player === actor && s.hp > 0);
      const current = v.soldiers.find((s) => s.id === v.currentSoldier)!;
      return [
        `你属于${v.teams[actor] === 0 ? "蓝" : "橙"}队，剩余 ${me.length} 名士兵。`,
        `本回合发射点：(${current.x.toFixed(1)}, ${current.y.toFixed(1)})；${v.options.preview ? "允许弹道预览" : "本房关闭预览"}。`,
      ];
    }
    case "scmj":
      return [
        `当前阶段：${state.view.phase === "exchange" ? "换三张" : state.view.phase === "lack" ? "定缺" : state.view.phase === "response" ? "响应" : "摸打"}；牌墙余 ${state.view.wall.length} 张。`,
        `你有 ${state.view.hands[actor].length} 张手牌，得分 ${state.view.scores[actor]}，可选 ${candidates.length} 个合法动作。`,
      ];
    case "dominion": {
      const v = state.view;
      return [
        `第 ${v.round} 轮，当前 ${v.actions} 行动、${v.buys} 购买、${v.coins} 金币。`,
        `行省剩余 ${v.supply.province} 张，供应中已有 ${Object.values(v.supply).filter((n) => n === 0).length} 堆售罄。`,
        v.prompt
          ? v.prompt.title
          : "先处理行动牌，再打出财宝购买；新牌通常进入弃牌区。",
      ];
    }
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

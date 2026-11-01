import type { WorkshopEffect } from "./model";
import type { PartyAccount, PartyContext } from "../party/model";
import {
  partyItems,
  partyTier,
  discountedPartyPrice,
} from "../party/catalogue";
export function workshopPurchaseIssue(
  effect: WorkshopEffect,
  pack: string,
  account: PartyAccount | undefined,
  context: PartyContext,
  actor: number,
  unlockAll: boolean,
): string | undefined {
  if (!account) return "房间成员才可购买";
  if (!context.playing) return "开局后可用";
  if (!unlockAll && effect.tier > partyTier(account.earned))
    return `财富等级 ${effect.tier} 解锁`;
  if (
    effect.trigger !== "manual" &&
    (context.observers.includes(actor) ||
      partyItems[effect.trigger].game !== context.state?.kind)
  )
    return "装扮不适用于当前玩家或游戏";
  if (
    account.pluginAuras.some((a) => a.pack === pack && a.effect === effect.id)
  )
    return "本局已经装备";
  if (account.coins < discountedPartyPrice(effect.price, account.earned))
    return "彩蛋币不足";
}

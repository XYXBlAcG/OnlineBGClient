import {
  partyItems,
  partyPrice,
  partyTier,
  type PartyItemId,
} from "./catalogue";
import type { PartyAccount, PartyContext } from "./model";
export function partyPurchaseIssue(
  id: PartyItemId,
  account: PartyAccount | undefined,
  context: PartyContext,
  actor: number,
  unlockAll: boolean,
  voiceReady = false,
): string | undefined {
  const item = partyItems[id];
  if (!account) return "加入房间后可用";
  if (!context.playing) return "开局后可用";
  if (!unlockAll && item.tier > partyTier(account.earned))
    return `财富等级 ${item.tier} 解锁`;
  if (item.game && item.game !== context.state?.kind) return "当前游戏不适用";
  if (
    item.category === "装扮" &&
    (context.observers.includes(actor) || account.auras.includes(id))
  )
    return "已离场或本局已经装备";
  if (
    item.category === "装备" &&
    id !== "timeStop" &&
    account.equipment.includes(id)
  )
    return "本局已经装备";
  if (id === "voiceStage" && !voiceReady) return "客户端连麦后可用";
  if (id === "cheer" && !context.observers.includes(actor))
    return "离场观众专属";
  if (
    ["coinGrab", "boss", "relay"].includes(id) &&
    context.observers.filter((i) => context.players[i]?.human).length < 2
  )
    return "需要至少两位真人观众";
  if (account.coins < partyPrice(id, account.earned)) return "彩蛋币不足";
}

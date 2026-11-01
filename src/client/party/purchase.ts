import {
  partyItems,
  partyPrice,
  discountedPartyPrice,
  type PartyAction,
  type PartyContext,
  type PartyItemId,
} from "../../domain/party";
import { partyPurchaseIssue } from "../../domain/party/availability";
import { workshopPurchaseIssue } from "../../domain/workshop/availability";
import type { Snapshot } from "../../domain/protocol";
export type PartySelection =
  | { type: "builtin"; item: PartyItemId }
  | { type: "plugin"; pack: string; effect: string };
export function preparePartyPurchase(
  selection: PartySelection | undefined,
  snapshot: Snapshot,
  context: PartyContext,
  actor: number,
  target: string,
  voiceReady: boolean,
) {
  if (!selection) return undefined;
  const account = snapshot.party.balances[context.players[actor]?.id];
  if (selection.type === "builtin") {
    const item = partyItems[selection.item],
      self =
        item.category === "装备" ||
        item.category === "装扮" ||
        ["voiceStage", "coinGrab", "boss", "relay", "wish"].includes(
          selection.item,
        ),
      all = item.category === "场景";
    const destination = self
      ? actor
      : all || target === "table"
        ? "table"
        : context.players.findIndex((p) => p.id === target);
    const issue =
      partyPurchaseIssue(
        selection.item,
        account,
        context,
        actor,
        snapshot.party.policy.unlockAll,
        voiceReady,
      ) ?? (destination === -1 ? "请选择互动对象" : undefined);
    const action: PartyAction = {
      type: "buy",
      item: selection.item,
      target: destination,
      round: context.round,
      voiceReady,
    };
    return {
      name: item.name,
      emoji: item.emoji,
      description: item.description,
      price: partyPrice(selection.item, account?.earned ?? 0),
      duration: item.duration,
      self,
      all,
      equipped:
        item.category === "装扮" ||
        (item.category === "装备" && selection.item !== "timeStop"),
      issue,
      action,
    };
  }
  const pack = snapshot.party.plugins.find((p) => p.id === selection.pack),
    effect = pack?.effects.find((e) => e.id === selection.effect);
  if (!pack || !effect) return undefined;
  const self = effect.scope === "self" || effect.trigger !== "manual",
    all = effect.scope === "room",
    destination = self
      ? actor
      : all || target === "table"
        ? "table"
        : context.players.findIndex((p) => p.id === target);
  const issue =
    workshopPurchaseIssue(
      effect,
      pack.id,
      account,
      context,
      actor,
      snapshot.party.policy.unlockAll,
    ) ?? (destination === -1 ? "请选择互动对象" : undefined);
  const action: PartyAction = {
    type: "buy-plugin",
    pack: pack.id,
    effect: effect.id,
    target: destination,
    round: context.round,
  };
  return {
    name: effect.name,
    emoji: effect.emoji,
    description: effect.description,
    price: discountedPartyPrice(effect.price, account?.earned ?? 0),
    duration: effect.duration,
    self,
    all,
    equipped: effect.trigger !== "manual",
    issue,
    action,
  };
}

import {
  canParticipate,
  type CompanionEvent,
  type ParticipationPolicy,
  type ParticipationState,
} from "companion-core";
import type { TableEvent } from "./model";

export interface SocialProfile {
  name: string;
}

function socialEvent(
  event: TableEvent,
  profile: SocialProfile,
  conversationId: string,
): CompanionEvent | null {
  if (!event.public) return null;
  if (
    event.kind === "chat" &&
    (event.actor?.startsWith("companion:") || event.actor?.startsWith("ai:"))
  )
    return null;
  const mention =
    event.kind === "chat" && event.label.includes(`@${profile.name}`);
  return {
    id: event.id,
    conversationId,
    kind: mention ? "mention" : "chat",
    actor: {
      id: event.actor ?? "table",
      kind: event.actor?.startsWith("ai:") ? "ai" : "human",
      name: event.actorName ?? "牌桌",
    },
    text:
      event.kind === "chat"
        ? event.label
        : `${event.actorName ?? "牌桌"}：${event.label}`,
    occurredAt: event.at,
  };
}

function priority(event: TableEvent, profile: SocialProfile): number {
  if (event.kind === "chat")
    return event.label.includes(`@${profile.name}`) ? 100 : 80;
  if (event.kind === "action") return 60;
  if (event.kind === "achievement") return 50;
  if (event.kind === "game-start" || event.kind === "game-end") return 40;
  return 0;
}

export function planSocialReaction(
  events: TableEvent[],
  profile: SocialProfile,
  policy: ParticipationPolicy,
  state: ParticipationState,
  now: number,
  conversationId: string,
): TableEvent | null {
  let best: { event: TableEvent; priority: number } | null = null;
  for (const event of events) {
    const companionEvent = socialEvent(event, profile, conversationId);
    if (!companionEvent) continue;
    if (canParticipate(policy, state, companionEvent, now).action !== "speak")
      continue;
    const score = priority(event, profile);
    if (!best || score >= best.priority) best = { event, priority: score };
  }
  return best?.event ?? null;
}

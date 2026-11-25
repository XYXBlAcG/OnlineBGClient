import {
  companionProfileSchema,
  participationPolicySchema,
  type ActorRef,
  type CompanionProfile,
  type ContextFact,
  type SpeakerView,
} from "companion-core";
import { z } from "zod";
import type { ChatMessage } from "./social";

const companionAiProfileSchema = companionProfileSchema.omit({
  name: true,
  avatar: true,
});
export type CompanionAiProfile = z.infer<typeof companionAiProfileSchema>;

export {
  aiProviderSettingsSchema,
  aiProviderFormatSchema,
  aiProviderFormatInfo,
  aiProviderNeedsKey,
  defaultAiProviderSettings,
} from "./ai-provider";
export type { AiProviderSettings, AiProviderFormat } from "./ai-provider";
import {
  aiProviderSettingsSchema,
  defaultAiProviderSettings,
} from "./ai-provider";

export const llmDecisionKinds = ["uno"] as const;
export function supportsLlmDecisions(kind: string): boolean {
  return llmDecisionKinds.some((supported) => supported === kind);
}

export const aiConfigCommandSchema = z.object({
  type: z.literal("ai-config"),
  id: z.string().max(80).optional(),
  requestId: z.string().min(1).max(80).optional(),
  token: z.string(),
  provider: aiProviderSettingsSchema,
  apiKey: z.string().max(500).default(""),
});
export type AiConfigCommand = z.infer<typeof aiConfigCommandSchema>;

export const aiTestCommandSchema = z.object({
  type: z.literal("ai-test"),
  id: z.string().max(80).optional(),
  token: z.string(),
  requestId: z.string().min(1).max(80),
  provider: aiProviderSettingsSchema,
  apiKey: z.string().max(500).default(""),
});
export type AiTestCommand = z.infer<typeof aiTestCommandSchema>;

export const aiClearCommandSchema = z.object({
  type: z.literal("ai-clear"),
  token: z.string(),
  requestId: z.string().min(1).max(80),
});

export const companionConfigSchema = z
  .object({
    profile: companionAiProfileSchema,
    policy: participationPolicySchema,
    provider: aiProviderSettingsSchema.default(defaultAiProviderSettings),
    aiSeatIndex: z.number().int().min(0).max(63).nullable().default(null),
  })
  .refine(
    (config) => config.profile.source.kind === "local",
    "当前只支持本地 AI",
  );
export type CompanionConfig = z.infer<typeof companionConfigSchema>;

export const defaultCompanionProfile: CompanionAiProfile = {
  id: "table-ai",
  persona:
    "你是这张牌桌上的 AI 玩家，聊天时保持自己的性格，短句、轻松，不替其他玩家做决定。",
  source: { kind: "local" },
};

export const defaultCompanionConfig: CompanionConfig =
  companionConfigSchema.parse({
    profile: defaultCompanionProfile,
    policy: {},
  });

export interface PublicRoomContext {
  game: string;
  phase: "lobby" | "playing" | "finished";
  players: string[];
  recentChat: ChatMessage[];
}

const phaseNames: Record<PublicRoomContext["phase"], string> = {
  lobby: "等待开始",
  playing: "进行中",
  finished: "已结束",
};

export function buildCompanionView(
  context: PublicRoomContext,
  profile: CompanionProfile,
  trigger: ChatMessage,
): SpeakerView {
  const actor: ActorRef = {
    id: `companion:${profile.id}`,
    kind: "companion",
    name: profile.name,
  };
  const facts: ContextFact[] = [
    {
      id: "persona",
      kind: "persona",
      text: profile.persona,
      priority: 100,
    },
    {
      id: "room",
      kind: "public",
      text: `游戏：${context.game}\n阶段：${phaseNames[context.phase]}\n玩家：${context.players.join("、")}`,
      priority: 80,
    },
  ];
  const history = context.recentChat.filter(
    (message) => message.id !== trigger.id,
  );
  if (history.length)
    facts.push({
      id: "chat",
      kind: "chat",
      text: history
        .map((message) => `${message.name}：${message.text}`)
        .join("\n"),
      priority: 40,
    });
  facts.push({
    id: "event",
    kind: "event",
    text: `${trigger.name}：${trigger.text}`,
    priority: 100,
  });
  return { actor, facts };
}

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


export const aiProviderFormatSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
]);
export type AiProviderFormat = z.infer<typeof aiProviderFormatSchema>;

export const aiProviderSettingsSchema = z.object({
  format: aiProviderFormatSchema.default("openai"),
  baseUrl: z.string().trim().max(500).default(""),
  model: z.string().trim().max(120).default(""),
  temperature: z.number().min(0).max(2).default(0.8),
  contextWindow: z.number().int().min(1024).max(1_000_000).default(8192),
  maxOutputTokens: z.number().int().min(16).max(4096).default(160),
  timeoutMs: z.number().int().min(1000).max(120000).default(20000),
});
export type AiProviderSettings = z.infer<typeof aiProviderSettingsSchema>;
export const defaultAiProviderSettings: AiProviderSettings =
  aiProviderSettingsSchema.parse({});

export const aiProviderFormatInfo = {
  openai: {
    label: "OpenAI 兼容",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
  },
  anthropic: {
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    needsKey: true,
  },
  gemini: {
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    needsKey: true,
  },
  ollama: {
    label: "Ollama",
    baseUrl: "http://127.0.0.1:11434",
    needsKey: false,
  },
} as const;

export function aiProviderNeedsKey(format: AiProviderFormat): boolean {
  return aiProviderFormatInfo[format].needsKey;
}

export const aiConfigCommandSchema = z.object({
  type: z.literal("ai-config"),
  token: z.string(),
  provider: aiProviderSettingsSchema,
  apiKey: z.string().max(500).default(""),
});
export type AiConfigCommand = z.infer<typeof aiConfigCommandSchema>;

export const companionConfigSchema = z
  .object({
    profile: companionAiProfileSchema,
    policy: participationPolicySchema,
    provider: aiProviderSettingsSchema.default(defaultAiProviderSettings),
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
  const history = context.recentChat.filter((message) => message.id !== trigger.id);
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

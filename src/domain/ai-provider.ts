import { z } from "zod";

export const aiProviderFormatSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "opencode",
  "ollama",
]);
export type AiProviderFormat = z.infer<typeof aiProviderFormatSchema>;

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
  opencode: {
    label: "OpenCode Go",
    baseUrl: "https://opencode.ai/inference/go/openai/v1",
    needsKey: true,
  },
  ollama: {
    label: "Ollama",
    baseUrl: "http://127.0.0.1:11434",
    needsKey: false,
  },
} as const;

export function normalizeAiBaseUrl(
  format: AiProviderFormat,
  raw: string,
): string {
  const url = new URL(raw.trim() || aiProviderFormatInfo[format].baseUrl);
  if (url.username || url.password || url.search || url.hash)
    throw new Error("接口地址不能包含账号、密钥、查询参数或片段");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    throw new Error("远程 AI 接口必须使用 HTTPS；本机接口可使用 HTTP");
  return url.toString().replace(/\/+$/, "");
}

export const aiProviderSettingsSchema = z
  .object({
    format: aiProviderFormatSchema.default("openai"),
    baseUrl: z.string().trim().max(500).default(""),
    model: z.string().trim().max(120).default(""),
    compatibility: z.enum(["standard", "reasoning"]).default("standard"),
    temperature: z.number().min(0).max(2).default(0.8),
    contextWindow: z.number().int().min(1024).max(1_000_000).default(8192),
    maxOutputTokens: z.number().int().min(16).max(4096).default(160),
    timeoutMs: z.number().int().min(1000).max(120000).default(20000),
  })
  .superRefine((value, context) => {
    try {
      normalizeAiBaseUrl(value.format, value.baseUrl);
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["baseUrl"],
        message: error instanceof Error ? error.message : "接口地址无效",
      });
    }
    if (value.format === "anthropic" && value.temperature > 1)
      context.addIssue({
        code: "custom",
        path: ["temperature"],
        message: "Anthropic 随机性必须在 0–1 之间",
      });
    if (value.maxOutputTokens >= value.contextWindow)
      context.addIssue({
        code: "custom",
        path: ["maxOutputTokens"],
        message: "输出上限必须小于上下文窗口",
      });
  });
export type AiProviderSettings = z.infer<typeof aiProviderSettingsSchema>;
export const defaultAiProviderSettings: AiProviderSettings =
  aiProviderSettingsSchema.parse({});

export function aiProviderNeedsKey(format: AiProviderFormat): boolean {
  return aiProviderFormatInfo[format].needsKey;
}

export function aiProviderScope(provider: AiProviderSettings): string {
  return `${provider.format}:${new URL(normalizeAiBaseUrl(provider.format, provider.baseUrl)).origin}`;
}

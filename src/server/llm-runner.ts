import {
  LlmError,
  estimateTokens,
  type LlmProvider,
  type LlmRequest,
  type LlmTextResult,
  type LlmUsage,
} from "companion-core";
import {
  aiProviderSettingsSchema,
  type AiProviderSettings,
} from "../domain/companion";

export interface LlmRunnerOptions {
  provider: LlmProvider | null;
  model: string;
  temperature?: number;
  contextWindow?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export class LlmRunner {
  private provider: LlmProvider | null;
  private config: AiProviderSettings;
  private active = new Set<AbortController>();

  constructor(options: LlmRunnerOptions) {
    this.provider = options.provider;
    this.config = aiProviderSettingsSchema.parse(options);
  }

  get configured(): boolean {
    return this.provider !== null;
  }
  get settings(): AiProviderSettings {
    return { ...this.config };
  }

  configure(provider: LlmProvider, settings: AiProviderSettings): void {
    const next = aiProviderSettingsSchema.parse(settings);
    this.clear();
    this.provider = provider;
    this.config = next;
  }

  clear(): void {
    for (const request of this.active) request.abort();
    this.active.clear();
    this.provider = null;
  }

  async complete(
    system: string,
    user: string,
    outputCap?: number,
    timeoutCap?: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const provider = this.provider;
    if (!provider) throw new Error("AI 未配置");
    if (signal?.aborted) throw new LlmError("AI 请求已取消", "abort");
    const settings = this.settings;
    const maxOutputTokens = Math.min(
      outputCap ?? settings.maxOutputTokens,
      settings.maxOutputTokens,
    );
    if (
      estimateTokens(system) + estimateTokens(user) + maxOutputTokens >
      settings.contextWindow
    )
      throw new LlmError("AI 上下文超出已配置的预算", "invalid-output");
    const timeoutMs = Math.min(
      timeoutCap ?? settings.timeoutMs,
      settings.timeoutMs,
    );
    const timeout = new AbortController();
    const lifetime = new AbortController();
    this.active.add(lifetime);
    const combined = AbortSignal.any([
      timeout.signal,
      lifetime.signal,
      ...(signal ? [signal] : []),
    ]);
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    let onAbort: () => void = () => {};
    const cancelled = new Promise<never>((_resolve, reject) => {
      onAbort = () =>
        reject(
          new LlmError(
            timeout.signal.aborted ? "AI 请求超时" : "AI 请求已取消",
            timeout.signal.aborted ? "timeout" : "abort",
          ),
        );
      if (combined.aborted) onAbort();
      else combined.addEventListener("abort", onAbort, { once: true });
    });
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await Promise.race([
            provider.generateText({
              model: settings.model,
              system,
              messages: [{ role: "user", content: user }],
              temperature: settings.temperature,
              maxOutputTokens,
              signal: combined,
            }),
            cancelled,
          ]);
          return result.text;
        } catch (error) {
          if (combined.aborted || attempt >= 1 || !retryable(error))
            throw error;
        }
      }
    } finally {
      clearTimeout(timer);
      this.active.delete(lifetime);
      combined.removeEventListener("abort", onAbort);
    }
  }
}

class FakeLlmProvider implements LlmProvider {
  async generateText(request: LlmRequest): Promise<LlmTextResult> {
    const last = request.messages.at(-1)?.content ?? "";
    const text = request.system?.includes("只输出候选编号")
      ? "0"
      : last.includes("你好")
        ? "你好呀，我在桌边看着呢。"
        : /[？?]\s*$/.test(last)
          ? "我先看看牌桌，再告诉你。"
          : "这局有点意思，继续。";
    const usage: LlmUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      latencyMs: 1,
    };
    return { text, usage };
  }

  async generateObject<T>(): Promise<{ object: T; usage: LlmUsage }> {
    throw new Error("fake provider 不支持结构化输出");
  }
}

function retryable(error: unknown): boolean {
  return (
    error instanceof LlmError &&
    (error.code === "network" ||
      (error.code === "http" && (error.status ?? 0) >= 500))
  );
}

export function createLlmRunner(): LlmRunner {
  const fake = process.env.COMPANION_LLM_FAKE === "1";
  return new LlmRunner({
    provider: fake ? new FakeLlmProvider() : null,
    model: fake ? "fake" : "",
  });
}

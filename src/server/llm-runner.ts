import {
  LlmError,
  type LlmProvider,
  type LlmRequest,
  type LlmTextResult,
  type LlmUsage,
} from "companion-core";
import type { AiProviderSettings } from "../domain/companion";

export interface LlmRunnerOptions {
  provider: LlmProvider | null;
  model: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

const DEFAULT_CONTEXT_WINDOW = 8192;
const DEFAULT_MAX_OUTPUT_TOKENS = 160;
const DEFAULT_TIMEOUT_MS = 8000;

export class LlmRunner {
  private provider: LlmProvider | null;
  private model: string;
  private contextWindow: number;
  private maxOutputTokens: number;
  private timeoutMs: number;

  constructor(options: LlmRunnerOptions) {
    this.provider = options.provider;
    this.model = options.model;
    this.contextWindow = options.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
    this.maxOutputTokens =
      options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get configured(): boolean {
    return this.provider !== null;
  }

  configure(provider: LlmProvider, settings: AiProviderSettings): void {
    this.provider = provider;
    this.model = settings.model;
    this.contextWindow = settings.contextWindow;
    this.maxOutputTokens = settings.maxOutputTokens;
    this.timeoutMs = settings.timeoutMs;
  }

  async complete(
    system: string,
    user: string,
    maxOutputTokens = Math.min(32, this.maxOutputTokens),
    timeoutMs = Math.min(8000, this.timeoutMs),
  ): Promise<string> {
    if (!this.provider) throw new Error("AI 未配置");
    return this.generate(system, user, maxOutputTokens, timeoutMs);
  }

  private async generate(
    system: string,
    user: string,
    maxOutputTokens: number,
    timeoutMs: number,
  ): Promise<string> {
    try {
      return await this.attempt(system, user, maxOutputTokens, timeoutMs);
    } catch (error) {
      if (!retryable(error)) throw error;
      return this.attempt(system, user, maxOutputTokens, timeoutMs);
    }
  }

  private async attempt(
    system: string,
    user: string,
    maxOutputTokens: number,
    timeoutMs: number,
  ): Promise<string> {
    const provider = this.provider!;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await provider.generateText({
        system,
        messages: [{ role: "user", content: user }],
        temperature: 0.8,
        maxOutputTokens,
        signal: controller.signal,
      });
      return result.text;
    } finally {
      clearTimeout(timer);
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

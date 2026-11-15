import {
  LlmError,
  OpenAICompatibleProvider,
  type LlmProvider,
  type LlmRequest,
  type LlmTextResult,
  type LlmUsage,
} from "companion-core";
import { randomUUID } from "node:crypto";
import {
  aiProviderFormatInfo,
  aiProviderNeedsKey,
  type AiProviderSettings,
} from "../domain/companion";

const DEFAULT_MAX_OUTPUT_TOKENS = 512;

interface ProviderOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const toTokenCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;

function usageOf(
  input: unknown,
  output: unknown,
  startedAt: number,
): LlmUsage {
  const inputTokens = toTokenCount(input);
  const outputTokens = toTokenCount(output);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: Math.max(0, Math.round(now() - startedAt)),
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function openCodeFetch(apiKey: string): typeof fetch {
  const session = randomUUID();
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${apiKey}`);
    headers.set("user-agent", "OnlineBGClient");
    headers.set("x-opencode-session", session);
    return fetch(input, { ...init, headers });
  };
}

async function postJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new LlmError("LLM 请求已取消", "abort");
    throw new LlmError("LLM 网络请求失败", "network");
  }
  if (!response.ok)
    throw new LlmError(
      `LLM 请求失败：HTTP ${response.status}`,
      "http",
      response.status,
    );
  try {
    return await response.json();
  } catch {
    throw new LlmError("LLM 返回非 JSON", "invalid-output");
  }
}

function unsupportedObject(): never {
  throw new LlmError("该接口格式暂不支持结构化输出", "invalid-output");
}

class AnthropicProvider implements LlmProvider {
  private readonly baseUrl: string;
  constructor(private readonly options: ProviderOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  async generateText(request: LlmRequest): Promise<LlmTextResult> {
    const startedAt = now();
    const data = (await postJson(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model ?? this.options.model,
        max_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        temperature: request.temperature ?? 0.8,
        ...(request.system ? { system: request.system } : {}),
        messages: request.messages,
      }),
      signal: request.signal,
    })) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: unknown; output_tokens?: unknown };
    };
    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("")
      .trim();
    if (!text) throw new LlmError("LLM 返回内容为空", "invalid-output");
    return {
      text,
      usage: usageOf(
        data.usage?.input_tokens,
        data.usage?.output_tokens,
        startedAt,
      ),
    };
  }

  async generateObject<T>(): Promise<{ object: T; usage: LlmUsage }> {
    return unsupportedObject();
  }
}

class GeminiProvider implements LlmProvider {
  private readonly baseUrl: string;
  constructor(private readonly options: ProviderOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  async generateText(request: LlmRequest): Promise<LlmTextResult> {
    const startedAt = now();
    const url = `${this.baseUrl}/models/${encodeURIComponent(
      request.model ?? this.options.model,
    )}:generateContent?key=${encodeURIComponent(this.options.apiKey ?? "")}`;
    const data = (await postJson(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: request.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        ...(request.system
          ? { systemInstruction: { parts: [{ text: request.system }] } }
          : {}),
        generationConfig: {
          temperature: request.temperature ?? 0.8,
          maxOutputTokens:
            request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: request.signal,
    })) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: unknown;
        candidatesTokenCount?: unknown;
      };
    };
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new LlmError("LLM 返回内容为空", "invalid-output");
    return {
      text,
      usage: usageOf(
        data.usageMetadata?.promptTokenCount,
        data.usageMetadata?.candidatesTokenCount,
        startedAt,
      ),
    };
  }

  async generateObject<T>(): Promise<{ object: T; usage: LlmUsage }> {
    return unsupportedObject();
  }
}

class OllamaProvider implements LlmProvider {
  private readonly baseUrl: string;
  constructor(private readonly options: ProviderOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
  }

  async generateText(request: LlmRequest): Promise<LlmTextResult> {
    const startedAt = now();
    const messages = request.system
      ? [{ role: "system", content: request.system }, ...request.messages]
      : request.messages;
    const data = (await postJson(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: request.model ?? this.options.model,
        messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.8,
          num_predict: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: request.signal,
    })) as {
      message?: { content?: string };
      prompt_eval_count?: unknown;
      eval_count?: unknown;
    };
    const text = data.message?.content?.trim();
    if (!text) throw new LlmError("LLM 返回内容为空", "invalid-output");
    return {
      text,
      usage: usageOf(data.prompt_eval_count, data.eval_count, startedAt),
    };
  }

  async generateObject<T>(): Promise<{ object: T; usage: LlmUsage }> {
    return unsupportedObject();
  }
}

export function createAiProvider(
  settings: AiProviderSettings,
  apiKey: string,
): LlmProvider {
  const model = settings.model.trim();
  if (!model) throw new Error("请填写模型名称");
  const key = apiKey.trim();
  if (aiProviderNeedsKey(settings.format) && !key)
    throw new Error("请填写 API Key");
  const baseUrl =
    settings.baseUrl.trim() || aiProviderFormatInfo[settings.format].baseUrl;
  if (settings.format === "openai" || settings.format === "opencode")
    return new OpenAICompatibleProvider({
      baseUrl,
      apiKey: key,
      model,
      timeoutMs: settings.timeoutMs,
      ...(settings.format === "opencode"
        ? { fetch: openCodeFetch(key) }
        : {}),
    });
  if (settings.format === "anthropic")
    return new AnthropicProvider({ baseUrl, apiKey: key, model });
  if (settings.format === "gemini")
    return new GeminiProvider({ baseUrl, apiKey: key, model });
  return new OllamaProvider({ baseUrl, model });
}

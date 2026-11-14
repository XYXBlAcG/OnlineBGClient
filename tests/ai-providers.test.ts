import { afterEach, describe, expect, it, vi } from "vitest";
import { aiProviderSettingsSchema } from "../src/domain/companion";
import { createAiProvider } from "../src/server/ai-providers";

const settings = (
  overrides: Partial<ReturnType<typeof aiProviderSettingsSchema.parse>>,
) =>
  aiProviderSettingsSchema.parse({
    format: "openai",
    baseUrl: "https://ai.test/v1",
    model: "test-model",
    ...overrides,
  });

const jsonResponse = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const callsOf = (fetchImpl: typeof fetch) =>
  (
    fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }
  ).mock.calls;

afterEach(() => vi.unstubAllGlobals());

describe("createAiProvider", () => {
  it("validates model and key", () => {
    expect(() => createAiProvider(settings({ model: "" }), "key")).toThrow(
      "模型",
    );
    expect(() =>
      createAiProvider(settings({ format: "anthropic" }), ""),
    ).toThrow("API Key");
    expect(() =>
      createAiProvider(settings({ format: "openai" }), "key"),
    ).not.toThrow();
  });

  it("calls the Anthropic messages API", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "你好" }],
        usage: { input_tokens: 2, output_tokens: 3 },
      }),
    ) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchImpl);

    const result = await createAiProvider(
      settings({ format: "anthropic", model: "claude" }),
      "secret",
    ).generateText({ messages: [{ role: "user", content: "hi" }] });

    expect(result.text).toBe("你好");
    expect(result.usage).toMatchObject({ inputTokens: 2, outputTokens: 3 });
    const [url, init] = callsOf(fetchImpl)[0]!;
    expect(url).toBe("https://ai.test/v1/messages");
    expect(init.headers).toMatchObject({
      "x-api-key": "secret",
      "anthropic-version": "2023-06-01",
    });
  });

  it("calls the Gemini generateContent API", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "嗨" }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      }),
    ) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchImpl);

    const result = await createAiProvider(
      settings({ format: "gemini", model: "gemini-test" }),
      "secret",
    ).generateText({ messages: [{ role: "user", content: "hi" }] });

    expect(result.text).toBe("嗨");
    const [url] = callsOf(fetchImpl)[0]!;
    expect(url).toContain(
      "/models/gemini-test:generateContent?key=secret",
    );
  });

  it("calls native Ollama chat without a key", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        message: { content: "哦" },
        prompt_eval_count: 4,
        eval_count: 2,
      }),
    ) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchImpl);

    const result = await createAiProvider(
      settings({
        format: "ollama",
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen",
      }),
      "",
    ).generateText({ messages: [{ role: "user", content: "hi" }] });

    expect(result.text).toBe("哦");
    expect(result.usage.totalTokens).toBe(6);
    const [url] = callsOf(fetchImpl)[0]!;
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
  });
});

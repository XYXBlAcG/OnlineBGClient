import { describe, expect, it, vi } from "vitest";
import {
  LlmError,
  type LlmProvider,
  type LlmRequest,
  type LlmTextResult,
  type LlmUsage,
} from "companion-core";
import { LlmRunner } from "../src/server/llm-runner";

const usage = (): LlmUsage => ({
  inputTokens: 1,
  outputTokens: 1,
  totalTokens: 2,
  latencyMs: 1,
});

const createProvider = (reply = "收到") => {
  const calls: LlmRequest[] = [];
  const provider: LlmProvider = {
    generateText: vi.fn(async (request: LlmRequest): Promise<LlmTextResult> => {
      calls.push(request);
      return { text: reply, usage: usage() };
    }),
    generateObject: vi.fn(async () => {
      throw new Error("not used");
    }) as unknown as LlmProvider["generateObject"],
  };
  return { provider, calls };
};

describe("LlmRunner", () => {
  it("stays unconfigured without a provider", async () => {
    const runner = new LlmRunner({ provider: null, model: "none" });
    expect(runner.configured).toBe(false);
    await expect(runner.complete("system", "user")).rejects.toThrow("未配置");
  });

  it("completes with the requested token budget", async () => {
    const { provider, calls } = createProvider("1");
    const runner = new LlmRunner({ provider, model: "test" });
    await expect(runner.complete("system", "user", 8, 1000)).resolves.toBe(
      "1",
    );
    expect(calls[0]).toMatchObject({
      system: "system",
      messages: [{ role: "user", content: "user" }],
      maxOutputTokens: 8,
    });
  });

  it("retries a network failure once", async () => {
    let calls = 0;
    const provider: LlmProvider = {
      generateText: vi.fn(async () => {
        calls++;
        if (calls === 1) throw new LlmError("network down", "network");
        return { text: "重试成功", usage: usage() };
      }),
      generateObject: vi.fn(async () => {
        throw new Error("not used");
      }) as unknown as LlmProvider["generateObject"],
    };
    const runner = new LlmRunner({ provider, model: "test" });
    await expect(runner.complete("system", "user")).resolves.toBe("重试成功");
    expect(calls).toBe(2);
  });

  it("does not retry rate limits", async () => {
    let calls = 0;
    const provider: LlmProvider = {
      generateText: vi.fn(async () => {
        calls++;
        throw new LlmError("rate limited", "http", 429);
      }),
      generateObject: vi.fn(async () => {
        throw new Error("not used");
      }) as unknown as LlmProvider["generateObject"],
    };
    const runner = new LlmRunner({ provider, model: "test" });
    await expect(runner.complete("system", "user")).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("aborts on timeout", async () => {
    const provider: LlmProvider = {
      generateText: (request) =>
        new Promise<LlmTextResult>((_resolve, reject) => {
          request.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
      generateObject: vi.fn(async () => {
        throw new Error("not used");
      }) as unknown as LlmProvider["generateObject"],
    };
    const runner = new LlmRunner({ provider, model: "test", timeoutMs: 5 });
    await expect(runner.complete("system", "user")).rejects.toThrow();
  });
});

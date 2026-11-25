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
    await expect(runner.complete("system", "user", 8, 1000)).resolves.toBe("1");
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
    const runner = new LlmRunner({ provider, model: "test", timeoutMs: 1000 });
    await expect(runner.complete("system", "user")).rejects.toThrow();
  });
});

it("applies configured model, temperature and caps to every call", async () => {
  const { provider, calls } = createProvider();
  const { aiProviderSettingsSchema } = await import("../src/domain/companion");
  const runner = new LlmRunner({ provider: null, model: "" });
  runner.configure(
    provider,
    aiProviderSettingsSchema.parse({
      model: "chosen-model",
      temperature: 0,
      maxOutputTokens: 16,
    }),
  );
  await runner.complete("system", "user", 120, 8000);
  expect(calls[0]).toMatchObject({
    model: "chosen-model",
    temperature: 0,
    maxOutputTokens: 16,
  });
});

it("enforces cancellation even if the provider ignores the signal", async () => {
  const provider = {
    generateText: () => new Promise<LlmTextResult>(() => {}),
    generateObject: async () => {
      throw new Error("unused");
    },
  };
  const runner = new LlmRunner({ provider, model: "test" });
  const abort = new AbortController();
  const pending = runner.complete("sys", "user", 16, 1000, abort.signal);
  abort.abort();
  await expect(pending).rejects.toMatchObject({ code: "abort" });
});

it("rejects an oversized prompt before sending data", async () => {
  const { provider, calls } = createProvider();
  const runner = new LlmRunner({
    provider,
    model: "test",
    contextWindow: 1024,
  });
  await expect(runner.complete("x".repeat(10000), "user")).rejects.toThrow(
    "上下文",
  );
  expect(calls).toHaveLength(0);
});

it("shares one deadline across retries", async () => {
  vi.useFakeTimers();
  let calls = 0;
  const provider: LlmProvider = {
    generateText: async () => {
      calls++;
      if (calls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        throw new LlmError("network", "network");
      }
      return new Promise(() => {});
    },
    generateObject: async () => {
      throw new Error("unused");
    },
  };
  try {
    const runner = new LlmRunner({ provider, model: "test", timeoutMs: 1000 });
    const rejected = expect(
      runner.complete("sys", "user"),
    ).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(calls).toBe(2);
  } finally {
    vi.useRealTimers();
  }
});

it("clearing the provider aborts all in-flight requests", async () => {
  const provider: LlmProvider = {
    generateText: () => new Promise(() => {}),
    generateObject: async () => {
      throw new Error("unused");
    },
  };
  const runner = new LlmRunner({ provider, model: "test" });
  const first = expect(runner.complete("sys", "one")).rejects.toMatchObject({
    code: "abort",
  });
  const second = expect(runner.complete("sys", "two")).rejects.toMatchObject({
    code: "abort",
  });
  runner.clear();
  await Promise.all([first, second]);
  expect(runner.configured).toBe(false);
});

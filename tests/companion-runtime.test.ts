import { describe, expect, it, vi } from "vitest";
import {
  LlmError,
  type CompanionProfile,
  type LlmProvider,
  type LlmRequest,
  type LlmTextResult,
  type LlmUsage,
} from "companion-core";
import {
  companionConfigSchema,
  defaultCompanionProfile,
  type CompanionConfig,
  type PublicRoomContext,
} from "../src/domain/companion";
import type { ChatMessage } from "../src/domain/protocol";
import {
  CompanionRuntime,
  type CompanionRoomPort,
  type CompanionRuntimeOptions,
} from "../src/server/companion";

const usage = (): LlmUsage => ({
  inputTokens: 1,
  outputTokens: 1,
  totalTokens: 2,
  latencyMs: 1,
});

const config = (
  mode: "mention-only" | "chatty" = "mention-only",
  overrides: Partial<CompanionConfig["policy"]> = {},
): CompanionConfig =>
  companionConfigSchema.parse({
    profile: defaultCompanionProfile,
    policy: {
      enabled: true,
      mode,
      cooldownMs: 8000,
      maxPerMinute: 3,
      maxPerPlay: 30,
      ...overrides,
    },
  });

const trigger = (text = "@青竹 你好", id = "m1"): ChatMessage => ({
  id,
  sequence: 1,
  sender: "seat-1",
  name: "甲",
  time: 1000,
  type: "text",
  text,
  source: "human",
});

class FakeRoom implements CompanionRoomPort {
  readonly id = "room-1";
  hasEnded = false;
  playId: string | undefined = "play-1";
  readonly config: { companion: CompanionConfig };
  readonly messages: ChatMessage[] = [];
  constructor(companion: CompanionConfig) {
    this.config = { companion };
  }
  companionProfile(): CompanionProfile {
    return {
      id: defaultCompanionProfile.id,
      name: "青竹",
      avatar: "🤖",
      persona: defaultCompanionProfile.persona,
      source: defaultCompanionProfile.source,
    };
  }
  publicContext(): PublicRoomContext {
    return { game: "UNO", phase: "playing", players: ["甲"], recentChat: [] };
  }
  addCompanionMessage(triggerId: string, text: string): ChatMessage | undefined {
    const id = `companion:${triggerId}`;
    if (this.messages.some((message) => message.id === id)) return undefined;
    const message: ChatMessage = {
      id,
      sequence: this.messages.length + 1,
      sender: "companion:table-ai",
      name: "青竹",
      time: Date.now(),
      type: "text",
      text,
      source: "ai",
    };
    this.messages.push(message);
    return message;
  }
}

const createProvider = (reply = "收到") => {
  const calls: LlmRequest[] = [];
  const generateText = vi.fn(async (request: LlmRequest): Promise<LlmTextResult> => {
    calls.push(request);
    return { text: reply, usage: usage() };
  });
  const provider: LlmProvider = {
    generateText,
    generateObject: vi.fn(async () => {
      throw new Error("not used");
    }) as unknown as LlmProvider["generateObject"],
  };
  return { provider, calls };
};

const setup = (options: Partial<CompanionRuntimeOptions> = {}) => {
  const { provider, calls } = createProvider();
  const publish = vi.fn();
  const log = vi.fn();
  const runtime = new CompanionRuntime({
    provider,
    model: "test-model",
    now: () => now,
    publish,
    log,
    ...options,
  });
  return { runtime, calls, publish, log };
};

let now = 100_000;

describe("CompanionRuntime", () => {
  it("only replies to mentions in mention-only mode", async () => {
    const { runtime, calls, publish } = setup();
    const room = new FakeRoom(config("mention-only"));

    await runtime.maybeReply(room, trigger("大家好", "m0"));
    expect(calls).toHaveLength(0);

    await runtime.maybeReply(room, trigger("@青竹 你好", "m1"));
    expect(calls).toHaveLength(1);
    expect(room.messages).toHaveLength(1);
    expect(room.messages[0]).toMatchObject({ source: "ai", text: "收到" });
    expect(publish).toHaveBeenCalledWith("room-1");

    const request = calls[0]!;
    expect(request.system).toContain("青竹");
    expect(request.system).toContain("不编造手牌");
    expect(request.messages[0]?.content).toContain("甲：@青竹 你好");
  });

  it("replies to ordinary chat in chatty mode", async () => {
    const { runtime, calls } = setup();
    const room = new FakeRoom(config("chatty"));
    await runtime.maybeReply(room, trigger("大家好", "m1"));
    expect(calls).toHaveLength(1);
  });

  it("respects cooldown and limits", async () => {
    const { runtime, calls } = setup();
    const room = new FakeRoom(config("mention-only", { maxPerMinute: 1 }));
    now = 100_000;
    await runtime.maybeReply(room, trigger("@青竹 一", "m1"));
    expect(calls).toHaveLength(1);

    now = 101_000;
    await runtime.maybeReply(room, trigger("@青竹 二", "m2"));
    expect(calls).toHaveLength(1);

    now = 161_000;
    await runtime.maybeReply(room, trigger("@青竹 三", "m3"));
    expect(calls).toHaveLength(2);

    now = 170_000;
    await runtime.maybeReply(room, trigger("@青竹 四", "m4"));
    expect(calls).toHaveLength(2);
  });

  it("resets the per-play limit when a new play starts", async () => {
    const { runtime, calls } = setup();
    const room = new FakeRoom(config("mention-only", { maxPerPlay: 1 }));
    now = 100_000;
    await runtime.maybeReply(room, trigger("@青竹 一", "m1"));
    now = 120_000;
    await runtime.maybeReply(room, trigger("@青竹 二", "m2"));
    expect(calls).toHaveLength(1);

    room.playId = "play-2";
    now = 140_000;
    await runtime.maybeReply(room, trigger("@青竹 三", "m3"));
    expect(calls).toHaveLength(2);
  });

  it("stays silent when disabled, unconfigured, or the room has ended", async () => {
    const { runtime, calls } = setup();
    const disabled = new FakeRoom({
      ...config("chatty"),
      policy: { ...config("chatty").policy, enabled: false },
    });
    await runtime.maybeReply(disabled, trigger("大家好", "m1"));
    expect(calls).toHaveLength(0);

    const unconfigured = new CompanionRuntime({
      provider: null,
      model: "none",
      now: () => now,
    });
    expect(unconfigured.configured).toBe(false);
    await unconfigured.maybeReply(new FakeRoom(config("chatty")), trigger("hi"));
    expect(calls).toHaveLength(0);

    const ended = new FakeRoom(config("chatty"));
    ended.hasEnded = true;
    await runtime.maybeReply(ended, trigger("大家好", "m2"));
    expect(calls).toHaveLength(0);
  });

  it("logs provider failures and stays silent", async () => {
    const log = vi.fn();
    const provider: LlmProvider = {
      generateText: vi.fn(async () => {
        throw new Error("provider down");
      }),
      generateObject: vi.fn(async () => {
        throw new Error("not used");
      }) as unknown as LlmProvider["generateObject"],
    };
    const runtime = new CompanionRuntime({
      provider,
      model: "test",
      now: () => now,
      log,
    });
    const room = new FakeRoom(config("chatty"));
    await runtime.maybeReply(room, trigger("大家好", "m1"));
    expect(room.messages).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("provider down"));
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
    const runtime = new CompanionRuntime({
      provider,
      model: "test",
      now: () => now,
    });
    const room = new FakeRoom(config("chatty"));
    await runtime.maybeReply(room, trigger("大家好", "m1"));
    expect(calls).toBe(2);
    expect(room.messages[0]).toMatchObject({ text: "重试成功" });
  });

  it("does not retry rate limits or invalid output", async () => {
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
    const runtime = new CompanionRuntime({
      provider,
      model: "test",
      now: () => now,
    });
    const room = new FakeRoom(config("chatty"));
    await runtime.maybeReply(room, trigger("大家好", "m1"));
    expect(calls).toBe(1);
    expect(room.messages).toHaveLength(0);
  });

  it("times out without writing a message", async () => {
    const log = vi.fn();
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
    const runtime = new CompanionRuntime({
      provider,
      model: "test",
      timeoutMs: 5,
      now: () => now,
      log,
    });
    const room = new FakeRoom(config("chatty"));
    await runtime.maybeReply(room, trigger("大家好", "m1"));
    expect(room.messages).toHaveLength(0);
    expect(log).toHaveBeenCalled();
  });
});

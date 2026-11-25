import { defaultAiProviderSettings } from "../src/domain/companion";
import { describe, expect, it, vi } from "vitest";
import type { CompanionProfile } from "companion-core";
import {
  companionConfigSchema,
  defaultCompanionProfile,
  type CompanionConfig,
  type PublicRoomContext,
} from "../src/domain/companion";
import type { ChatMessage } from "../src/domain/protocol";
import type { TableEvent } from "../src/domain/table-mind/model";
import {
  TableMind,
  type TableMindRoom,
  type TableMindRunner,
} from "../src/server/table-mind/runtime";

const profile: CompanionProfile = {
  id: defaultCompanionProfile.id,
  name: "青竹",
  avatar: "🤖",
  persona: defaultCompanionProfile.persona,
  source: defaultCompanionProfile.source,
};

const config = (
  mode: "mention-only" | "chatty" = "mention-only",
  overrides: Partial<CompanionConfig["policy"]> = {},
): CompanionConfig =>
  companionConfigSchema.parse({
    profile: defaultCompanionProfile,
    policy: {
      enabled: true,
      mode,
      cooldownMs: 0,
      maxPerMinute: 10,
      maxPerPlay: 100,
      ...overrides,
    },
  });

const chatEvent = (text: string, id = "m1"): TableEvent => ({
  id,
  seq: 1,
  version: 1,
  at: 1000,
  kind: "chat",
  actor: "seat-1",
  actorName: "甲",
  label: text,
  public: true,
});

const actionEvent = (id = "a1"): TableEvent => ({
  id,
  seq: 2,
  version: 2,
  at: 1000,
  kind: "action",
  actor: "seat-1",
  actorName: "甲",
  label: "出 🔴红 5️⃣",
  public: true,
});

class FakeRoom implements TableMindRoom {
  readonly id = "room-1";
  hasEnded = false;
  paused = false;
  version = 1;
  playId: string | undefined = "play-1";
  readonly config: { companion: CompanionConfig };
  readonly messages: ChatMessage[] = [];
  events: TableEvent[] = [];
  constructor(companion: CompanionConfig) {
    this.config = { companion };
  }
  companionProfile(): CompanionProfile {
    return profile;
  }
  publicContext(): PublicRoomContext {
    return {
      game: "UNO",
      phase: "playing",
      players: ["甲", "青竹"],
      recentChat: this.messages,
    };
  }
  addCompanionMessage(
    triggerId: string,
    text: string,
  ): ChatMessage | undefined {
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
  drainTableEvents(): TableEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}

const runner = (reply = "收到"): TableMindRunner => ({
  configured: true,
  settings: { ...defaultAiProviderSettings, model: "test" },
  clear: vi.fn(),
  configure: vi.fn(),
  complete: vi.fn(async () => reply),
});

describe("TableMind social reactions", () => {
  it("replies to a mention in mention-only mode", async () => {
    const r = runner();
    const publish = vi.fn();
    const mind = new TableMind(r, { log: vi.fn(), publish, now: () => 1000 });
    const room = new FakeRoom(config("mention-only"));
    room.events = [chatEvent("@青竹 你好")];
    await mind.tick(room);
    expect(room.messages[0]).toMatchObject({ text: "收到", source: "ai" });
    expect(publish).toHaveBeenCalledWith(room.id);
    expect(r.complete).toHaveBeenCalledWith(
      expect.stringContaining("只输出回复正文"),
      expect.stringContaining("@青竹 你好"),
      120,
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("stays silent on ordinary chat in mention-only mode", async () => {
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn(), now: () => 1000 });
    const room = new FakeRoom(config("mention-only"));
    room.events = [chatEvent("大家好")];
    await mind.tick(room);
    expect(r.complete).not.toHaveBeenCalled();
    expect(room.messages).toHaveLength(0);
  });

  it("reacts to a game action in chatty mode", async () => {
    const r = runner("这步不错");
    const mind = new TableMind(r, { log: vi.fn(), now: () => 1000 });
    const room = new FakeRoom(config("chatty"));
    room.events = [actionEvent()];
    await mind.tick(room);
    expect(room.messages[0]).toMatchObject({ text: "这步不错" });
  });

  it("responds once for a batch of mention and action events", async () => {
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn(), now: () => 1000 });
    const room = new FakeRoom(config("chatty"));
    room.events = [actionEvent(), chatEvent("@青竹 你怎么看")];
    await mind.tick(room);
    expect(r.complete).toHaveBeenCalledTimes(1);
    expect(room.messages).toHaveLength(1);
  });

  it("includes recent table events in the social prompt", async () => {
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn(), now: () => 1000 });
    const room = new FakeRoom(config("mention-only"));
    room.events = [actionEvent(), chatEvent("@青竹 你好")];
    await mind.tick(room);
    expect(
      (r.complete as ReturnType<typeof vi.fn>).mock.calls[0]![1],
    ).toContain("出 🔴红 5️⃣");
  });

  it("enforces cooldown", async () => {
    let now = 100_000;
    const r = runner();
    const mind = new TableMind(r, { log: vi.fn(), now: () => now });
    const room = new FakeRoom(config("mention-only", { cooldownMs: 5000 }));
    room.events = [chatEvent("@青竹 一", "m1")];
    await mind.tick(room);
    expect(room.messages).toHaveLength(1);

    now = 102_000;
    room.events = [chatEvent("@青竹 二", "m2")];
    await mind.tick(room);
    expect(room.messages).toHaveLength(1);

    now = 106_000;
    room.events = [chatEvent("@青竹 三", "m3")];
    await mind.tick(room);
    expect(room.messages).toHaveLength(2);
  });

  it("does not block the tick on provider failure", async () => {
    const r = runner();
    r.complete = vi.fn(async () => {
      throw new Error("provider down");
    });
    const log = vi.fn();
    const mind = new TableMind(r, { log, now: () => 1000 });
    const room = new FakeRoom(config("mention-only"));
    room.events = [chatEvent("@青竹 你好")];
    await expect(mind.tick(room)).resolves.toBeUndefined();
    expect(room.messages).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("provider-error"));
  });

  it("stays silent when disabled or unconfigured", async () => {
    const disabled = runner();
    const disabledMind = new TableMind(disabled, {
      log: vi.fn(),
      now: () => 1000,
    });
    const disabledRoom = new FakeRoom({
      ...config("mention-only"),
      policy: { ...config("mention-only").policy, enabled: false },
    });
    disabledRoom.events = [chatEvent("@青竹 你好")];
    await disabledMind.tick(disabledRoom);
    expect(disabled.complete).not.toHaveBeenCalled();

    const unconfigured = { ...runner(), configured: false };
    const unconfiguredMind = new TableMind(unconfigured, {
      log: vi.fn(),
      now: () => 1000,
    });
    const unconfiguredRoom = new FakeRoom(config("mention-only"));
    unconfiguredRoom.events = [chatEvent("@青竹 你好")];
    await unconfiguredMind.tick(unconfiguredRoom);
    expect(unconfigured.complete).not.toHaveBeenCalled();
  });
});

it("keeps the complete current trigger instead of silently dropping a longer message", async () => {
  const { buildSocialPrompt } = await import("../src/domain/table-mind/social");
  const trigger = "本轮请回应这段消息".repeat(40);
  const prompt = buildSocialPrompt(
    {
      actor: { kind: "companion", id: profile.id, name: profile.name },
      facts: [{ id: "event", kind: "event", text: trigger, priority: 100 }],
    },
    profile,
    [],
    [],
    { ...defaultAiProviderSettings, model: "test" },
  );
  expect(prompt.user).toContain(trigger);
});

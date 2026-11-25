import { describe, expect, it } from "vitest";
import { Gateway } from "../src/domain/gateway";
import {
  aiProviderSettingsSchema,
  buildCompanionView,
  companionConfigSchema,
  defaultCompanionConfig,
  defaultCompanionProfile,
} from "../src/domain/companion";
import { Room } from "../src/domain/room";
import type { ChatMessage } from "../src/domain/protocol";
import type { CompanionProfile } from "companion-core";

const enabledCompanion = (mode: "mention-only" | "chatty" = "mention-only") =>
  companionConfigSchema.parse({
    profile: defaultCompanionProfile,
    policy: { ...defaultCompanionConfig.policy, enabled: true, mode },
  });

const createRoom = () =>
  new Room("companion", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });

describe("room companion", () => {
  it("starts disabled and lets only the host change it", () => {
    const room = createRoom();
    const host = room.claim("甲");
    expect(room.snapshot(host).companion).toMatchObject({
      enabled: false,
      name: "青竹",
      configured: false,
      available: true,
    });

    room.setCompanion(host, enabledCompanion());
    expect(room.snapshot(host).companion.enabled).toBe(true);
    expect(room.snapshot(host).chat.at(-1)).toMatchObject({
      type: "system",
      source: "system",
    });
    expect(room.snapshot(host).chat.at(-1)?.text).toContain("已接入聊天");

    const guestRoom = new Room("guest", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    guestRoom.claim("甲");
    const guest = guestRoom.claim("乙");
    expect(() => guestRoom.setCompanion(guest, enabledCompanion())).toThrow(
      "只有房主",
    );
  });

  it("uses the selected AI seat for chat identity", () => {
    const room = new Room("selected-ai", {
      kind: "uno",
      humans: 1,
      ai: [
        { difficulty: "easy", name: "青竹" },
        { difficulty: "easy", name: "松风" },
      ],
      team: false,
      training: false,
      companion: {
        ...defaultCompanionConfig,
        policy: { ...defaultCompanionConfig.policy, enabled: true },
        aiSeatIndex: 1,
      },
    });
    const host = room.claim("甲");
    expect(room.snapshot(host).companion.name).toBe("松风");
    expect(room.addCompanionMessage("m1", "你好")?.name).toBe("松风");

    room.setCompanion(host, {
      ...enabledCompanion(),
      aiSeatIndex: 1,
    });
    expect(room.snapshot(host).companion.name).toBe("松风");

    room.setCompanion(host, {
      ...enabledCompanion(),
      aiSeatIndex: 0,
    });
    expect(room.snapshot(host).companion.name).toBe("青竹");

    const id = room.seats[0].id!;
    room.changeGame(host, {
      config: {
        ...room.config,
        ai: [
          { difficulty: "easy", name: "青竹" },
          { difficulty: "easy", name: "松风" },
        ],
        companion: { ...room.config.companion, aiSeatIndex: 0 },
      },
      retain: [id],
      members: [id],
      endCurrent: false,
    });
    expect(room.snapshot(host).companion.name).toBe("青竹");
  });

  it("requests lean choices for LLM seats without enabling audit", () => {
    const room = new Room("llm-seat", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "normal", name: "青竹", driver: "llm" }],
      team: false,
      training: false,
    });
    const token = room.claim("我");
    expect(room.snapshot(token).seats[1]?.driver).toBe("llm");
    room.start(token);
    for (let index = 0; index < 8; index++) {
      const request = room.aiRequest();
      if (request) {
        expect(request.driver).toBe("llm");
        expect(request.audit).toBe(false);
        expect(request.choices).toBe(true);
        return;
      }
      const candidates = room.snapshot(token).candidates;
      const action = candidates[0]?.action;
      if (!action) break;
      room.act(token, `move-${index}`, room.version, action);
    }
    throw new Error("未进入 LLM 席位决策");
  });

  it("configures an AI seat driver from the preparation panel", () => {
    const room = new Room("prep-driver", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "normal", name: "青竹" }],
      team: false,
      training: false,
    });
    const host = room.claim("甲");
    room.configureSeat(host, 1, {
      type: "ai",
      difficulty: "hard",
      name: "青竹",
      driver: "llm",
    });
    expect(room.snapshot(host).seats[1]).toMatchObject({
      name: "青竹",
      difficulty: "hard",
      driver: "llm",
    });
    expect(room.config.ai[0]?.driver).toBe("llm");
  });

  it("requires an AI seat before enabling", () => {
    const room = new Room("no-ai", {
      kind: "expedition",
      humans: 1,
      ai: [],
      team: false,
      training: false,
    });
    const host = room.claim("甲");
    expect(room.snapshot(host).companion.available).toBe(false);
    expect(() => room.setCompanion(host, enabledCompanion())).toThrow(
      "请先在准备页面添加 AI 席位",
    );
  });

  it("stores non-secret AI provider settings only for the host", () => {
    const room = createRoom();
    const host = room.claim("甲");
    const provider = aiProviderSettingsSchema.parse({
      format: "anthropic",
      baseUrl: "https://ai.test/v1",
      model: "claude",
    });
    room.setAiProvider(host, provider);
    expect(room.snapshot(host).config.companion.provider).toMatchObject({
      format: "anthropic",
      model: "claude",
    });

    const guestRoom = new Room("provider-guest", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    });
    guestRoom.claim("甲");
    const guest = guestRoom.claim("乙");
    expect(() => guestRoom.setAiProvider(guest, provider)).toThrow("只有房主");
  });

  it("writes companion messages through the room chat entry", () => {
    const room = createRoom();
    const host = room.claim("甲");
    room.setCompanion(host, enabledCompanion());

    const reply = room.addCompanionMessage("m1", "你好呀");
    expect(reply).toMatchObject({
      id: "companion:m1",
      type: "text",
      source: "ai",
      sender: "companion:table-ai",
      name: "青竹",
    });
    expect(room.addCompanionMessage("m1", "重复")).toBeUndefined();
    expect(
      room.snapshot(host).chat.filter((m) => m.id === "companion:m1"),
    ).toHaveLength(1);

    const human = room.chat(host, "h1", "大家好啊");
    expect(human).toMatchObject({ id: "h1", type: "text", source: "human" });
    expect(room.chat(host, "h1", "重复")).toBeUndefined();
  });

  it("keeps hidden game state out of the public context", () => {
    const room = new Room("hidden", {
      kind: "sgs",
      humans: 2,
      ai: [
        { difficulty: "easy", name: "" },
        { difficulty: "easy", name: "" },
      ],
      team: false,
      training: false,
    });
    const first = room.claim("甲");
    room.claim("乙");
    for (const seat of room.seats)
      if (seat.token) room.setReady(seat.token, true);
    room.start(first);

    const context = room.publicContext();
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain("playerHandCard");
    expect(serialized).not.toContain("roles");
    expect(serialized).not.toContain('"state"');
    expect(context.players).toContain("甲");
    expect(context.game).toBe("三国杀");

    const trigger: ChatMessage = {
      id: "m1",
      sequence: 1,
      sender: "seat-1",
      name: "甲",
      time: Date.now(),
      type: "text",
      text: "这局怎么打？",
      source: "human",
    };
    const profile: CompanionProfile = {
      id: defaultCompanionProfile.id,
      name: "青竹",
      avatar: "🤖",
      persona: defaultCompanionProfile.persona,
      source: defaultCompanionProfile.source,
    };
    const view = buildCompanionView(context, profile, trigger);
    expect(JSON.stringify(view)).not.toContain("playerHandCard");
    expect(view.facts.map((fact) => fact.id)).toContain("event");
  });
});

describe("gateway companion command", () => {
  it("returns the persisted chat message and updates the room config", () => {
    const gateway = new Gateway();
    const session = gateway.handle({
      type: "create",
      name: "甲",
      config: {
        kind: "uno",
        humans: 1,
        ai: [{ difficulty: "easy", name: "" }],
        team: false,
        training: false,
      },
    }).session;

    const sent = gateway.handle(
      { type: "chat", token: session.token, id: "m1", text: "你好" },
      session,
    );
    expect(sent.response).toMatchObject({ type: "ack", id: "m1" });
    expect(sent.chatMessage).toMatchObject({
      id: "m1",
      type: "text",
      source: "human",
    });

    expect(() =>
      gateway.handle(
        {
          type: "ai-config",
          token: session.token,
          provider: aiProviderSettingsSchema.parse({
            format: "openai",
            baseUrl: "https://ai.test/v1",
            model: "gpt",
          }),
          apiKey: "secret",
        },
        session,
      ),
    ).toThrow("AI 配置只能由房主服务处理");

    gateway.handle(
      {
        type: "companion",
        token: session.token,
        config: enabledCompanion("chatty"),
      },
      session,
    );
    expect(
      gateway.rooms.get(session.room)!.snapshot(session.token).companion,
    ).toMatchObject({ enabled: true, name: "青竹" });
  });
});

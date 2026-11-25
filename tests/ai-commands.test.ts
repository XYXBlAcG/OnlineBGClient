import { afterEach, expect, it, vi } from "vitest";
import { Gateway } from "../src/domain/gateway";
import { AiCommands } from "../src/server/ai-commands";
import { RoomTableMinds } from "../src/server/table-mind/rooms";
import {
  aiProviderSettingsSchema,
  defaultCompanionConfig,
} from "../src/domain/companion";
import type { Response as RoomResponse } from "../src/domain/protocol";
afterEach(() => vi.unstubAllGlobals());
const create = (gateway: Gateway, name: string) =>
  gateway.handle({
    type: "create",
    name,
    config: {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "normal", name: "青竹" }],
      team: false,
      training: false,
    },
  }).session;
it("keeps each room provider independent and sends an explicit save/clear result", async () => {
  const calls: { model: string; key: string | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      calls.push({
        model: JSON.parse(init.body).model,
        key: new Headers(init.headers).get("authorization"),
      });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "收到" } }] }),
        { headers: { "content-type": "application/json" } },
      );
    }),
  );
  const gateway = new Gateway(),
    minds = new RoomTableMinds(),
    commands = new AiCommands(gateway, minds, () => {});
  const sessions = [
    create(gateway, "甲"),
    create(gateway, "乙"),
    create(gateway, "丙"),
  ];
  const replies: RoomResponse[] = [];
  const signal = new AbortController().signal;
  for (const [index, session] of sessions.slice(0, 2).entries()) {
    commands.handle(
      {
        type: "ai-config",
        token: session.token,
        requestId: `save-${index}`,
        apiKey: `SYNTHETIC-${index}`,
        provider: aiProviderSettingsSchema.parse({ model: `model-${index}` }),
      },
      session,
      (reply) => replies.push(reply),
      signal,
    );
  }
  const room = gateway.rooms.get(sessions[0].room)!;
  expect(minds.get(gateway.rooms.get(sessions[2].room)!).configured).toBe(
    false,
  );
  room.setCompanion(sessions[0].token, {
    ...structuredClone(defaultCompanionConfig),
    policy: { ...defaultCompanionConfig.policy, enabled: true },
  });
  room.chat(sessions[0].token, "mention", "@青竹 你好");
  await minds.get(room).tick(room);
  expect(calls).toEqual([{ model: "model-0", key: "Bearer SYNTHETIC-0" }]);
  commands.handle(
    { type: "ai-clear", token: sessions[0].token, requestId: "clear" },
    sessions[0],
    (reply) => replies.push(reply),
    signal,
  );
  expect(minds.get(room).configured).toBe(false);
  expect(minds.get(gateway.rooms.get(sessions[1].room)!).configured).toBe(true);
  expect(replies).toHaveLength(3);
  expect(replies.every((reply) => reply.type === "ai-status" && reply.ok)).toBe(
    true,
  );
  expect(JSON.stringify(room.export())).not.toContain("SYNTHETIC");
});
it("rejects another connection identity before contacting a provider", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const gateway = new Gateway(),
    minds = new RoomTableMinds(),
    commands = new AiCommands(gateway, minds, () => {});
  const a = create(gateway, "甲"),
    b = create(gateway, "乙");
  const replies: RoomResponse[] = [];
  commands.handle(
    {
      type: "ai-config",
      token: a.token,
      requestId: "spoof",
      apiKey: "SYNTHETIC",
      provider: aiProviderSettingsSchema.parse({ model: "test" }),
    },
    b,
    (reply) => replies.push(reply),
    new AbortController().signal,
  );
  expect(replies[0]).toMatchObject({ type: "ai-status", ok: false });
  expect(fetch).not.toHaveBeenCalled();
});
it("revokes a configured room when the credential owner's identity disappears", () => {
  const gateway = new Gateway(),
    minds = new RoomTableMinds();
  const commands = new AiCommands(gateway, minds, () => {});
  const session = create(gateway, "甲");
  const room = gateway.rooms.get(session.room)!;
  commands.handle(
    {
      type: "ai-config",
      token: session.token,
      requestId: "save",
      apiKey: "SYNTHETIC",
      provider: aiProviderSettingsSchema.parse({ model: "test" }),
    },
    session,
    () => {},
    new AbortController().signal,
  );
  expect(minds.get(room).configured).toBe(true);
  room.seats[0].token = "new-owner";
  expect(room.canManage(session.token)).toBe(false);
  expect(minds.get(room).configured).toBe(false);
  expect(() => commands.reconcile()).not.toThrow();
});
it("cancels an in-flight provider test when its configuration is cleared", async () => {
  let requestSignal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url, init) => {
      requestSignal = init.signal;
      return new Promise(() => {});
    }),
  );
  const gateway = new Gateway(),
    minds = new RoomTableMinds();
  const commands = new AiCommands(gateway, minds, () => {});
  const session = create(gateway, "甲");
  const replies: RoomResponse[] = [];
  const lifetime = new AbortController();
  try {
    commands.handle(
      {
        type: "ai-test",
        token: session.token,
        requestId: "pending-test",
        apiKey: "SYNTHETIC",
        provider: aiProviderSettingsSchema.parse({ model: "test" }),
      },
      session,
      (reply) => replies.push(reply),
      lifetime.signal,
    );
    await vi.waitFor(() => expect(requestSignal).toBeDefined());
    commands.handle(
      { type: "ai-clear", token: session.token, requestId: "clear" },
      session,
      (reply) => replies.push(reply),
      lifetime.signal,
    );
    expect(requestSignal!.aborted).toBe(true);
    await vi.waitFor(() =>
      expect(replies).toContainEqual(
        expect.objectContaining({
          type: "ai-test",
          requestId: "pending-test",
          ok: false,
        }),
      ),
    );
  } finally {
    lifetime.abort();
  }
});

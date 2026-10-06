import { expect, it } from "vitest";
import { Gateway } from "../src/domain/gateway";
import { configSchema } from "../src/domain/protocol";
import { Room } from "../src/domain/room";
it("keeps an ordinary game's AI paused across storage restoration and restricts control to its host", () => {
  const gateway = new Gateway();
  const created = gateway.handle({
    type: "create",
    name: "房主",
    config: {
      kind: "tq",
      humans: 1,
      ai: [{ difficulty: "hard" }],
      aiDelayMs: 0,
      team: false,
      training: false,
    },
  });
  const room = gateway.rooms.get(created.session.room)!;
  gateway.handle(
    { type: "start", token: created.session.token },
    created.session,
  );
  expect(() => room.setAiRunning("unknown", false)).toThrow("房间身份无效");
  gateway.handle(
    { type: "ai-run", token: created.session.token, enabled: false },
    created.session,
  );
  expect(room.paused).toBe(true);
  const restored = Room.restore(room.export());
  restored.claim("", created.session.token);
  expect(restored.snapshot(created.session.token).aiPaused).toBe(true);
  restored.setAiRunning(created.session.token, true);
  expect(restored.paused).toBe(false);
});
it("hosts six hard checkers AIs without a human seat and exposes only the public board", () => {
  const gateway = new Gateway();
  const created = gateway.handle({
    type: "create",
    name: "性能测试",
    config: {
      kind: "tq",
      humans: 0,
      ai: Array.from({ length: 6 }, () => ({ difficulty: "hard" })),
      aiDelayMs: 0,
      team: false,
      training: false,
    },
  });
  const room = gateway.rooms.get(created.session.room)!;
  gateway.handle(
    { type: "start", token: created.session.token },
    created.session,
  );
  const snapshot = room.snapshot(created.session.token);
  expect(snapshot.actor).toBe(-1);
  expect(snapshot.canManage).toBe(true);
  expect(snapshot.seats).toHaveLength(6);
  expect(snapshot.state?.kind).toBe("tq");
  expect(snapshot.candidates).toEqual([]);
  expect(room.aiRequest()?.difficulty).toBe("hard");
  room.updateComputation(0, room.version, {
    status: "completed",
    elapsedMs: 200,
    simulations: 120,
    scoredCandidates: 10,
    threads: 4,
  });
  expect(
    room.snapshot(created.session.token).computation?.completedDecisions,
  ).toBe(1);
  gateway.handle(
    { type: "ai-run", token: created.session.token, enabled: false },
    created.session,
  );
  expect(room.aiRequest()).toBeNull();
  expect(room.snapshot(created.session.token).aiPaused).toBe(true);
  expect(
    room.updateComputation(0, room.version - 1, {
      status: "completed",
      elapsedMs: 10,
      simulations: 1,
      scoredCandidates: 1,
      threads: 1,
    }),
  ).toBe(false);
  gateway.handle(
    { type: "ai-run", token: created.session.token, enabled: true },
    created.session,
  );
  expect(room.aiRequest()).not.toBeNull();
  room.updateComputation(1, room.version, {
    status: "completed",
    elapsedMs: 100,
    simulations: 60,
    scoredCandidates: 10,
    threads: 4,
  });
  expect(
    room.snapshot(created.session.token).computation?.totalSimulations,
  ).toBe(180);
  const restored = Room.restore(room.export());
  restored.claim("", created.session.token);
  expect(restored.snapshot(created.session.token).state?.kind).toBe("tq");
  expect(configSchema.safeParse({ ...room.config, kind: "sgs" }).success).toBe(
    false,
  );
});

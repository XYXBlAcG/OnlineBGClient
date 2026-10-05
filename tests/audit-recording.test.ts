import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Strategy } from "../src/domain/strategy";
it("records audit only on owner opt-in and discards stale calculations after disabling", () => {
  const room = new Room("audit", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
    aiDelayMs: 0,
  });
  const owner = room.claim("甲");
  room.start(owner);
  room.act(owner, "start", room.version, { type: "uno-start" });
  for (let i = 0; i < 20 && !room.aiRequest(); i++)
    room.act(
      owner,
      `human:${i}`,
      room.version,
      room.snapshot(owner).candidates[0].action,
    );
  const request = room.aiRequest();
  if (!request) throw new Error("missing request");
  expect(request.audit).toBe(false);
  const detailed = new Strategy().decide(
    request.observation,
    request.actor,
    request.difficulty,
    request.seed,
  );
  room.acceptDecision(
    {
      actor: detailed.actor,
      chosen: detailed.chosen,
      difficulty: detailed.difficulty,
      simulations: detailed.simulations,
      audit: detailed,
    },
    request.version,
  );
  expect(room.export().decisions).toHaveLength(0);
  expect(room.export().summaries).toHaveLength(0);
  room.setComputation(owner, true, { mode: "multi", threads: 4 });
  expect(room.config.auditEnabled).toBe(true);
  for (let i = 0; i < 20 && !room.aiRequest(); i++)
    room.act(
      owner,
      `next:${i}`,
      room.version,
      room.snapshot(owner).candidates[0].action,
    );
  const enabled = room.aiRequest()!;
  const audit = new Strategy().decide(
    enabled.observation,
    enabled.actor,
    enabled.difficulty,
    enabled.seed,
  );
  const result = {
    actor: audit.actor,
    chosen: audit.chosen,
    difficulty: audit.difficulty,
    simulations: audit.simulations,
    audit,
  };
  room.acceptDecision(result, enabled.version);
  expect(room.export().decisions).toHaveLength(1);
  expect(Room.restore(room.export()).export().decisions).toHaveLength(1);
  const recorded = room.export().replay!.events.length;
  room.setComputation(owner, false, { mode: "single", threads: 1 });
  expect(room.export().replay!.events).toHaveLength(recorded);
  expect(room.queueDecision(result, enabled.version)).toBe(false);
  expect(room.export().decisions).toHaveLength(0);
});

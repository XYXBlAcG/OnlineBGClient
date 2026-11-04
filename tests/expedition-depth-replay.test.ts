import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { Replay } from "../src/domain/replay";
import { ExpeditionAdventure } from "../src/domain/expedition/adventure";
import { ExpeditionStrategy } from "../src/domain/expedition/ai";

it("跨层推进、新职业和多级强化通过真实房间记录回放，驿站检查点可恢复", () => {
  const room = new Room(
    "depth-replay",
    {
      kind: "expedition",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      expedition: { difficulty: "story", ascension: 0 },
    },
    "depth-replay-paired",
  );
  const tokens = [room.claim("星象"), room.claim("祈愿")];
  room.setReady(tokens[1], true);
  room.start(tokens[0]);
  for (let actor = 0; actor < 2; actor++)
    room.act(tokens[actor], `profession-${actor}`, room.version, {
      type: "expedition-action",
      move: { type: "profession", profession: actor + 4 },
    });
  const rules = new ExpeditionAdventure(),
    ai = new ExpeditionStrategy();
  let steps = 0,
    restored = false;
  while (
    room.state?.kind === "expedition" &&
    !rules.finished(room.state) &&
    steps++ < 4000
  ) {
    const state = room.state;
    if (state.view.phase === "waystation" && !restored) {
      expect(Room.restore(room.export()).state).toEqual(state);
      restored = true;
    }
    const actor = rules.actors(state)[0];
    expect(actor).not.toBeUndefined();
    const request = {
      observation: rules.project(state, actor),
      actor,
      difficulty: "normal" as const,
      seed: `depth-replay:${steps}`,
      audit: false,
    };
    const decision = ai
      .score(request, ai.candidates(request))
      .sort((a, b) => b.score - a.score)[0];
    room.act(tokens[actor], `move-${steps}`, room.version, decision.action);
  }
  expect(
    steps,
    JSON.stringify(
      room.state?.kind === "expedition"
        ? {
            phase: room.state.view.phase,
            chapter: room.state.view.chapter,
            floor: room.state.view.floor,
            round: room.state.view.combat.round,
            heroes: room.state.view.combat.heroes.map((h) => ({
              name: h.name,
              hp: h.hp,
              energy: h.energy,
              hand: h.hand.map((c) => c.card),
            })),
            enemies: room.state.view.combat.enemies.map((e) => ({
              name: e.name,
              hp: e.hp,
            })),
            log: room.state.view.combat.log.slice(-8),
          }
        : null,
    ),
  ).toBeLessThan(4000);
  expect(restored).toBe(true);
  const archive = room.export(),
    record = archive.replay!;
  expect(record.expeditionCampaign).toBe(2);
  expect(new Replay(record).frame(record.events.length)).toEqual(room.state);
  expect(Room.restore(archive).state).toEqual(room.state);
}, 15000);

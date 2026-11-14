import { describe, expect, it } from "vitest";
import { defaultCompanionProfile } from "../src/domain/companion";
import { Room } from "../src/domain/room";

describe("room table events", () => {
  it("records game start, chat and actions once and drains them", () => {
    const room = new Room("events", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "normal", name: "青竹" }],
      team: false,
      training: false,
    });
    const token = room.claim("我");
    room.start(token);
    room.chat(token, "c1", "大家好");
    const action = room.snapshot(token).candidates[0]!.action;
    room.act(token, "a1", room.version, action);

    const events = room.drainTableEvents();
    expect(events.map((event) => event.kind)).toEqual([
      "game-start",
      "chat",
      "action",
    ]);
    expect(events[1]).toMatchObject({ label: "大家好", public: true });
    expect(events[2]?.actor).toBe(room.seats[0].id);
    expect(room.drainTableEvents()).toEqual([]);
  });

  it("records companion messages as chat", () => {
    const room = new Room("companion-events", {
      kind: "uno",
      humans: 1,
      ai: [{ difficulty: "normal", name: "青竹" }],
      team: false,
      training: false,
      companion: {
        profile: defaultCompanionProfile,
        policy: {
          enabled: true,
          mode: "chatty",
          cooldownMs: 0,
          maxPerMinute: 10,
          maxPerPlay: 100,
        },
      },
    });
    room.claim("我");
    room.addCompanionMessage("m1", "你好");
    expect(room.drainTableEvents()).toEqual([
      expect.objectContaining({
        kind: "chat",
        label: "你好",
        actor: expect.stringMatching(/^companion:/),
      }),
    ]);
  });
});

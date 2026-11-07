import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import {
  achievementDefinitions,
  achievementsForGame,
  defaultAppStats,
  evaluateAchievements,
  evaluateAppAchievements,
  recordAppCompletion,
  recordAppLaunch,
  recordAppPlaySession,
  recordAppPlayTime,
  type AchievementUnlock,
} from "../src/domain/achievements";
import { gameKinds } from "../src/domain/catalogue";
import { Room } from "../src/domain/room";
import { ClientStore } from "../src/client/storage";

it("registers rare achievements for every game without duplicate ids", () => {
  expect(new Set(achievementDefinitions.map((item) => item.id)).size).toBe(
    achievementDefinitions.length,
  );
  for (const definition of achievementDefinitions) {
    expect(definition.title.length).toBeGreaterThan(1);
    expect(definition.description.length).toBeGreaterThan(6);
    expect(["common", "rare", "epic", "legendary", "mythic"]).toContain(
      definition.rarity,
    );
  }
  for (const game of gameKinds)
    expect(achievementsForGame(game).length).toBeGreaterThanOrEqual(6);
  expect(achievementsForGame("app").length).toBeGreaterThanOrEqual(10);
});

it("does not evaluate achievements for an unfinished replay", () => {
  const room = new Room(
    "achievement-open",
    {
      kind: "tq",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    },
    "achievement-open",
  );
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  const record = room.export().replay;
  expect(record).not.toBeNull();
  expect(evaluateAchievements(record!, 0)).toEqual([]);
});

it("evaluates a finished replay without throwing", () => {
  const room = new Room(
    "achievement-finished",
    {
      kind: "tq",
      humans: 2,
      ai: [],
      team: false,
      training: false,
    },
    "achievement-finished",
  );
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  for (let step = 0; step < 500 && !room.engine.finished(room.state!); step++) {
    const actor = room.engine.actors(room.state!)[0];
    const candidate = room.engine.candidates(room.state!, actor)[0];
    expect(candidate).toBeDefined();
    room.act(tokens[actor], `ach:${step}`, room.version, candidate.action);
  }
  expect(room.engine.finished(room.state!)).toBe(true);
  const record = room.export().replay;
  expect(record).not.toBeNull();
  expect(Array.isArray(evaluateAchievements(record!, 0))).toBe(true);
});

it("records achievements once, counts repeats, and keeps them through cache clearing", async () => {
  const store = new ClientStore();
  const profileId = store.achievementProfileId();
  const base: AchievementUnlock = {
    profileId,
    achievementId: "fxq.three-sixes",
    firstAt: 1,
    lastAt: 1,
    count: 1,
    evidence: {
      room: "room",
      startedAt: 1,
      rulesVersion: "2",
      actor: 0,
      seatName: "我",
      replayFingerprint: "first",
      summary: "飞行棋",
    },
  };
  expect(await store.unlockAchievements([base])).toHaveLength(1);
  expect(await store.unlockAchievements([base])).toHaveLength(0);
  await store.unlockAchievements([
    {
      ...base,
      lastAt: 2,
      evidence: { ...base.evidence, replayFingerprint: "second" },
    },
  ]);
  const saved = await store.achievements();
  expect(saved).toHaveLength(1);
  expect(saved[0].count).toBe(2);
  await store.clearCache({ images: false, audit: false, records: true });
  expect(await store.achievements()).toHaveLength(1);
});

it("derives software achievements and per-game milestones from local stats", () => {
  let stats = defaultAppStats("profile");
  stats = recordAppLaunch(stats);
  expect(evaluateAppAchievements(stats)).toContain("app.first-launch");
  stats = recordAppPlaySession(stats, "room:1", true);
  stats = recordAppPlaySession(stats, "room:1", true);
  expect(stats.multiplayer).toBe(1);
  stats = recordAppCompletion(stats, "room:1", "tq", true);
  stats = recordAppCompletion(stats, "room:1", "tq", true);
  expect(stats.completions).toBe(1);
  expect(stats.wins).toBe(1);
  stats = recordAppPlayTime(stats, 10 * 60 * 60);
  const achievements = evaluateAppAchievements(stats);
  expect(achievements).toEqual(
    expect.arrayContaining([
      "app.first-multiplayer",
      "app.first-completion",
      "app.first-win",
      "app.hours-10",
      "tq.first-clear",
      "tq.first-win",
    ]),
  );
  for (let index = 0; index < 9; index++)
    stats = recordAppCompletion(stats, `room:extra-${index}`, "uno", false);
  expect(evaluateAppAchievements(stats)).toContain("app.completion-10");
});

it("keeps app stats through cache clearing", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "app-stats-profile",
    setItem: () => {},
  });
  const store = new ClientStore();
  const stats = await store.updateAppStats(recordAppLaunch);
  expect(stats.launches).toBe(1);
  await store.clearCache({ images: false, audit: false, records: true });
  expect((await store.appStats()).launches).toBe(1);
  vi.unstubAllGlobals();
});

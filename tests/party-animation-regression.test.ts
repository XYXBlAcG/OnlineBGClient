import { restoredPartySavings } from "./fixtures/party-savings";
import { expect, it } from "vitest";
import { Room } from "../src/domain/room";
import { partyActionSchema, partyAppearance } from "../src/domain/party";
it("整桌投掷只扣一次费用，并在事件和回放中保留全桌范围与完整时长", () => {
  const room = new Room("all", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      party: { enabled: true },
    }),
    a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  const action = partyActionSchema.parse({
    type: "buy",
    item: "cometEgg",
    target: "table",
    round: room.snapshot(a).party.round,
  });
  const event = room.partyAction(a, "all", action)!;
  expect(event.audience).toBe("table");
  expect(event.duration).toBe(6000);
  expect(partyAppearance(event).scope).toBe("room");
  expect(room.snapshot(a).party.balances[room.seats[0].id!].coins).toBe(20);
  expect(room.export().replay!.party![0].event.audience).toBe("table");
});
import {
  partyFrame,
  partyParticles,
  samplePartyParticle,
  type PartyParticlePose,
} from "../src/client/party/particles";
import {
  partyItems,
  partyPatterns,
  type PartyEvent,
} from "../src/domain/party";
it.each(partyPatterns)(
  "%s 在低粒子预算下，10 秒演出的各阶段保持可见",
  (pattern) => {
    const event: PartyEvent = {
      id: "visual",
      item: "cometEgg",
      time: 0,
      duration: 10000,
      from: "a",
      target: "b",
      caption: "测试",
      seed: 4,
      density: 1,
      visual: {
        name: "测试",
        emoji: "🥚",
        pattern,
        color: "#ffaa00",
        duration: 10000,
        scale: 1,
        speed: 1,
        density: 1,
        scope: "room",
      },
    };
    const particles = partyParticles(4, 53, 160),
      pose: PartyParticlePose = {
        x: 0,
        y: 0,
        size: 0,
        rotation: 0,
        alpha: 0,
        visible: false,
      };
    for (const now of [1000, 3000, 5000, 7000, 9000, 9600]) {
      const frame = partyFrame(event, now, 390, 700);
      expect(
        particles.some((p) => {
          samplePartyParticle(frame, p, pose);
          return (
            pose.visible &&
            pose.alpha > 0 &&
            pose.x > -pose.size &&
            pose.x < 390 + pose.size &&
            pose.y > -pose.size &&
            pose.y < 700 + pose.size
          );
        }),
        `${pattern} at ${now}`,
      ).toBe(true);
    }
  },
);
it("每种商品的时间线由目录决定，结束前不提前过期", () => {
  for (const [item, definition] of Object.entries(partyItems)) {
    const event = {
      id: item,
      item,
      time: 1000,
      duration: definition.duration,
      from: "a",
      target: "b",
      caption: definition.name,
      seed: 1,
      density: 1,
    } as PartyEvent;
    expect(
      partyFrame(event, 1000 + definition.duration - 100, 500, 500).fade,
    ).toBeGreaterThan(0);
  }
});
import { PartyPlayback, partyElapsed } from "../src/client/party/timeline";
it("新演出等待绘图准备后完整播放，快照重复推送不重置；重连只恢复剩余部分", () => {
  const event: PartyEvent = {
    id: "live",
    item: "cometEgg",
    from: "a",
    target: "b",
    time: 1000,
    createdAt: 1000,
    duration: 10000,
    seed: 1,
    density: 1,
    caption: "流星鸡蛋",
  };
  const playback = new PartyPlayback();
  expect(playback.project([event], 1100, false).waiting).toBe(1);
  expect(playback.project([event], 6000, true).events[0].time).toBe(6000);
  expect(playback.project([event], 9000, true).events[0].time).toBe(6000);
  expect(new PartyPlayback().project([event], 9000, true).events[0].time).toBe(
    1000,
  );
});

it("客户端时钟差异和重复快照不缩短演出，重连仍按服务器剩余时长恢复", () => {
  const event: PartyEvent = {
    id: "offset",
    item: "cometEgg",
    from: "a",
    target: "b",
    time: 1000,
    createdAt: 1000,
    duration: 10000,
    seed: 1,
    density: 1,
    caption: "蛋雨",
  };
  const playback = new PartyPlayback();
  expect(
    playback.project([event], 100000, true, false, 1100).events[0].time,
  ).toBe(100000);
  expect(
    playback.project([event], 101000, true, false, 2100).events[0].time,
  ).toBe(100000);
  expect(
    new PartyPlayback().project([event], 100000, true, false, 9000).events[0]
      .time,
  ).toBe(92000);
});

it("两次停时依次延长暂停，不让演出时钟倒退或使画面消失", () => {
  let room = new Room("pause", {
      kind: "uno",
      humans: 2,
      ai: [],
      team: false,
      training: false,
      party: { enabled: true },
    }),
    a = room.claim("甲"),
    b = room.claim("乙");
  room.setReady(b, true);
  room.start(a);
  room = restoredPartySavings(room, [a, b]);
  room.partyAction(
    a,
    "egg",
    { type: "buy", item: "cometEgg", target: "table" },
    0,
  );
  room.partyAction(
    a,
    "pause1",
    { type: "buy", item: "timeStop", target: 0 },
    2100,
  );
  room.partyAction(
    b,
    "pause2",
    { type: "buy", item: "timeStop", target: 1 },
    2200,
  );
  const event = room.snapshot(a).party.events[0];
  expect(event.duration).toBe(12000);
  expect(partyElapsed(event, 3200)).toBe(2100);
  expect(partyElapsed(event, 6200)).toBe(2100);
  expect(partyElapsed(event, 8200)).toBe(2200);
});
it("初次重连即使遇到刚发出的效果，也恢复剩余时间；预览保留完整播放", () => {
  const event: PartyEvent = {
    id: "resume",
    item: "cometEgg",
    from: "a",
    target: "b",
    time: 1000,
    createdAt: 1000,
    duration: 10000,
    seed: 1,
    density: 1,
    caption: "蛋雨",
  };
  expect(
    new PartyPlayback(true).project([event], 100000, true, false, 1500)
      .events[0].time,
  ).toBe(99500);
  expect(
    new PartyPlayback().project([event], 100000, true, false, 1500).events[0]
      .time,
  ).toBe(100000);
});

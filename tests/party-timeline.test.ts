import { expect, it, vi } from "vitest";
import {
  eventStatus,
  partyElapsed,
  PartyClock,
} from "../src/client/party/timeline";
import {
  partyBudget,
  partyPreferencesSchema,
} from "../src/client/party/policy";
import type { PartyEvent } from "../src/domain/party";
it("长演出按绝对时间恢复，过期不补播，停时只冻结演出时钟", () => {
  const event: PartyEvent = {
    id: "egg",
    item: "cometEgg",
    from: "a",
    target: "b",
    time: 1000,
    duration: 13000,
    seed: 7,
    caption: "蛋雨",
    density: 1,
    pauses: [{ at: 3000, duration: 3000 }],
  };
  expect(partyElapsed(event, 4000)).toBe(2000);
  expect(partyElapsed(event, 8000)).toBe(4000);
  expect(eventStatus(event, 0)).toBe("queued");
  expect(eventStatus(event, 14000)).toBe("expired");
});
it("不限制高刷新屏，极致档提供更高粒子预算", () => {
  expect(partyPreferencesSchema.parse({}).fps).toBe(0);
  expect(partyPreferencesSchema.parse({ fps: 240 }).fps).toBe(240);
  expect(partyBudget("ultra", false).objects).toBeGreaterThan(2000);
  expect(partyBudget("text", false).objects).toBe(0);
});

it("回放时钟在暂停与倍速切换时保持当前位置", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const clock = new PartyClock(0, 1);
  vi.advanceTimersByTime(500);
  expect(clock.now()).toBe(500);
  clock.setRate(0);
  vi.advanceTimersByTime(1000);
  expect(clock.now()).toBe(500);
  clock.setRate(2);
  vi.advanceTimersByTime(500);
  expect(clock.now()).toBe(1500);
  clock.seek(0);
  expect(clock.now()).toBe(0);
  vi.useRealTimers();
});

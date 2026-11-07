import "fake-indexeddb/auto";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  AchievementGallery,
  AchievementToasts,
} from "../src/client/Achievements";
import { ConnectionStatus } from "../src/client/ConnectionStatus";
import type { AchievementUnlock } from "../src/domain/achievements";
import { Room } from "../src/domain/room";

const unlock: AchievementUnlock = {
  profileId: "profile",
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
    replayFingerprint: "fingerprint",
    summary: "飞行棋",
  },
};

it("renders a rarity-labelled achievement toast", () => {
  const html = renderToStaticMarkup(
    <AchievementToasts items={[unlock]} onDismiss={() => {}} />,
  );
  expect(html).not.toContain("神话成就");
  expect(html).toContain("三连六");
  expect(html).toContain("飞行棋");
  expect(html).toContain('data-rarity="mythic"');
});

it("renders the achievement cabinet and its game shelves", () => {
  const html = renderToStaticMarkup(<AchievementGallery />);
  expect(html).toContain("成就");
  expect(html).toContain("OnlineBGClient");
  expect(html).toContain("飞行棋");
  expect(html).toContain("已解锁");
  expect(html).not.toContain("线索");
  const css = readFileSync("src/client/achievements.css", "utf8");
  expect(css).toContain("background: var(--surface)");
  expect(css).toContain("background: var(--raised)");
  expect(css).toContain("z-index: 6");
  expect(css).toContain("white-space: nowrap");
  expect(css).toContain("var(--shadow-soft)");
  expect(css).not.toContain("#10151d");
  expect(css).not.toContain("线索");
});

it("shows room connection facts without a room code", () => {
  const room = new Room("status", {
    kind: "uno",
    humans: 1,
    ai: [{ difficulty: "easy", name: "" }],
    team: false,
    training: false,
  });
  const token = room.claim("我");
  const snapshot = room.snapshot(token);
  const html = renderToStaticMarkup(
    <ConnectionStatus snapshot={snapshot} network latency={42} />,
  );
  expect(html).toContain("联机房间");
  expect(html).toContain("房主");
  expect(html).toContain("42 ms");
  expect(html).toContain("联机连接");
});

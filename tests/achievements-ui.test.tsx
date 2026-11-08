import "fake-indexeddb/auto";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import {
  AchievementGallery,
  AchievementToasts,
  achievementToastDurations,
  previewAchievementUnlock,
} from "../src/client/Achievements";
import { ConnectionStatus } from "../src/client/ConnectionStatus";
import type { AchievementUnlock } from "../src/domain/achievements";
import { Room } from "../src/domain/room";

afterEach(() => vi.unstubAllGlobals());

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
  expect(html).toContain("同一局连续三次掷出 6");
  expect(html).toContain("飞行棋");
  expect(html).toContain('data-rarity="mythic"');
});

it("keeps higher-rarity achievement toasts on screen longer", () => {
  expect(achievementToastDurations.common).toBeGreaterThan(5600);
  expect(achievementToastDurations.rare).toBeGreaterThan(
    achievementToastDurations.common,
  );
  expect(achievementToastDurations.epic).toBeGreaterThan(
    achievementToastDurations.rare,
  );
  expect(achievementToastDurations.legendary).toBeGreaterThan(
    achievementToastDurations.epic,
  );
  expect(achievementToastDurations.mythic).toBeGreaterThan(
    achievementToastDurations.legendary,
  );
});

it("renders the achievement cabinet, floating detail and test action", () => {
  const html = renderToStaticMarkup(
    <AchievementGallery onTestToast={() => {}} />,
  );
  expect(html).toContain("成就");
  expect(html).toContain("OnlineBGClient");
  expect(html).toContain("飞行棋");
  expect(html).toContain("achievement-list");
  expect(html).toContain("achievement-detail");
  expect(html).toContain("测试成就弹窗");
  expect(html).toContain("搜索成就");
  expect(html).toContain('data-selected="true"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain("已解锁");
  expect(html).not.toContain("线索");
  const css = readFileSync("src/client/achievements.css", "utf8");
  expect(css).toContain("background: var(--surface)");
  expect(css).toContain("background: var(--raised)");
  expect(css).toContain("z-index: 6");
  expect(css).toContain("white-space: nowrap");
  expect(css).toContain("--achievement-detail-space");
  expect(css).toMatch(/\.achievement-detail \{[^}]*position: absolute/);
  expect(css).toMatch(
    /\.achievement-card\[data-selected="true"\] \{[^}]*outline: 2px solid/,
  );
  expect(css).toContain(".achievement-toast-copy small");
  expect(css).not.toMatch(/\.achievement-detail \{[^}]*max-height/);
  expect(css).toContain("var(--shadow-soft)");
  expect(css).not.toContain("#10151d");
  expect(css).not.toContain("线索");
});

it("filters achievements by title and description", async () => {
  vi.stubGlobal("HTMLFormElement", class {});
  vi.stubGlobal("window", {
    setTimeout,
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<AchievementGallery />);
  });
  const search = tree.root.findByProps({ "aria-label": "搜索成就" });
  await act(async () => {
    search.props.onChange({ target: { value: "连续三次" } });
  });
  const cards = tree.root.findAll(
    (node) =>
      node.type === "button" && node.props.className === "achievement-card",
  );
  expect(cards).toHaveLength(1);
  expect(cards[0].findAllByType("strong")[0].children.join("")).toBe("三连六");
  await act(async () => tree.unmount());
});

it("builds a preview unlock from a real achievement definition", () => {
  const preview = previewAchievementUnlock();
  expect(preview?.achievementId).toBe("fxq.three-sixes");
  expect(preview?.evidence.summary).toBe("成就弹窗预览");
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

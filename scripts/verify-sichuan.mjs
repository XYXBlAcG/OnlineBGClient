import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { TestService } from "./service-harness.mjs";
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/sichuan-fixtures",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/sichuan-fixtures/domain/room.js"),
  { RoomStore } = await import("../.tmp/sichuan-fixtures/server/storage.js");
const directory = await mkdtemp(join(tmpdir(), "sichuan-real-")),
  room = new Room(
    "sichuan",
    {
      kind: "scmj",
      humans: 3,
      ai: [{ difficulty: "normal", name: "青竹" }],
      team: false,
      training: false,
      aiDelayMs: 0,
    },
    "browser",
  );
const tokens = ["甲", "乙", "丙"].map((name) => room.claim(name));
room.seats.forEach((s) => (s.ready = true));
room.start(tokens[0]);
const store = new RoomStore(join(directory, "rooms.sqlite"));
store.save(room);
store.close();
const service = new TestService(directory, {
    entry: "src-tauri/resources/hosting/main.mjs",
    staticRoot: resolve("src-tauri/resources/hosting/web"),
  }),
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      (existsSync(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      )
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
    headless: true,
  });
const errors = [],
  pages = [];
let moves = 0;
try {
  const endpoint = await service.start();
  await mkdir("artifacts/review", { recursive: true });
  for (let actor = 0; actor < 3; actor++) {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });
    pages.push(page);
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(
      ({ token, room }) => {
        localStorage.setItem(`room:${location.origin}:${room}`, token);
        localStorage.setItem(
          "onlinebg.preferences",
          JSON.stringify({ motion: true, enhancedGameMotion: true }),
        );
        const Native = window.WebSocket;
        window.WebSocket = class extends Native {
          constructor(...args) {
            super(...args);
            window.testSocket = this;
            this.addEventListener("message", (event) => {
              const data = JSON.parse(event.data);
              if (data.type === "snapshot") window.testSnapshot = data.snapshot;
              if (data.type === "patch")
                window.testSnapshot = {
                  ...window.testSnapshot,
                  ...data.changes,
                };
              if (data.type === "error")
                (window.testErrors ||= []).push(data.message);
            });
          }
        };
        window.motionEvents = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          const event = this.closest(".game-motion-copy")?.dataset.motionEvent;
          if (event) window.motionEvents.push(event);
          return animate.apply(this, args);
        };
      },
      { token: tokens[actor], room: room.id },
    );
    await page.goto(`${endpoint}/?room=${room.id}`);
    await page
      .getByLabel("昵称", { exact: true })
      .fill(["甲", "乙", "丙"][actor]);
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await expect(page.locator(".scmj-table")).toBeVisible();
  }
  for (const [actor, page] of pages.entries()) {
    const state = await page.evaluate(() => window.testSnapshot);
    expect(
      state.state.view.hands
        .filter((_, i) => i !== actor)
        .flat()
        .every((t) => t < 0),
    ).toBe(true);
    const exchange = state.candidates.find(
      (c) => c.action.move.type === "exchange",
    ).action.move;
    for (const tile of exchange.tiles)
      await page
        .locator(`.scmj-hand [data-motion-key="scmj-tile-${tile}"]`)
        .click();
    await page.getByRole("button", { name: "确认换三张", exact: true }).click();
  }
  for (const page of pages) {
    await expect(
      page.getByRole("button", { name: "定缺万", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "定缺万", exact: true }).click();
  }
  const page = pages[0];
  await expect(
    page
      .locator(".scmj-actions")
      .getByRole("button", { name: "出牌", exact: true }),
  ).toBeVisible();
  const initial = await page.evaluate(() => window.testSnapshot),
    discard = initial.candidates.find((c) => c.action.move.type === "discard")
      .action.move.tile;
  await page
    .locator(`.scmj-hand [data-motion-key="scmj-tile-${discard}"]`)
    .click();
  await page.getByRole("button", { name: "出牌", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.motionEvents.includes("card")))
    .toBe(true);
  for (const size of [
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const device = await page.context().newCDPSession(page);
    await device.send("Emulation.setTouchEmulationEnabled", {
      enabled: size.width < 900,
    });

    await page.waitForTimeout(100);
    const bounds = await page.evaluate(() => {
      const table = document
          .querySelector(".scmj-table")
          .getBoundingClientRect(),
        hand = document.querySelector(".scmj-hand").getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        bottom: hand.bottom,
        height: innerHeight,
        table: table.bottom,
      };
    });
    expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewport + 1);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.table + 1);
    await page.screenshot({
      path: `artifacts/review/sichuan-live-${size.width}.png`,
    });
  }
  const desktop = await page.context().newCDPSession(page);
  await desktop.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "对局记录", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "聊天", exact: true }).click();
  await page.getByLabel("消息", { exact: true }).fill("四川麻将联机测试");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await pages[1].getByRole("button", { name: "聊天", exact: true }).click();
  await expect(pages[1].locator(".chat-messages")).toContainText(
    "四川麻将联机测试",
  );
  await page.getByRole("button", { name: "牌桌规则", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "血战到底 · 本房规则", exact: true }),
  ).toContainText("不能吃");
  await page
    .getByRole("dialog", { name: "血战到底 · 本房规则", exact: true })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "托管", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "取消托管", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消托管", exact: true }).click();
  for (let step = 0; step < 550; step++) {
    const states = await Promise.all(
      pages.map((p) => p.evaluate(() => window.testSnapshot)),
    );
    if (states[0].finished) break;
    let acted = false;
    for (let actor = 0; actor < 3; actor++) {
      const snapshot = states[actor];
      if (!snapshot.candidates.length) continue;
      const candidates = snapshot.candidates,
        choice =
          candidates.find(
            (c) =>
              c.action.move.type === "win" ||
              (c.action.move.type === "respond" &&
                c.action.move.choice === "win"),
          ) ||
          candidates.find(
            (c) =>
              c.action.move.type === "respond" &&
              c.action.move.choice === "pass",
          ) ||
          candidates.find((c) => c.action.move.type === "discard") ||
          candidates[0];
      await pages[actor].evaluate(
        ({ token, version, action, id }) =>
          window.testSocket.send(
            JSON.stringify({ type: "action", token, version, action, id }),
          ),
        {
          token: tokens[actor],
          version: snapshot.version,
          action: choice.action,
          id: `browser-${step}-${actor}`,
        },
      );
      await expect
        .poll(() => pages[actor].evaluate(() => window.testSnapshot.version))
        .toBeGreaterThan(snapshot.version);
      acted = true;
      moves++;
      break;
    }
    if (!acted) await page.waitForTimeout(60);
  }
  await expect
    .poll(() => page.evaluate(() => window.testSnapshot.finished))
    .toBe(true);
  console.log("PASS: Sichuan complete multiplayer round");
  const final = await page.evaluate(() => window.testSnapshot);
  expect(final.state.view.scores.reduce((a, b) => a + b, 0)).toBe(0);
  await page.getByRole("button", { name: "查看本局结算", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "四川麻将 · 结算明细", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/review/sichuan-live-settlement.png",
  });
  await page
    .getByRole("dialog", { name: "四川麻将 · 结算明细", exact: true })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "对局记录", exact: true }).click();
  await page.locator(".record-row > button").first().click();
  const replay = page.getByRole("dialog", {
    name: "四川麻将 · 回放",
    exact: true,
  });
  await expect(replay.locator(".scmj-table")).toBeVisible();
  await expect(
    replay.getByRole("button", { name: "结束游戏", exact: true }),
  ).toHaveCount(0);
  await expect(
    replay.getByRole("button", { name: "播放回放", exact: true }),
  ).toBeEnabled();
  await replay.getByRole("button", { name: "播放回放", exact: true }).click();
  await replay.getByRole("button", { name: "暂停回放", exact: true }).click();
  await replay
    .getByRole("button", { name: "关闭", exact: true })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("combobox", { name: "外观主题", exact: true }).click();
  await page.getByRole("option", { name: "深色", exact: true }).click();
  await page
    .getByRole("dialog", { name: "设置", exact: true })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "artifacts/review/sichuan-live-dark.png" });
  const observer = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  observer.on("pageerror", (error) => errors.push(String(error)));
  await observer.goto(endpoint);
  await observer
    .locator(".game-card-main")
    .filter({ hasText: "四川麻将" })
    .click();
  await observer
    .getByRole("combobox", { name: "真人人数", exact: true })
    .click();
  await observer.getByRole("option", { name: "0 人", exact: true }).click();
  await observer
    .getByRole("slider", { name: "AI 动作间隔", exact: true })
    .focus();
  await observer.keyboard.press("Home");
  await observer.getByRole("button", { name: "创建房间", exact: true }).click();
  await observer.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(observer.locator(".scmj-table")).toBeVisible();
  await expect(
    observer.locator(".scmj-hand button:not(:disabled)"),
  ).toHaveCount(0);
  await expect(observer.locator(".scmj-hand svg text")).toHaveCount(0);
  await expect(observer.locator(".scmj-center [role=status]")).toContainText(
    /出牌|响应/,
    { timeout: 30000 },
  );
  await expect(observer.locator(".compute-status")).toContainText("候选");
  expect(errors).toEqual([]);
  for (const p of pages)
    expect(await p.evaluate(() => window.testErrors || [])).toEqual([]);
  await writeFile(
    "artifacts/review/sichuan-verification.json",
    JSON.stringify(
      {
        humanMoves: moves,
        events: await page.evaluate(() => [...new Set(window.motionEvents)]),
        scores: final.state.view.scores,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS Sichuan real server: three browsers + AI, private projection, exchange/lack, discard animations, touch sizes, chat, delegation, full round, zero-sum settlement and replay",
  );
} catch (error) {
  if (pages[0]) {
    await pages[0].screenshot({ path: "artifacts/review/sichuan-failure.png" });
    console.log(await pages[0].locator("body").innerText());
  }
  throw error;
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

import { openRoomSetup } from "./browser-controls.mjs";
import { chromium, expect } from "@playwright/test";
import { createServer, request } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import WebSocket, { WebSocketServer } from "ws";
import { SnapshotReplica } from "../src/domain/sync.ts";
import { TestService } from "./service-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "onlinebg-mobile-host-"));
const service = new TestService(directory, {
  entry: "src-tauri/resources/hosting/main.mjs",
  staticRoot: resolve("src-tauri/resources/hosting/web"),
});
const backend = await service.start();
const proxy = createServer((incoming, outgoing) => {
  const forward = request(
    new URL(incoming.url, backend),
    { method: incoming.method, headers: incoming.headers },
    (response) => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    },
  );
  forward.on("error", () => outgoing.end());
  incoming.pipe(forward);
});
const sockets = new WebSocketServer({ server: proxy, path: "/connect" });
const timers = new Set();
const metrics = {
  delayEachDirectionMs: 180,
  fullBytes: 0,
  deltaBytes: 0,
  equivalentFullBytes: 0,
  actions: 0,
  computationRequests: 0,
};
sockets.on("connection", (front) => {
  const upstream = new WebSocket(backend.replace("http:", "ws:") + "/connect");
  const replica = new SnapshotReplica();
  const queued = [];
  const delayed = (callback) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, metrics.delayEachDirectionMs);
    timers.add(timer);
  };
  front.on("message", (data) => {
    const type = JSON.parse(data.toString()).type;
    if (type === "action") metrics.actions++;
    if (type === "computation") metrics.computationRequests++;
    delayed(() => {
      if (upstream.readyState === WebSocket.OPEN)
        upstream.send(data.toString());
      else queued.push(data.toString());
    });
  });
  upstream.on("open", () =>
    queued.splice(0).forEach((data) => upstream.send(data)),
  );
  upstream.on("message", (data) => {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === "snapshot" || parsed.type === "patch") {
      const state = replica.apply(parsed);
      if (parsed.type === "snapshot") metrics.fullBytes += data.length;
      else {
        metrics.deltaBytes += data.length;
        metrics.equivalentFullBytes += Buffer.byteLength(
          JSON.stringify({ type: "snapshot", snapshot: state }),
        );
      }
    }
    delayed(() => {
      if (front.readyState === WebSocket.OPEN) front.send(data.toString());
    });
  });
  front.on("close", () => upstream.close());
  upstream.on("close", () => front.close());
  upstream.on("error", () => front.close());
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const endpoint = `http://127.0.0.1:${proxy.address().port}`;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
  headless: true,
});
const pages = [],
  errors = [];
const choose = async (page, label, text) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: text, exact: true }).click();
};
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext(
      i
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1280, height: 900 } },
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    pages.push(page);
  }
  const [host, first, second] = pages;
  await host.goto(endpoint);
  await choose(host, "真人人数", "2 人");
  await choose(host, "总席位", "2 人");
  await host.getByLabel("昵称", { exact: true }).fill("服务电脑");
  await host.getByRole("button", { name: "跨网络联机", exact: true }).click();
  await host.getByLabel("仅启动服务，不参与游戏").check();
  await host.getByRole("button", { name: "创建房间", exact: true }).click();
  await expect(
    host.getByRole("heading", { name: "服务运行中", exact: true }),
  ).toBeVisible();
  await expect(host.locator(".original-game")).toHaveCount(0);
  const room = (await host.locator(".room-toolbar > strong").innerText())
    .split("·")[1]
    .trim();
  for (const [index, page] of [first, second].entries()) {
    await page.goto(`${endpoint}/?room=${room}`);
    await page.getByLabel("昵称", { exact: true }).fill(`手机${index + 1}`);
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
  }
  await expect(host.locator(".seat-row")).toHaveCount(2);
  await expect(
    host.locator(".seat-row").filter({ hasText: "服务电脑" }),
  ).toHaveCount(0);
  await second.getByRole("button", { name: "准备", exact: true }).click();
  await first.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "我先出牌", exact: true }),
  ).toBeVisible();
  await expect(
    host.getByText("对局进行中 · 电脑不占席位", { exact: true }),
  ).toBeVisible();
  await host.getByRole("button", { name: "打开设置", exact: true }).click();
  await choose(host, "CPU加速模式", "多线程");
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await expect.poll(() => metrics.computationRequests).toBe(1);
  await host.waitForTimeout(900);
  expect(metrics.computationRequests).toBe(1);
  await host.close();
  const feedback = await first
    .getByRole("button", { name: "我先出牌", exact: true })
    .evaluate(async (node) => {
      const start = performance.now();
      node.click();
      node.click();
      node.click();
      await new Promise((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve, 0)),
      );
      const bounds=document.querySelector(".action-feedback").getBoundingClientRect();
      return {
        visible:bounds.height > 0 && bounds.bottom <= innerHeight && bounds.top >= 0,
        elapsed: performance.now() - start,
        busy: document.querySelector(".game-stage").getAttribute("aria-busy"),
      };
    });
  expect(feedback.busy).toBe("true");
  expect(feedback.visible).toBe(true);
  expect(feedback.elapsed).toBeLessThan(120);
  await expect(first.locator(".game-stage")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(metrics.actions).toBe(1);
  await expect(first.locator(".network-latency")).toBeVisible();
  expect(
    parseInt(await first.locator(".network-latency").innerText()),
  ).toBeGreaterThanOrEqual(300);
  await expect(
    first.getByText("有玩家掉线，等待恢复连接", { exact: true }),
  ).toHaveCount(0);
  await first.evaluate(() => {
    window.originalClone = window.structuredClone;
    window.gameClones = 0;
    window.structuredClone = (...args) => {
      window.gameClones++;
      return window.originalClone(...args);
    };
  });
  await second.getByRole("button", { name: /^聊天/ }).click();
  await second.getByLabel("消息", { exact: true }).fill("聊天不重算牌桌");
  await second.getByRole("button", { name: "发送", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "聊天 · 1", exact: true }),
  ).toBeVisible();
  const gameClonesOnChat = await first.evaluate(() => window.gameClones);
  expect(gameClonesOnChat).toBe(0);
  await second.getByRole("button", { name: "收起聊天", exact: true }).click();
  await first.evaluate(() => {
    window.structuredClone = window.originalClone;
  });
  await openRoomSetup(first);
  await choose(first, "下一局游戏", "卡坦岛");
  await first.getByRole("button", { name: "应用", exact: true }).click();
  await first.getByRole("button", { name: "应用配置", exact: true }).click();
  await expect(second.locator(".room-toolbar > strong")).toContainText(
    "卡坦岛",
  );
  await expect(first.locator(".seat-row")).toHaveCount(2);
  await second.getByRole("button", { name: "准备", exact: true }).click();
  await first.getByRole("button", { name: "开始对局", exact: true }).click();
  for (const actor of [0, 0, 1, 1, 1, 1, 0, 0]) {
    const page = actor ? second : first;
    await page
      .locator('.original-game svg circle.cursor-pointer[opacity="0.5"]')
      .first()
      .click();
    await expect(page.locator(".game-stage")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  }
  await expect(first.getByRole("button", { name: /掷骰子/ })).toBeEnabled();
  await mkdir(".tmp/screenshots", { recursive: true });
  await first.screenshot({ path: ".tmp/screenshots/mobile-service-host.png" });
  expect(metrics.deltaBytes).toBeLessThan(metrics.equivalentFullBytes);
  expect(errors).toEqual([]);
  await writeFile(
    ".tmp/mobile-network-metrics.json",
    JSON.stringify({ ...metrics, feedback, gameClonesOnChat }, null, 2),
  );
  console.log(
    "PASS: seat-free service computer, two mobile players, phone room controls, host disconnect without pause, immediate feedback under 360 ms artificial RTT, duplicate tap suppression, incremental bandwidth and Catan switch/setup",
  );
} catch (error) {
  for (const page of pages)
    if (!page.isClosed())
      console.error((await page.locator("body").innerText()).slice(-3500));
  throw error;
} finally {
  await browser.close();
  for (const timer of timers) clearTimeout(timer);
  for (const socket of sockets.clients) socket.terminate();
  await new Promise((resolve) => sockets.close(resolve));
  await new Promise((resolve) => proxy.close(resolve));
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

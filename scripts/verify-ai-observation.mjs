import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-ai-observation-"));
const service = new TestService(directory, {
  entry: "src-tauri/resources/hosting/main.mjs",
  staticRoot: resolve("src-tauri/resources/hosting/web"),
});
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
  headless: true,
});
const errors = [];
const requestedThreads = Number(process.env.AI_TEST_THREADS || 4);
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript((threads) => {
    if (!localStorage.getItem("onlinebg.preferences"))
      localStorage.setItem(
        "onlinebg.preferences",
        JSON.stringify({
          benchmarkVisible: true,
          performance: { mode: "multi", threads },
        }),
      );
  }, requestedThreads);
  await page.goto(endpoint);
  await page.getByRole("button", { name: /连续跳跃与营地竞速/ }).click();
  await page
    .getByRole("button", { name: "6 个困难 AI 性能测试", exact: true })
    .click();
  await page.getByRole("button", { name: "创建房间", exact: true }).click();

  await page.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(page.locator(".original-game[data-game=tq]")).toBeVisible();
  await expect(page.getByLabel("AI计算统计")).toContainText("次/秒", {
    timeout: 60000,
  });
  await expect(page.getByLabel("AI计算统计")).toContainText(
    /已完成 [1-9]\d* 次决策/,
    { timeout: 60000 },
  );
  const available = await page.evaluate(
    () => navigator.hardwareConcurrency || 2,
  );
  await expect(page.getByLabel("AI计算统计")).toContainText(
    `${Math.min(requestedThreads, available)} 线程`,
  );
  await page.getByRole("button", { name: "暂停 AI 测试", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "继续 AI 测试", exact: true }),
  ).toBeVisible();
  const paused = await page.locator(".compute-status").textContent();
  await page.waitForTimeout(500);
  expect(await page.locator(".compute-status").textContent()).toBe(paused);
  const map = page.locator(".fitted-map");
  const original = await map.boundingBox();
  await page.getByRole("button", { name: "缩小地图", exact: true }).click();
  await expect(page.getByLabel("地图缩放")).toHaveText("50%");
  expect((await map.boundingBox()).height).toBeLessThan(original.height * 0.6);
  await page.getByRole("button", { name: "缩小地图", exact: true }).click();
  await expect(page.getByLabel("地图缩放")).toHaveText("25%");
  await expect(page.locator(".original-game [data-game-avatar]")).toHaveCount(6);
  await page.getByRole("button", { name: "继续 AI 测试", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停 AI 测试", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "恢复本地对局", exact: true }).click();
  await expect(page.locator(".original-game[data-game=tq]")).toBeVisible();
  await page.getByRole("button", { name: "暂停 AI 测试", exact: true }).click();
  await expect(page.locator(".original-game [data-game-avatar]")).toHaveCount(6);
  await page.getByRole("button", { name: "结束游戏", exact: true }).click();
  await page.getByRole("button", { name: "确认结束", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "开始对局", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".surface-resize-handle")).toHaveCount(0);
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  const network = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  network.on("pageerror", (error) => errors.push(String(error)));
  await network.addInitScript(() =>
    localStorage.setItem(
      "onlinebg.preferences",
      JSON.stringify({ benchmarkVisible: true }),
    ),
  );
  await network.goto(endpoint);
  await network.getByRole("button", { name: /连续跳跃与营地竞速/ }).click();
  await network
    .getByRole("button", { name: "6 个困难 AI 性能测试", exact: true })
    .click();
  await network
    .getByRole("button", { name: "跨网络联机", exact: true })
    .click();
  await network.getByText("更多设置", { exact: true }).click();
  await network.getByLabel("房间服务地址", { exact: true }).fill(endpoint);
  await network.getByRole("button", { name: "创建房间", exact: true }).click();
  await network.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(network.getByLabel("AI计算统计")).toContainText(
    /已完成 [1-9]\d* 次决策/,
    { timeout: 60000 },
  );
  await network
    .getByRole("button", { name: "暂停 AI 测试", exact: true })
    .click();
  await expect(
    network.getByRole("button", { name: "继续 AI 测试", exact: true }),
  ).toBeVisible();
  await network.close();
  await page.screenshot({ path: ".tmp/screenshots/ai-observation.png" });
  expect(errors).toEqual([]);
  console.log(
    "PASS: real six hard AI workers, timing and throughput, pause/resume, 25% map, complete avatars, restore and end",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

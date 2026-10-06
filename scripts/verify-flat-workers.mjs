import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-flat-workers-"));
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
try {
  const endpoint = await service.start();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() => {
    window.workerInstances = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        window.workerInstances.push({
          url: String(args[0]),
          closed: false,
          worker: this,
        });
      }
      terminate() {
        window.workerInstances.find((entry) => entry.worker === this).closed =
          true;
        super.terminate();
      }
    };
    localStorage.setItem(
      "onlinebg.preferences",
      JSON.stringify({
        benchmarkVisible: true,
        performance: { mode: "multi", threads: 2 },
      }),
    );
  });
  await page.goto(endpoint);
  await page.getByRole("button", { name: /连续跳跃与营地竞速/ }).click();
  await page
    .getByRole("button", { name: "6 个困难 AI 性能测试", exact: true })
    .click();
  await page.getByRole("button", { name: "创建房间", exact: true }).click();
  await page.route("**/search-worker-*.js", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(page.locator(".compute-failure")).toContainText(
    "计算线程脚本加载失败",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "查看诊断", exact: true }).click();
  const diagnostic = JSON.parse(
    await page.getByLabel("计算诊断信息").inputValue(),
  );
  expect(diagnostic.stage).toBe("load");
  expect(diagnostic.workerId).toBeGreaterThan(0);
  expect(diagnostic.script).toContain("search-worker");
  expect(diagnostic.environment.userAgent).toBeTruthy();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.unroute("**/search-worker-*.js");
  await page.getByRole("button", { name: "重试 AI", exact: true }).click();
  await expect(page.locator(".compute-failure")).toHaveCount(0);
  await expect(page.getByLabel("AI计算统计")).toContainText(
    /已完成 [1-9]\d* 次决策/,
    { timeout: 60000 },
  );
  const instances = await page.evaluate(() =>
    window.workerInstances.map(({ url, closed }) => ({ url, closed })),
  );
  expect(
    instances.filter(
      (worker) => worker.url.includes("search-worker") && !worker.closed,
    ),
  ).toHaveLength(2);
  await page.getByRole("button", { name: "暂停 AI 测试", exact: true }).click();
  const completed = async () =>
    Number(
      (await page.getByLabel("AI计算统计").innerText()).match(
        /已完成 (\d+)/,
      )[1],
    );
  const paused = await completed();
  await page.waitForTimeout(600);
  expect(await completed()).toBe(paused);
  await page.getByRole("button", { name: "继续 AI 测试", exact: true }).click();
  await expect.poll(completed, { timeout: 180000 }).toBeGreaterThanOrEqual(30);
  await page.getByRole("button", { name: "结束游戏", exact: true }).click();
  await page.getByRole("button", { name: "确认结束", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.workerInstances.filter(
            (worker) => worker.url.includes("search-worker") && !worker.closed,
          ).length,
      ),
    )
    .toBe(0);
  expect(errors).toEqual([]);
  console.log(
    "PASS: flat window-created workers, load error diagnostics, explicit retry, 30 legal hard AI turns, pause and worker release",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

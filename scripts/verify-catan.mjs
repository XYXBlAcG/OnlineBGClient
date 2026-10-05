import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "onlinebg-catan-"));
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
const players = Number(process.env.CATAN_PLAYERS || 3);
const pages = [];
const errors = [];
const choose = async (page, label, text) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: text, exact: true }).click();
};
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  for (let index = 0; index < players; index++) {
    const context = await browser.newContext(
      index === players - 1
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1280, height: 720 } },
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    pages.push(page);
  }
  const host = pages[0];
  await host.goto(endpoint);
  await host.getByRole("button", { name: /资源、贸易与建设/ }).click();
  await choose(host, "真人人数", `${players} 人`);
  await choose(host, "总席位", `${players} 人`);
  await host.getByLabel("昵称", { exact: true }).fill("岛主");
  await host.getByRole("button", { name: "跨网络联机", exact: true }).click();
  await host.getByRole("button", { name: "创建房间", exact: true }).click();
  await host.locator(".room-toolbar > strong").waitFor();
  const room = (await host.locator(".room-toolbar > strong").innerText())
    .split("·")[1]
    .trim();
  for (let index = 1; index < players; index++) {
    const guest = pages[index];
    await guest.goto(`${endpoint}/?room=${room}`);
    await guest.getByLabel("昵称", { exact: true }).fill(`岛民${index}`);
    await guest
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await guest.getByRole("button", { name: "准备", exact: true }).click();
  }
  await host.getByRole("button", { name: "开始对局", exact: true }).click();
  await host.getByRole("button", { name: "放大地图", exact: true }).click();
  await expect(host.locator(".map-tools output")).toHaveText("150%");
  const targets = pages.map((page) =>
    page.locator('.original-game svg circle.cursor-pointer[opacity="0.5"]'),
  );
  for (const actor of [
    ...Array.from({ length: players }, (_, i) => i),
    ...Array.from({ length: players }, (_, i) => players - 1 - i),
  ].flatMap((actor) => [actor, actor])) {
    await expect(targets[actor].first()).toBeVisible();
    await targets[actor].first().click();
    await new Promise((resolve) => setTimeout(resolve, 160));
  }
  await expect(host.getByRole("button", { name: /掷骰子/ })).toBeEnabled();
  await host.locator(".room-toolbar > strong").click();
  await host.keyboard.press("d");
  await expect(host.getByRole("button", { name: /掷骰子/ })).toBeDisabled();
  for (const page of pages) {
    await expect(page.locator(".original-game svg")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    ).toBe(true);
  }
  const panelStyle = await host
    .locator(".catan-hand-panel")
    .evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      color: getComputedStyle(node).color,
    }));
  expect(panelStyle.background).toBe("rgba(0, 0, 0, 0)");
  expect(panelStyle.color).toBe("rgb(34, 37, 43)");
  await host.screenshot({ path: ".tmp/screenshots/catan-desktop.png" });
  await pages[players - 1].screenshot({
    path: ".tmp/screenshots/catan-mobile.png",
  });
  await host.getByRole("button", { name: "结束游戏", exact: true }).click();
  await host.getByRole("button", { name: "确认结束", exact: true }).click();
  await host.getByRole("button", { name: "对局记录", exact: true }).click();
  await host.locator(".record-row > button").first().click();
  await expect(host.locator(".ui-panel-wide .original-game svg")).toBeVisible();
  await expect(
    host
      .locator(".ui-panel-wide")
      .getByRole("button", { name: "结束游戏", exact: true }),
  ).toHaveCount(0);
  const local = await browser.newPage();
  await local.goto(endpoint);
  await local.getByRole("button", { name: /资源、贸易与建设/ }).click();
  await choose(local, "真人人数", "3 人");
  await choose(local, "总席位", "3 人");
  await local.getByRole("button", { name: "创建房间", exact: true }).click();
  await local.getByRole("button", { name: "开始对局", exact: true }).click();
  for (const actor of [0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0]) {
    await choose(local, "当前本地玩家", `玩家 ${actor + 1}`);
    const target = local
      .locator('.original-game svg circle.cursor-pointer[opacity="0.5"]')
      .first();
    await expect(target).toBeVisible();
    await target.click();
    await local.waitForTimeout(160);
  }
  await expect(local.getByRole("button", { name: /掷骰子/ })).toBeEnabled();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "PASS: original Catan board, human browsers including mobile, snake placement by actual SVG clicks, authoritative dice shortcut, synchronized view, read-only replay and local hotseat switching",
  );
} catch (error) {
  for (const page of pages)
    console.error((await page.locator("body").innerText()).slice(-6000));
  throw error;
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

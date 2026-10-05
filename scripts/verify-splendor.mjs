import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-splendor-")),
  service = new TestService(directory, {
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
const errors = [],
  pages = [];
const choose = async (page, label, text) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: text, exact: true }).click();
};
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  const desktop = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    mobile = await (
      await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      })
    ).newPage();
  pages.push(desktop, mobile);
  for (const page of pages)
    page.on("pageerror", (error) => errors.push(String(error)));
  await desktop.goto(endpoint);
  expect(await desktop.locator(".game-card").count()).toBe(8);
  const icon = await desktop.locator(".game-symbol.dy").evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    svg: !!node.querySelector("svg"),
  }));
  expect(icon.svg).toBe(true);
  expect(icon.background).not.toBe("rgba(0, 0, 0, 0)");
  await desktop.getByRole("button", { name: /宝石、发展与贵族/ }).click();
  await choose(desktop, "真人人数", "2 人");
  await choose(desktop, "总席位", "2 人");
  await desktop.getByLabel("昵称", { exact: true }).fill("珠宝商");
  await desktop
    .getByRole("button", { name: "跨网络联机", exact: true })
    .click();
  await desktop.getByRole("button", { name: "创建房间", exact: true }).click();
  await desktop.locator(".room-toolbar > strong").waitFor();
  const room = (await desktop.locator(".room-toolbar > strong").innerText())
    .split("·")[1]
    .trim();
  await mobile.goto(`${endpoint}/?room=${room}`);
  await mobile.getByLabel("昵称", { exact: true }).fill("手机商人");
  await mobile
    .getByRole("button", { name: "加入 / 恢复房间", exact: true })
    .click();
  await mobile.getByRole("button", { name: "准备", exact: true }).click();
  await desktop.getByRole("button", { name: "开始对局", exact: true }).click();
  await expect(desktop.locator(".ccbs-card").first()).toBeVisible();
  const bankBeforeGuide = await desktop
    .locator(".ccbs-circle.scale-125")
    .allTextContents();
  await desktop.getByRole("button", { name: "新手引导", exact: true }).click();
  await desktop
    .getByRole("region", { name: "璀璨宝石新手引导" })
    .getByRole("button", { name: "下一步" })
    .click();
  expect(
    await desktop.locator(".ccbs-circle.scale-125").allTextContents(),
  ).toEqual(bankBeforeGuide);
  for (const page of pages) {
    await page.getByRole("button", { name: /取宝石/ }).click();
    const beforeColors = await page
      .locator("button.ccbs-circle")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).backgroundImage),
      );
    expect(
      beforeColors.every((color) => color.includes("radial-gradient")),
    ).toBe(true);
    for (let i = 0; i < 3; i++)
      await page.locator("button.ccbs-circle").nth(i).click();
    const selectedValues = await page
      .locator("button.ccbs-circle")
      .allTextContents();
    const previousViewport = page.viewportSize();
    await page.setViewportSize({
      width: previousViewport.height,
      height: previousViewport.width,
    });
    await expect(
      page.getByRole("button", { name: "确认拿这些", exact: true }),
    ).toBeEnabled();
    expect(await page.locator("button.ccbs-circle").allTextContents()).toEqual(
      selectedValues,
    );
    await page.setViewportSize(previousViewport);
    const gemColors = await page
      .locator("button.ccbs-circle")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).backgroundImage),
      );
    expect(gemColors.length).toBeGreaterThanOrEqual(5);
    expect(gemColors.every((color) => color.includes("radial-gradient"))).toBe(
      true,
    );
    await page.getByRole("button", { name: "确认拿这些", exact: true }).click();
  }
  await expect(desktop.getByRole("button", { name: /取宝石/ })).toBeVisible();
  await desktop.getByRole("button", { name: /预定发展卡/ }).click();
  await desktop
    .getByRole("button", { name: "预定", exact: true })
    .first()
    .click();
  await expect(mobile.getByRole("button", { name: /取宝石/ })).toBeVisible();
  await desktop.screenshot({ path: ".tmp/screenshots/splendor-desktop.png" });
  await mobile.screenshot({ path: ".tmp/screenshots/splendor-mobile.png" });
  await desktop.getByRole("button", { name: "结束游戏", exact: true }).click();
  await desktop.getByRole("button", { name: "确认结束", exact: true }).click();
  await desktop.getByRole("button", { name: "对局记录", exact: true }).click();
  await desktop.locator(".record-row > button").first().click();
  await expect(desktop.locator(".ccbs-card").first()).toBeVisible();
  await expect(
    desktop.getByRole("button", { name: "结束游戏", exact: true }),
  ).toHaveCount(0);
  const ai = await browser.newPage();
  pages.push(ai);
  ai.on("pageerror", (error) => errors.push(String(error)));
  await ai.goto(endpoint);
  await ai.getByRole("button", { name: /宝石、发展与贵族/ }).click();
  for (let i = 1; i <= 2; i++) await choose(ai, `AI ${i} 难度`, "简单");
  await ai.getByRole("button", { name: "创建房间", exact: true }).click();
  await ai.getByRole("button", { name: "开始对局", exact: true }).click();
  await ai.getByRole("button", { name: /取宝石/ }).click();
  for (let i = 0; i < 3; i++)
    await ai.locator("button.ccbs-circle").nth(i).click();
  await ai.getByRole("button", { name: "确认拿这些", exact: true }).click();
  await expect(ai.getByRole("button", { name: /取宝石/ })).toBeVisible({
    timeout: 15000,
  });
  await ai.close();
  pages.pop();
  const island = await browser.newPage();
  pages.push(island);
  island.on("pageerror", (error) => errors.push(String(error)));
  await island.goto(endpoint);
  await island.getByRole("button", { name: /资源、贸易与建设/ }).click();
  for (let i = 1; i <= 2; i++) await choose(island, `AI ${i} 难度`, "简单");
  await island.getByRole("button", { name: "创建房间", exact: true }).click();
  await island.getByRole("button", { name: "开始对局", exact: true }).click();
  const initial = island.locator(
    '.original-game svg circle.cursor-pointer[opacity="0.5"]',
  );
  for (let i = 0; i < 2; i++) {
    await expect(initial.first()).toBeVisible();
    await initial.first().click();
    await island.waitForTimeout(200);
  }
  await expect(initial.first()).toBeVisible({ timeout: 25000 });
  for (let i = 0; i < 2; i++) {
    await initial.first().click();
    await island.waitForTimeout(200);
  }
  await expect(island.getByRole("button", { name: /掷骰子/ })).toBeEnabled();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "PASS: packaged service, desktop/mobile Splendor real card/token clicks, synchronized turns, reservation, replay, local Splendor/Catan AI turns, eight-game lobby and visible Poison icon",
  );
} catch (error) {
  for (const page of pages)
    console.error((await page.locator("body").innerText()).slice(-4000));
  throw error;
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

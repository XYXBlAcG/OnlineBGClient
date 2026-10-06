import { openRoomSetup } from "./browser-controls.mjs";
import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-guides-"));
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
const choose = async (page, label, value) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
};
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  for (const [kind, description, name] of [
    ["ccbs", "宝石、发展与贵族", "璀璨宝石"],
    ["dy", "药锅与颜色博弈", "毒药"],
    ["ktd", "资源、贸易与建设", "卡坦岛"],
    ["sgs", "身份与武将", "三国杀"],
    ["tq", "连续跳跃与营地竞速", "跳棋"],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(endpoint);
    await page.getByRole("button", { name: new RegExp(description) }).click();
    await expect(page.locator(".game-card.active")).toContainText(description);
    await page.getByRole("button", { name: "创建房间", exact: true }).click();
    const toggle = page.getByRole("button", { name: "新手引导", exact: true });
    const guide = page.getByRole("region", { name: `${name}新手引导` });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(guide).toHaveCount(0);
    await toggle.click();
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("1 / 5");
    await expect(guide.locator("ol li")).toHaveCount(3);
    await expect(
      guide.locator(".beginner-guide-context > button"),
    ).toBeDisabled();
    await page.getByRole("button", { name: "开始对局", exact: true }).click();
    await expect(page.locator(".original-game")).toBeVisible();
    await expect(
      guide.locator(".beginner-guide-context > button"),
    ).toBeEnabled();
    await guide.locator(".beginner-guide-context > button").click();
    if (kind === "sgs")
      await expect(guide.getByRole("status")).toContainText("先完成武将选择");
    else await expect(page.locator("[data-guide-focus]").first()).toBeVisible();
    await page.getByRole("button", { name: "返回引导", exact: true }).click();
    const first = await guide.locator("h3").innerText();
    await guide.getByRole("button", { name: "下一步" }).click();
    await expect(guide).toContainText("2 / 5");
    await guide.getByRole("button", { name: "上一步" }).click();
    await expect(guide.locator("h3")).toHaveText(first);
    await expect
      .poll(() =>
        page.evaluate(
          (game) =>
            JSON.parse(localStorage.getItem("onlinebg.preferences"))
              .beginnerGuides[game],
          kind,
        ),
      )
      .toBe(true);
    await page.reload();
    await page
      .getByRole("button", { name: "恢复本地对局", exact: true })
      .click();
    await expect(guide).toHaveCount(0);
    await toggle.click();
    await expect(guide).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 600 });
    await expect(guide).toBeVisible();
    await expect
      .poll(() =>
        guide.evaluate(
          (node) => node.getBoundingClientRect().right <= window.innerWidth,
        ),
      )
      .toBe(true);
    for (let step = 0; step < 4; step++)
      await guide.getByRole("button", { name: "下一步" }).click();
    await expect(guide).toContainText("5 / 5");
    await guide.getByRole("button", { name: "完成引导" }).click();
    await expect(guide).toHaveCount(0);
    await toggle.click();
    await expect(guide).toContainText("1 / 5");
    await guide.getByRole("button", { name: "关闭新手引导" }).click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() =>
        page.evaluate(
          (game) =>
            JSON.parse(localStorage.getItem("onlinebg.preferences"))
              .beginnerGuides[game],
          kind,
        ),
      )
      .toBe(false);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const host = await context.newPage();
    await host.goto(endpoint);
    await host.getByRole("button", { name: new RegExp(description) }).click();
    await choose(host, "真人人数", "2 人");
    await choose(host, "总席位", "2 人");
    await host.getByRole("button", { name: "跨网络联机", exact: true }).click();
    await host.getByRole("button", { name: "创建房间", exact: true }).click();
    await expect(host.locator(".room-toolbar > strong")).toBeVisible();
    const room = (await host.locator(".room-toolbar > strong").innerText())
      .split("·")[1]
      .trim();
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobile = await mobileContext.newPage();
    mobile.on("pageerror", (error) => errors.push(String(error)));
    await mobile.goto(`${endpoint}/?room=${room}`);
    await mobile.getByLabel("昵称", { exact: true }).fill("新手");
    await mobile
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await expect(mobile.locator(".mobile-shell")).toBeVisible();
    await mobile.getByRole("button", { name: "新手引导", exact: true }).click();
    const mobileGuide = mobile.getByRole("region", { name: `${name}新手引导` });
    await expect(mobileGuide).toBeVisible();
    await mobileGuide.getByRole("button", { name: "下一步" }).focus();
    await mobileGuide.getByRole("button", { name: "下一步" }).press("Enter");
    await expect(mobileGuide).toContainText("2 / 5");
    expect(
      await mobileGuide.evaluate(
        (node) => node.getBoundingClientRect().right <= window.innerWidth,
      ),
    ).toBe(true);
    await mobile.screenshot({
      path: `.tmp/screenshots/guide-${kind}-mobile.png`,
    });
    await expect(
      host.getByRole("button", { name: "新手引导", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    for (const target of ["UNO", name]) {
      await openRoomSetup(host);
      await choose(host, "下一局游戏", target);
      await host.getByRole("button", { name: "应用", exact: true }).click();
      await expect(mobile.locator(".room-toolbar > strong")).toContainText(
        target,
      );
    }
    await expect(mobileGuide).toHaveCount(0);
    await mobile.getByRole("button",{name:"新手引导",exact:true}).click();
    await expect(mobileGuide).toContainText("1 / 5");
    await mobileContext.close();
    await context.close();
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: five opt-in beginner guides, navigation, completion, independent persisted preferences, local restoration and mobile layout",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

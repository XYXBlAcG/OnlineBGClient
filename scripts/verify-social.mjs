import { chromium, expect } from "@playwright/test";
import { TestService } from "./service-harness.mjs";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "onlinebg-social-"));
const service = new TestService(directory, {
  entry: "src-tauri/resources/hosting/main.mjs",
  staticRoot: resolve("src-tauri/resources/hosting/web"),
});
const browser = await chromium.launch({
  executablePath: existsSync(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  )
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined,
  headless: true,
});
const errors = [];
const contexts = [];
const page = async (mobile = false) => {
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
        }
      : { viewport: { width: 1280, height: 900 } },
  );
  contexts.push(context);
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(String(e)));
  return p;
};
const choose = async (p, label, text) => {
  await p.getByRole("combobox", { name: label, exact: true }).click();
  await p.getByRole("option", { name: text, exact: true }).click();
  await expect(p.getByRole("listbox")).toHaveCount(0);
};
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  const host = await page();
  await host.goto(endpoint);
  await host.getByLabel("昵称", { exact: true }).fill("同名");
  await choose(host, "真人人数", "3 人");
  await choose(host, "总席位", "3 人");
  await host.getByRole("button", { name: "跨网络联机", exact: true }).click();
  await host.getByRole("button", { name: "创建房间", exact: true }).click();
  await host.locator(".room-toolbar > strong").waitFor();
  const room = (await host.locator(".room-toolbar > strong").innerText())
    .split("·")[1]
    .trim();
  const guest = await page(),
    mobile = await page(true);
  for (const p of [guest, mobile]) {
    await p.goto(`${endpoint}/?room=${room}`);
    await p.getByLabel("昵称", { exact: true }).fill("同名");
    await p
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await p.getByRole("heading", { name: "等待开局", exact: true }).waitFor();
  }
  await expect(mobile.locator(".game-card")).toHaveCount(0);
  await expect(
    mobile.getByRole("button", { name: "打开设置", exact: true }),
  ).toHaveCount(0);
  await expect(
    mobile.getByRole("button", { name: "对局记录", exact: true }),
  ).toHaveCount(0);
  await expect(mobile.locator(".chat-panel")).toBeHidden();
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.reload();
  await mobile
    .getByRole("heading", { name: "等待开局", exact: true })
    .waitFor();
  await expect(mobile.locator(".mobile-shell")).toBeVisible();
  await expect(
    mobile.getByRole("button", { name: "打开设置", exact: true }),
  ).toHaveCount(0);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await host.getByRole("button", { name: "邀请二维码", exact: true }).click();
  await expect(host.getByAltText("房间邀请二维码")).toBeVisible();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await host.locator(".room-avatars button").nth(1).click();
  await host.getByRole("button", { name: "送出鸡蛋", exact: true }).click();
  await Promise.all(
    [host, guest, mobile].map((p) =>
      expect(p.locator(".interaction-particle")).toHaveCount(1),
    ),
  );
  await host.getByRole("button", { name: "聊天", exact: true }).click();
  await guest.getByLabel("消息", { exact: true }).fill("同名也要提醒");
  await guest.getByRole("button", { name: "发送", exact: true }).click();
  await host.getByRole("button", { name: "聊天 · 1", exact: true }).waitFor();
  await host.getByRole("button", { name: "聊天 · 1", exact: true }).click();
  await expect(host.getByText("同名也要提醒", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "表情包", exact: true }).click();
  await guest.getByRole("button", { name: "发送开心", exact: true }).click();
  await expect(
    host.getByRole("img", { name: "开心", exact: true }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "表情包", exact: true }).click();
  await guest.getByLabel("导入表情图片", { exact: true }).setInputFiles({
    name: "测试表情.png",
    mimeType: "image/png",
    buffer: await readFile("tests/fixtures/sticker.png"),
  });
  await expect(guest.getByAltText("待发送表情")).toBeVisible();
  await guest.getByRole("button", { name: "发送表情", exact: true }).click();
  await expect(host.getByAltText("测试表情", { exact: true })).toBeVisible();
  await mobile.getByRole("button", { name: /^聊天/ }).click();
  await expect(mobile.getByAltText("测试表情", { exact: true })).toBeVisible();
  await mobile.getByRole("button", { name: "收起聊天", exact: true }).click();
  await guest.getByRole("button", { name: "表情包", exact: true }).click();
  await guest.getByRole("button", { name: "收藏开心", exact: true }).click();
  await guest.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "发送开心", exact: true }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "最近", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "发送测试表情", exact: true }),
  ).toBeVisible();
  await guest.getByLabel("导入表情图片", { exact: true }).setInputFiles({
    name: "动画.gif",
    mimeType: "image/gif",
    buffer: await readFile("tests/fixtures/sticker.gif"),
  });
  await guest.getByRole("button", { name: "发送表情", exact: true }).click();
  const gif = host.getByAltText("动画", { exact: true });
  await expect(gif).toBeVisible();
  const gifUrl = await gif.getAttribute("src");
  await host.emulateMedia({ reducedMotion: "reduce" });
  await expect(gif).not.toHaveAttribute("src", gifUrl);
  await host.emulateMedia({ reducedMotion: "no-preference" });
  for (let i = 0; i < 18; i++) {
    await guest.getByLabel("消息", { exact: true }).fill(`历史消息 ${i}`);
    await guest.getByRole("button", { name: "发送", exact: true }).click();
  }
  await expect(host.getByText("历史消息 17", { exact: true })).toBeVisible();
  await host.locator(".chat-messages").evaluate((box) => {
    box.scrollTop = 0;
    box.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await guest.getByLabel("消息", { exact: true }).fill("阅读历史时的新消息");
  await guest.getByRole("button", { name: "发送", exact: true }).click();
  await host.getByRole("button", { name: /^新消息/ }).waitFor();
  expect(
    await host.locator(".chat-messages").evaluate((box) => box.scrollTop),
  ).toBe(0);
  await host.getByRole("button", { name: /^新消息/ }).click();
  await expect(
    host.getByText("阅读历史时的新消息", { exact: true }),
  ).toBeVisible();
  await choose(host, "房间游戏", "三国杀");
  for (const p of [guest, mobile])
    await p.getByRole("button", { name: "准备", exact: true }).click();
  await host.getByRole("button", { name: "开始对局", exact: true }).click();
  await Promise.race(
    [host, guest, mobile].map((p) =>
      p.locator(".hero-detail-button").first().waitFor(),
    ),
  );
  const chooser = (
    await Promise.all(
      [host, guest, mobile].map(async (p) =>
        (await p.locator(".hero-detail-button").count()) ? p : null,
      ),
    )
  ).find(Boolean);
  await chooser.locator(".hero-detail-button").first().click();
  await expect(chooser.locator(".ui-panel .hero-description")).toBeVisible();
  await chooser
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await host.waitForTimeout(1300);
  await host.locator("#userseat1 > button").click();
  await host.getByRole("button", { name: "扔🥚", exact: true }).click();
  await Promise.all(
    [host, guest, mobile].map((p) =>
      expect(p.locator(".interaction-particle")).toHaveCount(1),
    ),
  );
  await chooser.locator(".hero-surface .sgs-hero").first().click();
  await chooser.getByRole("button", { name: "确定", exact: true }).click();
  await mobile.locator(".hero-detail-button").first().tap();
  await expect(mobile.locator(".ui-panel .hero-description")).toBeVisible();
  await mobile
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .tap();
  await mobile.reload();
  await mobile.locator(".original-game").waitFor();
  await mobile.screenshot({ path: ".tmp/screenshots/mobile-sgs.png" });
  await host.screenshot({
    path: ".tmp/screenshots/social-sgs.png",
    fullPage: true,
  });
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await host.getByRole("button", { name: "结束游戏", exact: true }).click();
  await host.getByRole("button", { name: "确认结束", exact: true }).click();
  await choose(host, "房间游戏", "斗地主");
  await expect(mobile.locator(".room-toolbar>strong")).toContainText("斗地主");
  for (const p of [guest, mobile])
    await p.getByRole("button", { name: "准备", exact: true }).click();
  await host.getByRole("button", { name: "开始对局", exact: true }).click();
  await host.getByRole("button", { name: "抢地主", exact: true }).click();
  await host.getByRole("button", { name: "结束游戏", exact: true }).click();
  await host.getByRole("button", { name: "确认结束", exact: true }).click();
  for (const name of ["UNO", "飞行棋", "跳棋"]) {
    await choose(host, "房间游戏", name);
    for (const p of [guest, mobile])
      await p.getByRole("button", { name: "准备", exact: true }).click();
    await host.getByRole("button", { name: "开始对局", exact: true }).click();
    await mobile.getByRole("button", { name: /^游戏操作/ }).tap();
    await expect(
      mobile.getByRole("dialog", { name: "游戏操作", exact: true }),
    ).toBeVisible();
    await mobile
      .getByRole("dialog", { name: "游戏操作", exact: true })
      .getByRole("button", { name: "关闭", exact: true })
      .tap();
    let acted = false;
    for (const p of [mobile, guest, host]) {
      await p.getByRole("button", { name: /^游戏操作/ }).click();
      const choices = p.getByRole("option");
      if (await choices.count()) {
        await choices.first().click();
        await p.getByRole("button", { name: "确认动作", exact: true }).click();
        acted = true;
        break;
      }
      await p
        .getByRole("dialog", { name: "游戏操作", exact: true })
        .getByRole("button", { name: "关闭", exact: true })
        .click();
    }
    expect(acted).toBe(true);
    await expect(mobile.locator(".original-game")).toBeVisible();
    await host.getByRole("button", { name: "结束游戏", exact: true }).click();
    await host.getByRole("button", { name: "确认结束", exact: true }).click();
  }
  await host.getByRole("button", { name: "关闭房间", exact: true }).click();
  await host
    .locator("dialog")
    .getByRole("button", { name: "关闭房间", exact: true })
    .click();
  await mobile
    .getByRole("heading", { name: "加入牌桌", exact: true })
    .waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "PASS: packaged hosting service, three-client interactions, same-name unread, builtin/custom/GIF stickers, favorites, history reading, QR, mobile core UI, hero details, recovery, five-game room switch",
  );
} catch (error) {
  console.error(errors);
  for (const context of contexts)
    for (const p of context.pages())
      console.error((await p.locator("body").innerText()).slice(0, 1800));
  throw error;
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

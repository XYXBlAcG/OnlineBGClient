import { openRoomSetup, chooseRoomOption } from "./browser-controls.mjs";
import { chromium, expect } from "@playwright/test";
import { TestService } from "./service-harness.mjs";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
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
  if (label === "房间游戏") {
    await openRoomSetup(p);
    await choose(p, "下一局游戏", text);
    await p.getByRole("button", { name: "应用", exact: true }).click();
    const confirm = p.getByRole("button", { name: "应用配置", exact: true }),
      setup = p.getByRole("dialog", { name: "下一局", exact: true });
    await expect
      .poll(
        async () => (await confirm.isVisible()) || !(await setup.isVisible()),
      )
      .toBe(true);
    if (await confirm.isVisible()) await confirm.click();
    return;
  }
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
  await mobile.setViewportSize({ width: 390, height: 280 });
  await mobile.getByRole("button", { name: /^聊天/ }).tap();
  await expect(mobile.locator(".chat-panel")).toBeVisible();
  expect(
    (await mobile.locator(".chat-panel").boundingBox()).y,
  ).toBeGreaterThanOrEqual(0);
  await mobile.getByRole("button", { name: "收起聊天", exact: true }).tap();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await chooseRoomOption(host, "邀请二维码");
  await expect(host.getByAltText("房间邀请二维码")).toBeVisible();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  for (const p of [guest, mobile])
    await p.getByRole("button", { name: "准备", exact: true }).click();
  await host.getByRole("button", { name: "开始对局", exact: true }).click();
  await host.locator('[data-game-avatar="1"]').click();
  await expect(
    host.getByRole("button", { name: "让我想一想。", exact: true }),
  ).toHaveCount(0);
  await host.getByRole("button", { name: "送出鸡蛋", exact: true }).click();
  await Promise.all(
    [host, guest, mobile].map((p) =>
      expect(p.locator(".interaction-particle")).toHaveCount(1),
    ),
  );
  expect(
    await host
      .locator(".interaction-layer")
      .evaluate((node) => node.closest(".original-game") !== null),
  ).toBe(true);
  await guest
    .getByRole("banner")
    .getByRole("button", { name: "聊天", exact: true })
    .click();
  await guest.getByLabel("消息", { exact: true }).fill("同名也要提醒");
  await guest.getByRole("button", { name: "发送", exact: true }).click();
  await host
    .getByRole("banner")
    .getByRole("button", { name: "聊天 · 1", exact: true })
    .waitFor();
  await host
    .getByRole("banner")
    .getByRole("button", { name: "聊天 · 1", exact: true })
    .click();
  await expect(host.getByText("同名也要提醒", { exact: true })).toBeVisible();
  await guest.locator('[data-game-avatar="1"]').click();
  await guest
    .getByRole("button", { name: "让我想一想。", exact: true })
    .click();
  await expect(host.getByText("让我想一想。", { exact: true })).toBeVisible();
  await expect(
    host.getByRole("button", { name: "表情包", exact: true }),
  ).toHaveCount(0);
  await expect(host.locator(".chat-message time").last()).toHaveText(
    /\d{2}:\d{2}:\d{2}/,
  );
  const initialWidth = (await host.locator(".chat-panel").boundingBox()).width;
  await host
    .getByRole("separator", { name: "辅助区域宽度", exact: true })
    .focus();
  await host.keyboard.press("ArrowLeft");
  await expect
    .poll(async () => (await host.locator(".chat-panel").boundingBox()).width)
    .toBeGreaterThan(initialWidth + 10);
  const savedWidth = (await host.locator(".chat-panel").boundingBox()).width;
  await expect
    .poll(() =>
      host.evaluate(
        () =>
          JSON.parse(localStorage.getItem("onlinebg.preferences")).sidebarWidth,
      ),
    )
    .not.toBeNull();
  await host.reload();
  await host.getByRole("button", { name: "恢复联机房间", exact: true }).click();
  await expect(host.locator(".room-toolbar")).toBeVisible();
  await host
    .getByRole("banner")
    .getByRole("button", { name: "聊天", exact: true })
    .click();
  await expect
    .poll(async () =>
      Math.round((await host.locator(".chat-panel").boundingBox()).width),
    )
    .toBe(Math.round(savedWidth));
  await host.getByRole("button", { name: "打开设置", exact: true }).click();
  await host.locator(".phrase-settings summary").first().click();
  await host
    .getByLabel("常用语内容 1", { exact: true })
    .fill("我的定制招呼\n第二句话");
  await host.getByRole("button", { name: "保存常用语", exact: true }).click();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await host.locator('[data-game-avatar="0"]').click();
  await expect(
    host.getByRole("button", { name: "送出鸡蛋", exact: true }),
  ).toHaveCount(0);
  await host.getByRole("button", { name: "我的定制招呼", exact: true }).click();
  await expect(guest.getByText("我的定制招呼", { exact: true })).toBeVisible();
  await host.waitForTimeout(1300);
  await host.locator('[data-game-avatar="1"]').click();
  await host.getByRole("button", { name: "送出学霸", exact: true }).click();
  await Promise.all(
    [host, guest, mobile].map((p) =>
      expect(p.locator('[data-effect="nerd"]')).toHaveCount(1),
    ),
  );

  await host.locator('[data-game-avatar="1"]').click();
  const effects = await host
    .locator(".avatar-interactions button")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")),
    );
  await host.keyboard.press("Escape");
  expect(effects).toHaveLength(20);
  for (const name of effects) {
    await expect(host.locator(".interaction-particle")).toHaveCount(0);
    await host.locator('[data-game-avatar="1"]').click();
    await host.getByRole("button", { name, exact: true }).click();
    await Promise.all(
      [host, guest, mobile].map((p) =>
        expect(p.locator(".interaction-particle")).toHaveCount(1),
      ),
    );
    expect(
      await host
        .locator(".interaction-layer")
        .evaluate((node) => getComputedStyle(node).pointerEvents),
    ).toBe("none");
    await Promise.all(
      [host, guest, mobile].map((p) =>
        expect(p.locator(".interaction-particle")).toHaveCount(0),
      ),
    );
    await expect(host.locator(".interaction-fragment")).toHaveCount(0);
  }

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
  await expect(
    chooser.locator(".detail-popover .hero-description"),
  ).toBeVisible();
  await chooser
    .getByRole("dialog")
    .getByRole("button", { name: "关闭说明", exact: true })
    .click();
  await host.waitForTimeout(1300);
  await host.locator('[data-game-avatar="1"]').click();
  await host.getByRole("button", { name: "送出鸡蛋", exact: true }).click();
  await Promise.all(
    [host, guest, mobile].map((p) =>
      expect(p.locator(".interaction-particle")).toHaveCount(1),
    ),
  );
  await chooser.locator(".hero-surface .sgs-hero").first().click();
  await chooser.getByRole("button", { name: "确定", exact: true }).click();
  await mobile.locator(".hero-detail-button").first().tap();
  await expect(
    mobile.locator(".detail-popover .hero-description"),
  ).toBeVisible();
  await mobile
    .getByRole("dialog")
    .getByRole("button", { name: "关闭说明", exact: true })
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
  for (const name of ["UNO", "飞行棋", "跳棋", "毒药", "卡坦岛"]) {
    await choose(host, "房间游戏", name);
    for (const p of [guest, mobile])
      await p.getByRole("button", { name: "准备", exact: true }).click();
    await host.getByRole("button", { name: "开始对局", exact: true }).click();
    await chooseRoomOption(mobile, /^游戏操作/, "tap");
    await expect(
      mobile.getByRole("dialog", { name: "游戏操作", exact: true }),
    ).toBeVisible();
    await mobile
      .getByRole("dialog", { name: "游戏操作", exact: true })
      .getByRole("button", { name: "关闭", exact: true })
      .tap();
    let acted = false;
    for (const p of [mobile, guest, host]) {
      await chooseRoomOption(p, /^游戏操作/);
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
  await openRoomSetup(host);
  await choose(host, "下一局游戏", "三国杀");
  await choose(host, "下一局真人席位", "4");
  await host.getByRole("button", { name: "应用", exact: true }).click();
  const fourth = await page();
  await fourth.goto(`${endpoint}/?room=${room}`);
  await fourth.getByLabel("昵称", { exact: true }).fill("第四人");
  await fourth
    .getByRole("button", { name: "加入 / 恢复房间", exact: true })
    .click();
  await expect(host.locator(".seat-row")).toHaveCount(4);
  await expect(
    host.locator(".seat-row").filter({ hasText: "第四人" }),
  ).toBeVisible();
  await openRoomSetup(host);
  await choose(host, "下一局游戏", "毒药");
  await choose(host, "下一局真人席位", "3");
  await host
    .getByRole("dialog", { name: "下一局", exact: true })
    .getByLabel("第四人", { exact: true })
    .uncheck();
  await host.getByRole("button", { name: "应用", exact: true }).click();
  await host.getByRole("button", { name: "应用配置", exact: true }).click();
  await expect(
    fourth.getByRole("heading", { name: "一起玩一局" }),
  ).toBeVisible();
  await expect(host.locator(".seat-row")).toHaveCount(3);
  await host.getByRole("button", { name: "关闭房间", exact: true }).click();
  await host
    .locator(".confirmation-dialog")
    .getByRole("button", { name: "关闭房间", exact: true })
    .click();
  await mobile
    .getByRole("heading", { name: "加入牌桌", exact: true })
    .waitFor();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "PASS: packaged hosting service, three-client interactions, same-name unread, avatar quick phrases, game-surface effects, history reading, QR, mobile core UI, hero details, recovery, room game switch, custom phrases, timestamps and resizable chat",
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

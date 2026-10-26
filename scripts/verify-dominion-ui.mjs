import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
const output = process.env.SCREENSHOT_DIR || ".tmp/screenshots/dominion";
await mkdir(output, { recursive: true });
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/dominion-ui-fixture",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/dominion-ui-fixture/domain/room.js");
const { RoomStore } =
  await import("../.tmp/dominion-ui-fixture/server/storage.js");
const directory = await mkdtemp(join(tmpdir(), "dominion-ui-"));
const cases = [
  ["desktop-light", 1440, 900, false, "light"],
  ["desktop-wide", 1920, 1080, false, "light"],
  ["desktop-low", 1280, 640, false, "light"],
  ["desktop-dark", 1440, 900, false, "dark"],
  ["desktop-chat", 1160, 820, false, "light"],
  ["mobile-portrait", 390, 844, true, "light"],
  ["mobile-landscape", 844, 390, true, "dark"],
  ["graphwar-controls", 1280, 800, false, "dark", "graphwar"],
  ["mahjong-controls", 1280, 800, false, "light", "scmj"],
];
const store = new RoomStore(join(directory, "rooms.sqlite"));
const fixtures = new Map(
  cases.map(([name, , , , , kind = "dominion"], index) => {
    const room = new Room(
      `dom-ui-${index}`,
      {
        kind,
        humans: 1,
        ai: Array.from(
          { length: kind === "scmj" ? 3 : kind === "graphwar" ? 1 : 2 },
          (_, seat) => ({
            difficulty: "normal",
            name: ["青竹", "流星", "夜航"][seat],
          }),
        ),
        team: false,
        training: false,
      },
      "visual-review",
    );
    const token = room.claim("Mac");
    room.start(token);
    store.save(room);
    return [name, { room, token }];
  }),
);
store.close();
const service = new TestService(directory, {
  staticRoot: resolve(process.env.TEST_STATIC_ROOT || "dist"),
  entry: process.env.TEST_SERVER_ENTRY || "dist-server/main.mjs",
});
let browser;
const errors = [],
  reports = [];

try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  const endpoint = await service.start();
  for (const [name, width, height, touch, theme, kind = "dominion"] of cases) {
    const { room, token } = fixtures.get(name);
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: touch,
      hasTouch: touch,
      deviceScaleFactor: 1,
      colorScheme: theme,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${name}: ${error}`));
    await page.addInitScript(
      ({ id, token, theme }) => {
        localStorage.setItem(`room:${location.origin}:${id}`, token);
        localStorage.setItem(
          "onlinebg.preferences",
          JSON.stringify({ theme, motion: false, enhancedGameMotion: false }),
        );
      },
      { id: room.id, token, theme },
    );
    await page.goto(`${endpoint}/?room=${room.id}`);
    await page.getByLabel("昵称", { exact: true }).fill("Mac");
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await expect(
      page.locator(`.original-game[data-game="${kind}"]`),
    ).toBeVisible();
    if (kind !== "dominion") {
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `${output}/${name}.png` });
      reports.push({ name, kind });
      await context.close();
      continue;
    }
    await expect(page.locator(".dominion-table")).toBeVisible();
    if (name === "desktop-chat")
      await page.getByRole("button", { name: /^聊天/ }).first().click();
    if (touch) {
      await expect(page.locator(".mobile-shell")).toBeVisible();
      const focus = page.getByRole("button", { name: "沉浸牌桌", exact: true });
      if (await focus.isVisible()) await focus.tap();
      await expect(page.locator(".mobile-immersive")).toBeVisible();
    }
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${output}/${name}.png` });
    const geometry = await page.locator(".dominion-table").evaluate((node) => {
      const bounds = (element) => {
        const r = element.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        table: bounds(node),
        hand: bounds(node.querySelector(".dominion-own")),
        supply: bounds(node.querySelector(".dominion-supply-grid")),
        cards: [
          ...node.querySelectorAll(".dominion-supply-grid .dominion-card"),
        ].map(bounds),
        players: [...node.querySelectorAll(".dominion-players > div")].map(
          (element) => ({
            area: bounds(element),
            avatar: bounds(element.querySelector(".game-avatar")),
            name: bounds(
              element.querySelector(".dominion-player-name") ||
                element.querySelector(".game-avatar-name"),
            ),
            radius: getComputedStyle(element.querySelector(".game-avatar"))
              .borderRadius,
          }),
        ),
        actions: [...node.querySelectorAll(".dominion-actions button")].map(
          (button) => ({
            text: button.textContent,
            radius: getComputedStyle(button).borderRadius,
            bounds: bounds(button),
          }),
        ),
        pageWidth: document.documentElement.scrollWidth,
      };
    });
    reports.push({ name, geometry });
    for (const player of geometry.players) {
      expect(player.avatar.width).toBeLessThan(80);
      expect(Math.abs(player.avatar.width - player.avatar.height)).toBeLessThan(
        2,
      );
      expect(player.name.bottom).toBeLessThanOrEqual(player.area.bottom + 1);
    }
    expect(geometry.cards[0].height).toBeLessThanOrEqual(touch ? 180 : 200);
    expect(geometry.hand.bottom).toBeLessThanOrEqual(height + 1);
    expect(geometry.supply.bottom).toBeLessThanOrEqual(geometry.hand.y + 1);
    expect(geometry.pageWidth).toBeLessThanOrEqual(width + 1);
    expect(geometry.hand.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.supply.right).toBeLessThanOrEqual(width + 1);
    if (name !== "mobile-portrait")
      expect(geometry.cards.at(-1).bottom).toBeLessThanOrEqual(
        geometry.supply.bottom + 1,
      );
    for (const action of geometry.actions)
      expect(parseFloat(action.radius)).toBeGreaterThanOrEqual(8);

    if (name === "desktop-light" || name === "mobile-portrait") {
      const press = async (locator) =>
        touch ? locator.tap() : locator.click();
      await press(page.locator(".dominion-supply .card-detail-button").first());
      await expect(page.locator(".detail-popover")).toBeVisible();
      await page.screenshot({ path: `${output}/${name}-card-detail.png` });
      await page.keyboard.press("Escape");
      await expect(page.locator(".detail-popover")).toHaveCount(0);
      await press(
        page.getByRole("button", { name: "牌库与记录", exact: true }),
      );
      await expect(
        page.getByRole("dialog", { name: "领土 · 牌库与记录", exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `${output}/${name}-ledger.png` });
      await page
        .getByRole("dialog", { name: "领土 · 牌库与记录", exact: true })
        .getByRole("button", { name: "关闭", exact: true })
        .click();
      await press(
        page.getByRole("button", { name: "青竹的头像", exact: true }),
      );
      await expect(page.locator(".avatar-menu")).toBeVisible();
      await page.screenshot({ path: `${output}/${name}-avatar-menu.png` });
      await page.keyboard.press("Escape");
      await press(
        page.getByRole("button", { name: "打出全部财宝", exact: true }),
      );
      await expect(page.locator(".dominion-status")).toContainText("购买阶段");
      await press(
        page.getByRole("button", { name: "财宝与胜利卡", exact: true }),
      );
      await expect(
        page.getByRole("button", { name: "购买庄园", exact: true }),
      ).toBeEnabled();
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `${output}/${name}-buy.png` });
    }
    await context.close();
  }
  expect(errors).toEqual([]);
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ reports, errors }, null, 2),
  );
  await browser?.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}
console.log(`Screenshots and geometry: ${output}`);

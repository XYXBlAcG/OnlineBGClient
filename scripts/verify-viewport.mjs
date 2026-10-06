import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-viewport-"));
const service = new TestService(directory, {
  entry: "src-tauri/resources/hosting/main.mjs",
  staticRoot: resolve("src-tauri/resources/hosting/web"),
});
const games = [
  ["ktd", "资源、贸易与建设", 2],
  ["ktd", "资源、贸易与建设", 4],
  ["ktd", "资源、贸易与建设", 8],
  ["ccbs", "宝石、发展与贵族", 2],
  ["sgs", "身份与武将", 8],
  ["dy", "药锅与颜色博弈", 2],
  ["tq", "连续跳跃与营地竞速", 2],
  ["fxq", "掷骰与飞跃", 2],
  ["uno", "颜色与数字", 2],
  ["ddz", "地主与农民", 3],
];
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/viewport-fixtures",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/viewport-fixtures/domain/room.js");
const { RoomStore } =
  await import("../.tmp/viewport-fixtures/server/storage.js");
const store = new RoomStore(join(directory, "rooms.sqlite"));
const fixtures = new Map();
for (const [kind, , players] of games) {
  const id = `v-${kind}-${players}`;
  const room = new Room(
    id,
    { kind, humans: players, ai: [], team: false, training: false },
    id,
  );
  const tokens = Array.from({ length: players }, (_, i) =>
    room.claim(`玩家${i + 1}`),
  );
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  store.save(room);
  fixtures.set(id, tokens[0]);
}
store.close();
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
  headless: true,
});
const errors = [];
const choose = async (page, label, name) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
};
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  for (const [kind, description, players] of games) {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({
        isMobile: mobile,
        hasTouch: mobile,
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(String(error)));
      if (mobile) {
        const room = `v-${kind}-${players}`;
        await page.addInitScript(
          ({ room, token }) =>
            localStorage.setItem(`room:${location.origin}:${room}`, token),
          { room, token: fixtures.get(room) },
        );
        await page.goto(`${endpoint}/?room=${room}`);
        await page.getByLabel("昵称", { exact: true }).fill("玩家1");
        await page
          .getByRole("button", { name: "加入 / 恢复房间", exact: true })
          .click();
      } else {
        await page.goto(endpoint);
        await page
          .getByRole("button", { name: new RegExp(description) })
          .click();
        if (kind !== "ddz") {
          await choose(page, "真人人数", `${players} 人`);
          await choose(page, "总席位", `${players} 人`);
        }
        await page
          .getByRole("button", { name: "创建房间", exact: true })
          .click();
        await page
          .getByRole("button", { name: "开始对局", exact: true })
          .click();
      }
      await expect(page.locator(".original-game")).toBeVisible();
      for (const size of mobile
        ? [
            { width: 390, height: 844 },
            { width: 844, height: 390 },
          ]
        : [
            { width: 1280, height: 720 },
            { width: 1366, height: 768 },
            { width: 1280, height: 600 },
          ]) {
        await page.setViewportSize(size);
        await expect
          .poll(() =>
            page
              .locator(".game-stage")
              .evaluate(
                (node) =>
                  node.getBoundingClientRect().bottom <= innerHeight + 1,
              ),
          )
          .toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        ).toBe(true);
        if (kind === "ktd") {
          const mapHeight = await page
            .locator(".map-scroll")
            .evaluate((node) => node.clientHeight);
          if (mapHeight <= 70) {
            await page.screenshot({
              path: ".tmp/screenshots/viewport-small.png",
            });
            console.log({
              kind,
              players,
              size,
              mapHeight,
              layout: await page.locator(".game-area").evaluate((node) =>
                [...node.children].map((c) => ({
                  class: c.className,
                  height: c.getBoundingClientRect().height,
                })),
              ),
              board: await page.locator(".original-game").evaluate((node) =>
                [...node.children].map((c) => ({
                  class: c.className,
                  height: c.getBoundingClientRect().height,
                })),
              ),
            });
          }
          expect(mapHeight).toBeGreaterThan(70);
          await expect(page.locator(".catan-hand-panel")).toBeVisible();
          await page
            .getByRole("button", { name: "放大地图", exact: true })
            .click();
          await expect(page.locator(".map-tools output")).toHaveText("150%");
          await page
            .getByRole("button", { name: "移动地图", exact: true })
            .click();
          const bounds = await page.locator(".map-scroll").boundingBox();
          await page.mouse.move(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height / 2,
          );
          await page.mouse.down();
          await page.mouse.move(
            bounds.x + bounds.width / 2 - 40,
            bounds.y + bounds.height / 2 - 30,
            { steps: 4 },
          );
          await page.mouse.up();
          expect(
            await page
              .locator(".map-scroll")
              .evaluate((node) => node.scrollLeft > 0 || node.scrollTop > 0),
          ).toBe(true);
          await page
            .getByRole("button", { name: "适配窗口", exact: true })
            .click();
        }
      }
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      );
      const toggle = page.getByRole("button", {
        name: "新手引导",
        exact: true,
      });
      if (await toggle.count()) {
        await toggle.click();
        await expect(page.locator(".beginner-guide-content")).toBeVisible();
        await expect(
          page.getByRole("button", { name: "下一步", exact: true }),
        ).toBeInViewport();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight <= innerHeight + 1,
          ),
        ).toBe(true);
        await page.getByRole("button", { name: "下一步", exact: true }).click();
        await page
          .locator(".sidebar-tabs")
          .getByRole("button", { name: "聊天", exact: true })
          .click();
        await expect(page.locator(".chat-panel")).toBeVisible();
        await page
          .locator(".sidebar-tabs")
          .getByRole("button", { name: "引导", exact: true })
          .click();
        await expect(page.locator(".beginner-guide-content")).toContainText(
          "2 / 5",
        );
        await page
          .getByRole("button", { name: "关闭新手引导", exact: true })
          .click();
      }
      if (mobile) {
        await page
          .getByRole("button", { name: "专注模式", exact: true })
          .click();
        await expect(page.locator(".room-sidebar")).toBeHidden();
        await page
          .getByRole("button", { name: "恢复界面", exact: true })
          .click();
      }
      await page.screenshot({
        path: `.tmp/screenshots/viewport-${kind}-${players}-${mobile ? "mobile" : "desktop"}.png`,
      });
      console.log(
        JSON.stringify({
          kind,
          players,
          heights: await page.locator(".original-game").evaluate((node) => ({
            available: node.clientHeight,
            content: node.scrollHeight,
            children: [...node.children].map((child) => ({
              class: child.className,
              height: Math.round(child.getBoundingClientRect().height),
            })),
          })),
        }),
      );
      await context.close();
    }
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: eight games, Catan 2/4/8 maps, low-height windows, portrait/landscape, shared sidebar and focus mode",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

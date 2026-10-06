import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-layout-"));
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/layout-check",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/layout-check/domain/room.js");
const { RoomStore } = await import("../.tmp/layout-check/server/storage.js");
const store = new RoomStore(join(directory, "rooms.sqlite"));
const fixtures = [];
for (const [kind, count] of [
  ["ccbs", 4],
  ["sgs", 8],
  ["ktd", 4],
  ["tq", 6],
]) {
  const room = new Room(
    `layout-${kind}`,
    { kind, humans: count, ai: [], team: false, training: false },
    `layout-${kind}`,
  );
  const tokens = Array.from({ length: count }, (_, i) =>
    room.claim(`玩家${i + 1}`),
  );
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  if (kind === "sgs")
    for (let i = 0; i < 20 && [1, 2].includes(room.state.view.stage); i++) {
      const actor = room.engine.actors(room.state)[0];
      room.act(
        tokens[actor],
        `hero-${i}`,
        room.version,
        room.engine.candidates(room.state, actor)[0].action,
      );
    }
  store.save(room);
  fixtures.push({ kind, count, id: room.id, token: tokens[0] });
}
store.close();
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
try {
  const endpoint = await service.start();
  await mkdir(".tmp/screenshots", { recursive: true });
  for (const fixture of fixtures) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.addInitScript(
      (f) => localStorage.setItem(`room:${location.origin}:${f.id}`, f.token),
      fixture,
    );
    await page.goto(`${endpoint}/?room=${fixture.id}`);
    await page.getByLabel("昵称", { exact: true }).fill("玩家1");
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await expect(page.locator(".original-game")).toBeVisible();
    await expect(page.locator(".room-sidebar")).toBeHidden();
    await expect(
      page.locator(".live-workspace,.workspace-toolbar,.room-avatars"),
    ).toHaveCount(0);
    await expect(page.locator(".original-game [data-game-avatar]")).toHaveCount(
      fixture.count,
    );
    if (fixture.kind === "ccbs") {
      await expect(page.locator(".table-collection")).toHaveAttribute("open", "");
      await expect(page.locator(".table-collection [data-game-avatar]").first()).toBeVisible();
      expect(
        await page
          .locator(".table-collection")
          .evaluate((n) => getComputedStyle(n).maxHeight),
      ).toBe("none");
    }
    if (fixture.kind === "sgs")
      await expect(
        page
          .locator(
            '.original-game [data-room-region="sgs.hand"] [data-guide-target="sgs.card"]',
          )
          .first(),
      ).toBeVisible();
    await page.screenshot({
      path: `.tmp/screenshots/full-table-${fixture.kind}.png`,
    });
    await page.getByRole("button", { name: /^聊天/ }).first().click();
    await expect(page.locator(".chat-panel")).toBeVisible();
    const before = await page.locator(".room-sidebar").boundingBox();
    const divider = page.getByRole("separator", {
      name: "辅助区域宽度",
      exact: true,
    });
    await divider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(
        async () => (await page.locator(".room-sidebar").boundingBox()).width,
      )
      .toBeGreaterThan(before.width);
    const split = await divider.boundingBox();
    const widthBefore = (await page.locator(".room-sidebar").boundingBox())
      .width;
    await page.mouse.move(split.x + split.width / 2, split.y + 40);
    await page.mouse.down();
    await page.mouse.move(split.x - 60, split.y + 40, { steps: 8 });
    await page.mouse.up();
    expect(
      (await page.locator(".room-sidebar").boundingBox()).width,
    ).toBeGreaterThan(widthBefore + 50);
    const resized = (await page.locator(".room-sidebar").boundingBox()).width;
    const nextSplit = await divider.boundingBox();
    await page.mouse.move(nextSplit.x + nextSplit.width / 2, nextSplit.y + 40);
    await page.mouse.down();
    await page.mouse.move(nextSplit.x - 30, nextSplit.y + 40, { steps: 5 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    expect(
      Math.abs(
        (await page.locator(".room-sidebar").boundingBox()).width - resized,
      ),
    ).toBeLessThan(2);
    await page
      .getByRole("button", { name: "关闭辅助区域", exact: true })
      .click();
    await expect(page.locator(".room-sidebar")).toBeHidden();
    await page.getByRole("button", { name: "新手引导", exact: true }).click();
    await expect(
      page.locator(".room-sidebar .beginner-guide-content"),
    ).toBeVisible();
    await expect(page.locator(".chat-panel")).toBeHidden();
    await page
      .getByRole("button", { name: "关闭辅助区域", exact: true })
      .click();
    if (fixture.kind === "sgs")
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((nodes) =>
              nodes.every((n) => n.complete && n.naturalWidth > 0),
            ),
        )
        .toBe(true);
    for (const size of [
      { width: 1280, height: 720 },
      { width: 1024, height: 600 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
      if (["ktd", "tq"].includes(fixture.kind)) {
        expect(
          await page.locator(".map-scroll").evaluate((n) => n.clientHeight),
        ).toBeGreaterThan(80);
        await page
          .getByRole("button", { name: "缩小地图", exact: true })
          .click();
        await expect(page.getByLabel("地图缩放", { exact: true })).toHaveText(
          "50%",
        );
        await page
          .getByRole("button", { name: "适配窗口", exact: true })
          .click();
      }
    }
    console.log(
      `PASS complete table ${fixture.kind} (${fixture.count} players)`,
    );
    await page.close();
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

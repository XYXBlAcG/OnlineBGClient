import { chromium, expect } from "@playwright/test";
import { TestService } from "./service-harness.mjs";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-cache-")),
  service = new TestService(directory);
const browser = await chromium.launch({
  executablePath: existsSync(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  )
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined,
  headless: true,
});
try {
  const endpoint = await service.start(),
    page = await browser.newPage();
  await page.addInitScript(() => {
    const request = indexedDB.open("onlinebg-client", 2);
    request.onupgradeneeded = () => {
      for (const key of ["stickers", "records", "local"])
        request.result.createObjectStore(key);
    };
    request.onsuccess = () => {
      const db = request.result,
        transaction = db.transaction("stickers", "readwrite");
      transaction
        .objectStore("stickers")
        .put(
          {
            bytes: new Blob(["old-image-cache"]),
            preview: new Blob(["preview"]),
          },
          "old",
        );
      transaction.oncomplete = () => db.close();
    };
  });
  await page.goto(endpoint);
  await page.getByRole("button", { name: "创建房间", exact: true }).click();
  await page.getByRole("button", { name: "开始对局", exact: true }).click();
  await page.getByRole("button", { name: "我先出牌", exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("companion-notice", { detail: "这不是合法的出牌" }),
    ),
  );
  await expect(page.getByRole("alert")).toContainText("这不是合法的出牌");
  await expect(page.locator(".chat-panel")).toBeHidden();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "聊天", exact: true })
    .click();
  await expect(page.getByLabel("消息", { exact: true })).toBeVisible();
  await page.getByLabel("消息", { exact: true }).fill("提示不阻碍操作");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(page.getByText("提示不阻碍操作", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭提示", exact: true }).click();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("companion-notice", { detail: "弹窗内的操作提示" }),
    ),
  );
  await expect(page.getByRole("alert")).toContainText("弹窗内的操作提示");
  await expect(
    page.getByText("旧表情缓存 · 22 B", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清理选中缓存", exact: true }).click();
  await page.getByRole("button", { name: "清理缓存", exact: true }).click();
  await expect(
    page.getByText("旧表情缓存 · 0 B", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".original-game")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "恢复本地对局", exact: true }).click();
  await expect(page.locator(".original-game")).toBeVisible();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("switch", { name: "记录并显示策略审核", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "策略审核", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page
    .getByRole("switch", { name: "记录并显示策略审核", exact: true })
    .click();
  await page.keyboard.press("Escape");
  const saved = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("onlinebg-client", 2);
        request.onsuccess = () => {
          const db = request.result,
            read = db.transaction("local").objectStore("local").get("active");
          read.onsuccess = () => {
            db.close();
            resolve(read.result);
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
  expect(saved.room.config.auditEnabled).toBe(false);
  expect(saved.room.decisions).toHaveLength(0);
  expect(saved.room.summaries).toHaveLength(0);
  expect(saved.tokens).not.toHaveLength(0);
  console.log(
    "PASS: real IndexedDB cache size and cleanup, active game and identity preserved, audit off persisted",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

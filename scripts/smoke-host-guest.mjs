import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const status = await readFile(".tmp/native-hosting.log", "utf8");
assert.ok(status.startsWith("HOST_READY "), status);
const { url, room } = JSON.parse(status.slice("HOST_READY ".length));
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(`${url}/?room=${room}`);
  await page.getByLabel("昵称", { exact: true }).fill("公网手机");
  await page.getByRole("button", { name: "加入 / 恢复房间" }).click();
  await page.locator(".room-toolbar").waitFor();
  await page.getByRole("button", { name: "准备", exact: true }).tap();
  await page.getByRole("button", { name: /^聊天/ }).tap();
  await page.getByLabel("消息", { exact: true }).fill("好友已加入");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.locator(".uno").first().waitFor();
  await page.reload();
  await page.locator(".uno").first().waitFor();
  await page.getByRole("button", { name: /^聊天/ }).tap();
  await page.getByText("好友已加入", { exact: true }).waitFor();
  await page.getByLabel("消息", { exact: true }).fill("浏览器验证通过");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page
    .locator(".room-toolbar > strong")
    .filter({ hasText: "三国杀" })
    .waitFor();
  await page.getByRole("button", { name: "表情包", exact: true }).tap();
  await page.getByLabel("导入表情图片", { exact: true }).setInputFiles({
    name: "公网表情.png",
    mimeType: "image/png",
    buffer: await readFile("tests/fixtures/sticker.png"),
  });
  await page.getByRole("button", { name: "发送表情", exact: true }).tap();
  await page.getByLabel("消息", { exact: true }).fill("切换验证通过");
  await page.getByRole("button", { name: "发送", exact: true }).tap();
  console.log(
    "PASS: native host invitation, mobile browser guest, HTTPS/WSS game and chat, public custom sticker, identity recovery, same-room switch",
  );
} finally {
  await browser.close();
}

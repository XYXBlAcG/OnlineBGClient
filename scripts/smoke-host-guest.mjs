import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const url = process.env.TEST_SERVICE;
const room = process.env.TEST_ROOM;
assert.ok(url && room, "需要 TEST_SERVICE 和 TEST_ROOM 指向已启动的公网房间");
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
  page.setDefaultTimeout(120000);
  await page.goto(`${url}/?room=${room}`);
  await page.getByLabel("昵称", { exact: true }).fill("公网手机");
  await page.getByRole("button", { name: "加入 / 恢复房间" }).click();
  await page.locator(".room-toolbar").waitFor();
  await page.getByRole("button", { name: "准备", exact: true }).tap();
  await page.getByRole("button", { name: /^聊天/ }).tap();
  await page.getByLabel("消息", { exact: true }).fill("好友已加入");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.locator(".original-game").waitFor();
  await page.reload();
  await page.locator(".original-game").waitFor();
  await page.getByRole("button", { name: /^聊天/ }).tap();
  await page.getByText("好友已加入", { exact: true }).waitFor();
  await page.getByLabel("消息", { exact: true }).fill("浏览器验证通过");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  console.log(
    "PASS: native host invitation, mobile browser guest, HTTPS/WSS game and chat, identity recovery",
  );
} finally {
  await browser.close();
}

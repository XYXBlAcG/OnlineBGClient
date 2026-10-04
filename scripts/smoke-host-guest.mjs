import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const status = await readFile('.tmp/native-hosting.log', 'utf8');
assert.ok(status.startsWith('HOST_READY '), status);
const { url, room } = JSON.parse(status.slice('HOST_READY '.length));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${url}/?room=${room}`);
  await page.getByRole('button', { name: '加入 / 恢复房间' }).click();
  await page.locator('.room-toolbar').waitFor();
  await page.getByRole('button', { name: '准备', exact: true }).click();
  await page.getByLabel('消息', { exact: true }).fill('好友已加入');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await page.locator('.uno').first().waitFor();
  await page.reload();
  await page.getByRole('button', { name: '加入 / 恢复房间' }).click();
  await page.locator('.uno').first().waitFor();
  await page.getByText('好友已加入', { exact: true }).waitFor();
  await page.getByLabel('消息', { exact: true }).fill('浏览器验证通过');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  console.log('PASS: native host invitation, browser guest, public game and chat, identity recovery');
} finally { await browser.close(); }

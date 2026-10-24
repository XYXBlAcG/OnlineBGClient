import { expect } from "@playwright/test";
import { roomSurface } from "../src/client/room-surface.ts";
export const roomRegion = (page) =>
  page.getByRole("region", { name: roomSurface.region, exact: true });
export const roomGame = (page) =>
  roomRegion(page).getByLabel(roomSurface.game, { exact: true });
export async function readRoomId(page) {
  const region = roomRegion(page);
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute(roomSurface.id, /\S+/);
  return region.getAttribute(roomSurface.id);
}
export async function chooseRoomOption(page, name, method = "click") {
  if (await page.locator(".mobile-shell").count()) {
    await page.getByRole("button", { name: "房间菜单", exact: true })[method]();
    await page
      .getByRole("dialog", { name: "房间菜单", exact: true })
      .getByRole("button", { name, exact: true })
      [method]();
  } else await page.getByRole("button", { name, exact: true })[method]();
}
export async function openRoomSetup(page) {
  await chooseRoomOption(page, "游戏与人数");
  await expect(
    page.getByRole("dialog", { name: "下一局", exact: true }),
  ).toBeVisible();
}

export async function placeCatanBuilding(page, peers = [page]) {
  const board = page.locator('.original-game[data-game="ktd"]');
  await expect(board).toHaveAttribute("data-game-version", /\d+/);
  const version = Number(await board.getAttribute("data-game-version"));
  const target = board.locator('[data-guide-target="ktd.build"]').first();
  if (await page.evaluate(() => navigator.maxTouchPoints > 0))
    await target.tap();
  else await target.click();
  for (const peer of peers)
    await expect(
      peer.locator('.original-game[data-game="ktd"]'),
    ).toHaveAttribute("data-game-version", String(version + 1));
}

export async function pinchMap(page, ratio) {
  const bounds = await page.locator(".map-scroll").boundingBox();
  expect(bounds).not.toBeNull();
  const session = await page.context().newCDPSession(page),
    x = bounds.x + bounds.width / 2,
    y = bounds.y + bounds.height / 2,
    radius = Math.min(60, bounds.width / (4 * Math.max(1, ratio)));
  const points = (scale) => [
    { id: 0, x: x - radius * scale, y },
    { id: 1, x: x + radius * scale, y },
  ];
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points(1),
    });
    for (let step = 1; step <= 6; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: points(1 + ((ratio - 1) * step) / 6),
      });
      await page.waitForTimeout(20);
    }
  } finally {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  }
}

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

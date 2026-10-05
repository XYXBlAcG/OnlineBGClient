import { expect } from "@playwright/test";
export async function chooseRoomOption(page, name, method = "click") {
  const options = page.locator(".room-options");
  if ((await options.getAttribute("open")) === null)
    await options.locator("summary").click();
  await options.getByRole("button", { name, exact: true })[method]();
}
export async function openRoomSetup(page) {
  await chooseRoomOption(page, "游戏与人数");
  await expect(
    page.getByRole("dialog", { name: "下一局", exact: true }),
  ).toBeVisible();
}

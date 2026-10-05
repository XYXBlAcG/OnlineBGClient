import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { cardName } from "../src/domain/terms.ts";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-education-"));
const service = new TestService(directory, {
  entry: "src-tauri/resources/hosting/main.mjs",
  staticRoot: resolve("src-tauri/resources/hosting/web"),
});
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/education",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/education/domain/room.js");
const { RoomStore } = await import("../.tmp/education/server/storage.js");
const room = new Room(
  "education",
  { kind: "sgs", humans: 2, ai: [], team: false, training: false },
  "education-0",
);
const tokens = [room.claim("甲"), room.claim("乙")];
room.seats.forEach((seat) => (seat.ready = true));
room.start(tokens[0]);
for (let i = 0; i < 4 && [1, 2].includes(room.state.view.stage); i++) {
  const actor = room.engine.actors(room.state)[0];
  room.act(
    tokens[actor],
    `hero-${i}`,
    room.version,
    room.engine.candidates(room.state, actor)[0].action,
  );
}
const cards = room.engine.runtime.load(8280);
const trickId = room.state.view.playerHandCard[0].find(
  (id) => cards.e3(id) === 12,
);
expect(trickId).toBeDefined();
const trickName = cardName(cards.e3(trickId));
const store = new RoomStore(join(directory, "rooms.sqlite"));
store.save(room);
store.close();
const errors = [];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : undefined),
  headless: true,
  args: ["--disable-features=OverlayScrollbar,OverlayScrollbars"],
});
try {
  const endpoint = await service.start();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 500 },
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(endpoint);
  await page.addStyleTag({ content: "::-webkit-scrollbar { width: 16px; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => window.innerWidth - document.body.getBoundingClientRect().width,
    ),
  ).toBeGreaterThan(0);
  const rect = () =>
    page.locator(".app-toolbar").evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, width: r.width };
    });
  const before = await rect();
  for (const name of [
    ...Array.from({ length: 20 }, () => "打开设置"),
    "关于",
    "对局记录",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-scroll-locked",
      /\d+/,
    );
    expect(await rect()).toEqual(before);
    if (name === "打开设置") {
      await page
        .getByRole("combobox", { name: "外观主题", exact: true })
        .click();
      await expect(
        page.getByRole("option", { name: "跟随系统", exact: true }),
      ).toBeVisible();
      expect(await rect()).toEqual(before);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await rect()).toEqual(before);
      await expect(
        page.getByRole("combobox", { name: "外观主题", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(await rect()).toEqual(before);
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "关闭", exact: true })
      .click();
    expect(await rect()).toEqual(before);
  }
  await page.evaluate(
    ({ token, room }) =>
      localStorage.setItem(`room:${location.origin}:${room}`, token),
    { token: tokens[0], room: room.id },
  );
  await page.goto(`${endpoint}/?room=${room.id}`);
  await page
    .getByRole("button", { name: "加入 / 恢复房间", exact: true })
    .click();
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push(String(error)));
  await phone.addInitScript(
    ({ token, room }) =>
      localStorage.setItem(`room:${location.origin}:${room}`, token),
    { token: tokens[1], room: room.id },
  );
  await phone.goto(`${endpoint}/?room=${room.id}`);
  await phone.getByLabel("昵称", { exact: true }).fill("乙");
  await phone
    .getByRole("button", { name: "加入 / 恢复房间", exact: true })
    .click();
  const card = page.locator(`[data-card-guide="${trickName}"]`).first();
  await expect(card).toBeVisible();
  const selection = await page.locator(".original-game .sgs-select").count();
  await card.hover({ position: { x: 10, y: 10 } });
  await expect(page.locator(".ui-tooltip")).toContainText("具体作用");
  await expect(page.locator(".ui-tooltip")).toContainText("同花色");
  await page.locator(".app-mark").hover();
  await page.mouse.move(5, 5, { steps: 10 });
  await expect(page.locator(".ui-tooltip")).toHaveCount(0);
  await card.focus();
  await expect(page.locator(".ui-tooltip")).toContainText("如何响应");
  await card
    .getByRole("button", { name: `查看${trickName} · 作用`, exact: true })
    .press("Enter");
  await expect(page.getByRole("dialog")).toContainText("方块虽同为红色");
  expect(await page.locator(".original-game .sgs-select").count()).toBe(
    selection,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  const phoneCard = phone.locator(".sgs-card-list [data-card-guide]").first();
  await expect(phoneCard).toBeVisible();
  await phoneCard.locator(".card-detail-button").click();
  await expect(phone.getByRole("dialog")).toContainText("使用时机");
  await phone
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.locator(".hero-detail-button").first().click();
  await expect(page.getByRole("dialog")).toContainText("例如");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "新手引导", exact: true }).click();
  const guide = page.getByRole("region", { name: "三国杀新手引导" });
  await expect(guide.locator("ol li")).toHaveCount(3);
  await expect(
    page.locator(".original-game [data-guide-focus]").first(),
  ).toBeVisible();
  await guide.getByRole("button", { name: "定位到牌桌", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "牌桌引导定位" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回引导", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await guide.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(guide.locator("h3")).toHaveText("锦囊与响应");
  await expect(guide).toContainText("你现在有");
  await mkdir(".tmp/screenshots", { recursive: true });
  await page.screenshot({ path: ".tmp/screenshots/education-sgs-desktop.png" });
  await page.getByRole("button", { name: "新手引导", exact: true }).click();
  await expect(page.locator(".original-game [data-guide-focus]")).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
  await phoneContext.close();
  console.log(
    "PASS: stable dialog geometry, authoritative Sanguosha fixture, trick hover/focus and touch details without card selection, live guide values, board location and highlight cleanup",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

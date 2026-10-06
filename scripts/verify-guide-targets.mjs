import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-targets-"));
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/guide-targets",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/guide-targets/domain/room.js");
const { RoomStore } = await import("../.tmp/guide-targets/server/storage.js");
const store = new RoomStore(join(directory, "rooms.sqlite"));
const fixtures = [];
for (const kind of ["tq", "ktd", "ccbs", "dy", "sgs"]) {
  const room = new Room(
    `guide-${kind}`,
    { kind, humans: 2, ai: [], team: false, training: false },
    `guide-${kind}`,
  );
  const tokens = [room.claim("甲"), room.claim("乙")];
  room.seats.forEach((seat) => (seat.ready = true));
  room.start(tokens[0]);
  if (kind === "sgs")
    for (let i = 0; i < 4 && [1, 2].includes(room.state.view.stage); i++) {
      const actor = room.engine.actors(room.state)[0];
      room.act(
        tokens[actor],
        `hero-${i}`,
        room.version,
        room.engine.candidates(room.state, actor)[0].action,
      );
    }
  const actor = kind === "tq" ? room.engine.actors(room.state)[0] : 0;
  store.save(room);
  fixtures.push({
    kind,
    id: room.id,
    actor,
    token: tokens[actor],
    guestToken: tokens[1 - actor],
  });
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
try {
  const endpoint = await service.start();
  const errors = [];
  await mkdir(".tmp/screenshots", { recursive: true });
  for (const fixture of fixtures) {
    console.log("checking", fixture.kind);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    page.on("pageerror", (error) => errors.push(`${fixture.kind}: ${error}`));
    await page.addInitScript((fixture) => {
      localStorage.setItem(
        `room:${location.origin}:${fixture.id}`,
        fixture.token,
      );
      localStorage.setItem(
        "onlinebg.preferences",
        JSON.stringify({ beginnerGuides: { [fixture.kind]: true } }),
      );
    }, fixture);
    await page.goto(`${endpoint}/?room=${fixture.id}`);
    await page.getByLabel("昵称", { exact: true }).fill("甲");
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    const guest = await browser.newPage();
    await guest.addInitScript(
      (fixture) =>
        localStorage.setItem(
          `room:${location.origin}:${fixture.id}`,
          fixture.guestToken,
        ),
      fixture,
    );
    await guest.goto(`${endpoint}/?room=${fixture.id}`);
    await guest.getByLabel("昵称", { exact: true }).fill("乙");
    await guest
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await page.screenshot({
      path: `.tmp/screenshots/guide-before-${fixture.kind}.png`,
    });
    await page.getByRole("button",{name:"新手引导",exact:true}).click();
    const guide = page.locator(".beginner-guide-content");
    await expect(guide).toBeVisible();
    const locator = guide.locator(".beginner-guide-context > button");
    await locator.click();
    await expect(page.getByLabel("教学目标标记")).toBeVisible();
    const target = page.locator("[data-guide-focus]");
    expect(await target.count()).toBeGreaterThan(0);
    await expect(page.locator("svg[data-guide-focus]")).toHaveCount(0);
    for (const node of await target.all())
      await expect(node).toHaveAttribute(
        "data-guide-target",
        /^(tq\.cell|ktd\.build|ccbs\.market|dy\.card|sgs\.hero)$/,
      );
    if (fixture.kind === "tq") {
      await expect(target).toHaveCount(10);
      await page.getByRole("button", { name: "缩小地图", exact: true }).click();
      await expect(page.getByLabel("地图缩放")).toHaveText("50%");
      await expect
        .poll(() => page.locator(".guide-highlight .guide-ring").count())
        .toBe(10);
      await page.getByRole("button", { name: "下一步", exact: true }).click();
      await locator.click();
      await expect(
        page.locator('[data-guide-target="tq.piece"][data-guide-focus]'),
      ).toHaveCount(1);
      await page.getByRole("button", { name: "下一步", exact: true }).click();
      await locator.click();
      await expect(guide.getByRole("status")).toContainText("先点击");
    }
    const previous = guide.getByRole("button", { name: "上一步", exact: true });
    while (await previous.isEnabled()) await previous.click();
    for (let step = 0; step < 5; step++) {
      await locator.click();
      await expect
        .poll(
          async () =>
            (await target.count()) ||
            (await guide.getByRole("status").textContent()).trim().length,
        )
        .toBeGreaterThan(0);
      await expect(page.locator("svg[data-guide-focus]")).toHaveCount(0);
      if (await target.count())
        await expect(page.getByLabel("教学目标标记")).toBeVisible();
      await page.getByRole("button", { name: "返回引导", exact: true }).click();
      if (step < 4)
        await guide
          .getByRole("button", { name: "下一步", exact: true })
          .click();
    }
    await page.screenshot({
      path: `.tmp/screenshots/guide-${fixture.kind}.png`,
    });
    await page.close();
    await guest.close();
  }
  expect(errors).toEqual([]);
  console.log(
    "PASS: five real games and all guide steps, semantic element targets, checkers camp/zoom and missing-target prerequisite",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

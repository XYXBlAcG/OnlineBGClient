import { chromium, expect } from "@playwright/test";
import { WebSocket } from "ws";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { TestService } from "./service-harness.mjs";
const directory = await mkdtemp(join(tmpdir(), "onlinebg-experience-"));
await build({
  entryPoints: [
    "src/domain/room.ts",
    "src/server/storage.ts",
    "src/client/game-motion-events.ts",
  ],
  outdir: ".tmp/experience",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/experience/domain/room.js");
const { gameMotionEvents } =
  await import("../.tmp/experience/client/game-motion-events.js");
const { RoomStore } = await import("../.tmp/experience/server/storage.js");
const store = new RoomStore(join(directory, "rooms.sqlite")),
  fixtures = [];
for (const kind of ["ccbs", "tq", "uno", "sgs", "ktd", "dy", "fxq", "ddz"]) {
  const room = new Room(
    `motion-${kind}`,
    { kind, humans: 3, ai: [], team: false, training: false },
    `motion-${kind}`,
  );
  const tokens = [
    room.claim("甲", undefined, "曹"),
    room.claim("乙", undefined, "🤓"),
    room.claim("丙", undefined, "👨‍👩‍👧‍👦"),
  ];
  room.seats.forEach((s) => (s.ready = true));
  room.start(tokens[0]);
  if (kind === "uno") {
    room.act(tokens[0], "uno-deal", room.version, { type: "uno-start" });
    for (let i = 0; i < 30 && room.engine.actors(room.state)[0] !== 0; i++) {
      const actor = room.engine.actors(room.state)[0];
      room.act(
        tokens[actor],
        `uno-ready-${i}`,
        room.version,
        room.engine.candidates(room.state, actor)[0].action,
      );
    }
    if (room.engine.actors(room.state)[0] !== 0)
      throw new Error("UNO fixture must start at owner turn");
  }
  if (kind === "sgs")
    for (let i = 0; i < 30 && [1, 2].includes(room.state.view.stage); i++) {
      const actor = room.engine.actors(room.state)[0];
      room.act(
        tokens[actor],
        `hero-${i}`,
        room.version,
        room.engine.candidates(room.state, actor)[0].action,
      );
    }
  if (kind === "ktd") {
    const actor = room.engine.actors(room.state)[0];
    room.act(
      tokens[actor],
      "historical-build",
      room.version,
      room.engine.candidates(room.state, actor)[0].action,
    );
    room.end(tokens[0]);
    room.start(tokens[0]);
  }
  store.save(room);
  fixtures.push({ room, tokens });
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
const errors = [],
  metrics = [],
  sockets = [];
const choose = async (page, label, value) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
};
const verifySpriteLanding = async (page) => {
  const positions = await page.evaluate(() => {
    const positions = [];
    for (const animation of document.getAnimations()) {
      const shell = animation.effect.target;
      if (!["piece", "build"].includes(shell.dataset.motionEvent)) continue;
      animation.pause();
      animation.currentTime = animation.effect.getTiming().duration;
      const glyph = shell.querySelector("svg > g > [data-motion-key]");
      if (!glyph) throw new Error("Missing actual SVG artwork");
      const original = document.querySelector(
          `.original-game [data-motion-key="${glyph.getAttribute("data-motion-key")}"]`,
        ),
        a = original.getBoundingClientRect(),
        b = glyph.getBoundingClientRect();
      positions.push({
        x: Math.abs(a.x - b.x),
        y: Math.abs(a.y - b.y),
        width: Math.abs(a.width - b.width),
        height: Math.abs(a.height - b.height),
      });
    }
    if (positions.length)
      document
        .querySelector(".original-game")
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    return positions;
  });
  for (const position of positions)
    for (const delta of Object.values(position)) expect(delta).toBeLessThan(2);
};
try {
  const endpoint = await service.start();
  await mkdir("artifacts/review", { recursive: true });
  for (const { room, tokens } of fixtures) {
    for (let actor = 1; actor < 3; actor++) {
      const socket = new WebSocket(`${endpoint.replace("http", "ws")}/connect`);
      await new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      });
      const joined = new Promise((resolve) =>
        socket.on("message", (data) => {
          if (JSON.parse(data).type === "session") resolve();
        }),
      );
      socket.send(
        JSON.stringify({
          type: "join",
          room: room.id,
          token: tokens[actor],
          name: `玩家${actor}`,
        }),
      );
      await joined;
      sockets.push(socket);
    }
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (error) => {
      errors.push(String(error));
      console.log("PAGE ERROR", String(error));
    });
    await page.addInitScript(
      ({ id, token }) => {
        localStorage.setItem(`room:${location.origin}:${id}`, token);
        localStorage.setItem(
          "onlinebg.preferences",
          JSON.stringify({ motion: false, enhancedGameMotion: true }),
        );
        const Native = window.WebSocket;
        window.WebSocket = class extends Native {
          constructor(...args) {
            super(...args);
            window.testSocket = this;
          }
        };
        const beginSvg = SVGAnimationElement.prototype.beginElement;
        window.svgCalls = [];
        SVGAnimationElement.prototype.beginElement = function () {
          window.svgCalls.push(
            this.closest(".original-game")?.dataset.gameMotion,
          );
          return beginSvg.call(this);
        };
        const animate = Element.prototype.animate;
        window.gameCalls = [];
        Element.prototype.animate = function (...args) {
          window.gameCalls.push({
            className: this.getAttribute("class"),
            event:
              this.closest(".game-motion-copy")?.getAttribute(
                "data-motion-event",
              ),
            scope: this.closest("[data-motion-scope]")?.getAttribute(
              "data-motion-scope",
            ),
            mode: document.documentElement.dataset.gameMotion,
          });
          return animate.apply(this, args);
        };
      },
      { id: room.id, token: tokens[0] },
    );
    await page.goto(`${endpoint}/?room=${room.id}`);
    await page.getByLabel("昵称", { exact: true }).fill("甲");
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    const table = page.locator(".original-game");
    await expect(table).toBeVisible();
    await expect(
      page.locator('[data-game-avatar="0"] .game-avatar-face'),
    ).toHaveText("曹");
    await expect(
      page.locator('[data-game-avatar="1"] .game-avatar-face'),
    ).toHaveText("🤓");
    const profiles =
      room.config.kind === "ccbs"
        ? [
            [false, false],
            [false, true],
            [true, false],
            [true, true],
          ]
        : [[false, true]];
    for (const [ui, game] of profiles) {
      await page.getByRole("button", { name: "打开设置", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "界面动画", exact: true })
        .setChecked(ui);
      await page
        .getByRole("checkbox", { name: "游戏动画", exact: true })
        .setChecked(game);
      await page
        .getByRole("dialog", { name: "设置", exact: true })
        .getByRole("button", { name: "关闭", exact: true })
        .click();
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.dataset.motion),
        )
        .toBe(String(ui));
      const before = await page.evaluate(() => window.gameCalls.length);
      const actor = room.engine.actors(room.state)[0],
        action =
          room.config.kind === "uno"
            ? { type: "uno-draw" }
            : room.engine.candidates(room.state, actor)[0]?.action;
      if (!action) continue;
      const version = room.version,
        previousProjection = room.snapshot(tokens[0]).state;
      const command = {
        type: "action",
        id: `motion-${version}`,
        token: tokens[actor],
        version,
        action,
      };
      if (actor === 0)
        await page.evaluate(
          (command) => window.testSocket.send(JSON.stringify(command)),
          command,
        );
      else
        sockets[
          fixtures.indexOf(fixtures.find((f) => f.room === room)) * 2 +
            (actor - 1)
        ].send(JSON.stringify(command));
      room.act(tokens[actor], command.id, version, action);
      await expect(table).toHaveAttribute(
        "data-game-version",
        String(room.version),
      );
      if (game) {
        const expected = gameMotionEvents(
          previousProjection,
          room.snapshot(tokens[0]).state,
          0,
        );
        for (const event of expected)
          await expect
            .poll(() =>
              page.evaluate(
                ({ before, type }) =>
                  window.gameCalls
                    .slice(before)
                    .some((call) => call.event === type),
                { before, type: event.type },
              ),
            )
            .toBe(true);
      }
      if (game && ["tq", "ktd"].includes(room.config.kind))
        await verifySpriteLanding(page);
      if (room.config.kind === "uno") {
        const flip = page.locator(
          '.game-motion-copy[data-motion-event="draw"][data-motion-reveal]',
        );
        await expect(flip).toHaveCount(1);
        const revealed = Number(await flip.getAttribute("data-motion-reveal"));
        expect(room.state.view.playerCards[0]).toContain(revealed);
        await expect(flip.locator(".game-motion-back")).toHaveCount(1);
        await expect(flip.locator(".game-motion-front")).toHaveCount(1);
        expect(
          await table
            .locator(`.uno-list [data-motion-key="uno-card-${revealed}"]`)
            .evaluate((node) => node.style.opacity),
        ).toBe("0");
        await expect
          .poll(
            () =>
              flip
                .locator(".game-motion-flipper")
                .evaluate((node) => getComputedStyle(node).transform),
            { intervals: [16, 32, 64] },
          )
          .toContain("matrix3d");
        await page.screenshot({ path: "artifacts/review/uno-flip.png" });
      }
      if (room.config.kind === "ccbs")
        await expect
          .poll(() =>
            page.evaluate(
              (before) =>
                window.gameCalls
                  .slice(before)
                  .some((call) => call.scope === "game"),
              before,
            ),
          )
          .toBe(true);
      await expect
        .poll(() =>
          page.locator(".game-motion-copy,.game-motion-label").count(),
        )
        .toBe(0);
    }
    if (["fxq", "ddz"].includes(room.config.kind)) {
      let moved = false;
      for (let step = 0; step < 35 && !moved; step++) {
        const actor = room.engine.actors(room.state)[0],
          previousProjection = room.snapshot(tokens[0]).state,
          action = room.engine.candidates(room.state, actor)[0]?.action;
        if (!action) break;
        const before = await page.evaluate(() => window.gameCalls.length),
          command = {
            type: "action",
            id: `follow-${room.version}`,
            token: tokens[actor],
            version: room.version,
            action,
          };
        if (actor === 0)
          await page.evaluate(
            (command) => window.testSocket.send(JSON.stringify(command)),
            command,
          );
        else
          sockets[
            fixtures.indexOf(fixtures.find((f) => f.room === room)) * 2 +
              actor -
              1
          ].send(JSON.stringify(command));
        room.act(tokens[actor], command.id, room.version, action);
        await expect(table).toHaveAttribute(
          "data-game-version",
          String(room.version),
        );
        const events = gameMotionEvents(
          previousProjection,
          room.snapshot(tokens[0]).state,
          0,
        );
        const type = room.config.kind === "fxq" ? "piece" : "card";
        if (events.some((event) => event.type === type)) {
          moved = true;
          await expect
            .poll(() =>
              page.evaluate(
                ({ before, type }) =>
                  window.gameCalls
                    .slice(before)
                    .some((call) => call.event === type),
                { before, type },
              ),
            )
            .toBe(true);
        }
        if (moved && room.config.kind === "fxq")
          await verifySpriteLanding(page);
        await expect
          .poll(() =>
            page.locator(".game-motion-copy,.game-motion-label").count(),
          )
          .toBe(0);
      }
      expect(moved).toBe(true);
    }
    if (room.config.kind === "ccbs") {
      await page.getByRole("button", { name: "打开设置", exact: true }).click();
      await page
        .getByRole("navigation", { name: "设置分组" })
        .getByRole("button", { name: "外观", exact: true })
        .click();
      await page.getByLabel("自定义头像", { exact: true }).fill("龍");
      await page.getByRole("button", { name: "使用头像", exact: true }).click();
      await expect(
        page.locator('[data-game-avatar="0"] .game-avatar-face'),
      ).toHaveText("龍");
      await choose(page, "外观主题", "深色");
      await expect
        .poll(() =>
          page
            .locator(".settings-nav button")
            .last()
            .evaluate((node) => getComputedStyle(node).backgroundColor),
        )
        .toBe("rgb(48, 53, 64)");
      await page.screenshot({
        path: "artifacts/review/experience-settings.png",
      });
      await page
        .getByRole("dialog", { name: "设置", exact: true })
        .getByRole("button", { name: "关闭", exact: true })
        .click();
      await page.locator('[data-game-avatar="0"]').click();
      await expect
        .poll(() =>
          page
            .locator(".avatar-menu")
            .evaluate(
              (node) => node.getBoundingClientRect().bottom <= innerHeight - 10,
            ),
        )
        .toBe(true);
      await page.getByText("更换头像", { exact: true }).click();
      await page.getByRole("button", { name: "头像 😎", exact: true }).click();
      await expect(
        page.locator('[data-game-avatar="0"] .game-avatar-face'),
      ).toHaveText("😎");
      await page.keyboard.press("Escape");
      const phoneContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const phone = await phoneContext.newPage();
      phone.on("pageerror", (error) => errors.push(String(error)));
      await phone.addInitScript(
        ({ room, token }) =>
          localStorage.setItem(`room:${location.origin}:${room}`, token),
        { room: room.id, token: tokens[1] },
      );
      await phone.goto(`${endpoint}/?room=${room.id}`);
      await phone.getByLabel("昵称", { exact: true }).fill("乙");
      await phone.getByRole("button", { name: "头像 🥰", exact: true }).click();
      await phone
        .getByRole("button", { name: "加入 / 恢复房间", exact: true })
        .click();
      await expect(
        phone.locator('[data-game-avatar="1"] .game-avatar-face'),
      ).toHaveText("🤓");
      await phone.locator('[data-game-avatar="1"]').click();
      await expect
        .poll(() =>
          phone
            .locator(".avatar-menu")
            .evaluate(
              (node) => node.getBoundingClientRect().bottom <= innerHeight - 10,
            ),
        )
        .toBe(true);
      await phone.getByText("更换头像", { exact: true }).click();
      await phone.getByRole("button", { name: "头像 孙", exact: true }).click();
      await expect(
        page.locator('[data-game-avatar="1"] .game-avatar-face'),
      ).toHaveText("孙");
      await phone.getByText("动效偏好", { exact: true }).click();
      await phone
        .getByRole("checkbox", { name: "界面动画", exact: true })
        .uncheck();
      await phone
        .getByRole("checkbox", { name: "游戏动画", exact: true })
        .check();
      await expect
        .poll(() =>
          phone.evaluate(() => document.documentElement.dataset.gameMotion),
        )
        .toBe("enhanced");
      await expect
        .poll(() =>
          phone.evaluate(() => document.documentElement.dataset.motion),
        )
        .toBe("false");
      await phone.screenshot({
        path: "artifacts/review/experience-mobile-avatar.png",
      });
      await phoneContext.close();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.dataset.gameMotion),
        )
        .toBe("reduced");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.screenshot({
        path: "artifacts/review/experience-splendor.png",
      });
    }
    if (room.config.kind === "ktd") {
      await page.getByRole("button", { name: "对局记录", exact: true }).click();
      await page.locator(".record-row > button").first().click();
      const replay = page.getByRole("dialog", {
        name: "卡坦岛 · 回放",
        exact: true,
      });
      await expect(
        replay.getByRole("button", { name: "播放回放", exact: true }),
      ).toBeEnabled();
      await replay
        .getByRole("slider", { name: "回放进度", exact: true })
        .focus();
      await page.keyboard.press("End");
      await expect(replay.locator(".original-game")).toHaveAttribute(
        "data-game-version",
        "1",
      );
      await page.evaluate(() => (window.svgCalls = []));
      const actor = room.engine.actors(room.state)[0],
        version = room.version,
        action = room.engine.candidates(room.state, actor)[0].action;
      const command = {
        type: "action",
        id: `parallel-${version}`,
        token: tokens[actor],
        version,
        action,
      };
      if (actor === 0)
        await page.evaluate(
          (command) => window.testSocket.send(JSON.stringify(command)),
          command,
        );
      else
        sockets[
          fixtures.indexOf(fixtures.find((f) => f.room === room)) * 2 +
            actor -
            1
        ].send(JSON.stringify(command));
      room.act(tokens[actor], command.id, version, action);
      await expect(
        page.locator(`.original-game[data-game-version="${room.version}"]`),
      ).toHaveCount(1);
      await expect
        .poll(() => page.evaluate(() => window.svgCalls.length))
        .toBeGreaterThan(0);
      expect(await page.evaluate(() => window.svgCalls)).not.toContain(
        "reduced",
      );
      await replay.getByRole("button", { name: "关闭", exact: true }).click();
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      )
      .toBe(true);
    metrics.push({
      kind: room.config.kind,
      ...(await page.evaluate(
        () =>
          new Promise((resolve) => {
            const times = [];
            let last = performance.now();
            const sample = (now) => {
              times.push(now - last);
              last = now;
              if (times.length < 60) requestAnimationFrame(sample);
              else {
                times.sort((a, b) => a - b);
                resolve({
                  idleFrameP95Ms: times[Math.floor(times.length * 0.95)],
                  idleFramesOver50Ms: times.filter((t) => t > 50).length,
                  remainingCopies: document.querySelectorAll(
                    ".game-motion-copy,.game-motion-label",
                  ).length,
                });
              }
            };
            requestAnimationFrame(sample);
          }),
      )),
    });
    await page.close();
    console.log(`PASS experience ${room.config.kind}`);
  }
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/review/experience-performance.json",
    JSON.stringify(metrics, null, 2) + "\n",
  );
  console.log(
    "PASS eight games, four Boolean combinations, live avatar identity, reduced motion, cleanup and low-height layouts",
  );
} finally {
  sockets.forEach((socket) => socket.close());
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

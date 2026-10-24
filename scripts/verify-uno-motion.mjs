import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { TestService } from "./service-harness.mjs";
await build({
  entryPoints: ["src/domain/room.ts", "src/server/storage.ts"],
  outdir: ".tmp/uno-motion",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { Room } = await import("../.tmp/uno-motion/domain/room.js"),
  { RoomStore } = await import("../.tmp/uno-motion/server/storage.js");
const directory = await mkdtemp(join(tmpdir(), "onlinebg-uno-motion-")),
  room = new Room(
    "uno-flip",
    { kind: "uno", humans: 2, ai: [], team: false, training: false },
    "flip",
  );
const tokens = [room.claim("甲"), room.claim("乙")];
room.setReady(tokens[1], true);
room.start(tokens[0]);
room.act(tokens[0], "start", room.version, { type: "uno-start" });
for (let i = 0; i < 150; i++) {
  const active = room.engine.actors(room.state)[0];
  if (
    room.state.view.playerCards[active].length === 1 &&
    !room.state.view.currentPlus &&
    !room.state.view.isLeadCard
  )
    break;
  const moves = room.engine.candidates(room.state, active),
    action =
      moves.find((move) => move.action.type === "uno-play")?.action ||
      moves[0].action;
  room.act(tokens[active], `advance-${i}`, room.version, action);
}
const actor = room.engine.actors(room.state)[0],
  observer = 1 - actor;
const store = new RoomStore(join(directory, "rooms.sqlite"));
store.save(room);
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
const errors = [];
try {
  const endpoint = await service.start();
  await mkdir("artifacts/review", { recursive: true });
  const pages = [];
  for (const player of [actor, observer]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    page.on("pageerror", (error) => errors.push(String(error)));
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
        window.reveals = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          if (this.classList.contains("game-motion-flipper"))
            window.reveals.push(this.parentElement.dataset.motionReveal);
          return animate.apply(this, args);
        };
      },
      { id: room.id, token: tokens[player] },
    );
    await page.goto(`${endpoint}/?room=${room.id}`);
    await page
      .getByLabel("昵称", { exact: true })
      .fill(player === 0 ? "甲" : "乙");
    await page
      .getByRole("button", { name: "加入 / 恢复房间", exact: true })
      .click();
    await expect(page.locator(".original-game")).toBeVisible();
    pages.push(page);
  }
  const [owner, guest] = pages,
    previous = structuredClone(room.state.view.playerCards[actor]);
  const command = {
    type: "action",
    id: "flip-draw",
    token: tokens[actor],
    version: room.version,
    action: { type: "uno-draw" },
  };
  await owner.evaluate(
    (command) => window.testSocket.send(JSON.stringify(command)),
    command,
  );
  room.act(tokens[actor], command.id, room.version, command.action);
  const drawn = room.state.view.playerCards[actor].filter(
    (id) => !previous.includes(id),
  );
  expect(drawn.length).toBeGreaterThan(0);
  const flip = owner.locator(".game-motion-flipper");
  await expect(flip).toHaveCount(drawn.length);
  await owner.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const target = animation.effect.target;
      if (target.classList.contains("game-motion-flipper")) {
        animation.pause();
        animation.currentTime = 650;
      }
      if (
        target.classList.contains("game-motion-copy") &&
        target.dataset.motionReveal !== undefined
      ) {
        animation.pause();
        animation.currentTime = 480;
      }
    }
  });
  await owner.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const dimensions = await owner.evaluate(() => {
    const flipper = document.querySelector(".game-motion-flipper"),
      shell = flipper.parentElement,
      key = shell.dataset.motionReveal,
      card = document.querySelector(
        `.original-game .uno-list [data-motion-key="uno-card-${key}"]`,
      );
    return {
      front: flipper
        .querySelector(".game-motion-front [data-motion-key]")
        .getAttribute("data-motion-key"),
      opacity: card.style.opacity,
      perspective: getComputedStyle(shell).perspective,
      backface: getComputedStyle(flipper.firstElementChild).backfaceVisibility,
      angle: getComputedStyle(flipper).transform,
      table: card.getBoundingClientRect().toJSON(),
      copy: shell.getBoundingClientRect().toJSON(),
    };
  });
  expect(dimensions.front).toBe(`uno-card-${drawn[0]}`);
  expect(dimensions.opacity).toBe("0");
  expect(dimensions.perspective).toBe("850px");
  expect(dimensions.backface).toBe("hidden");
  expect(dimensions.angle).toContain("matrix3d");
  expect(Math.abs(dimensions.table.x - dimensions.copy.x)).toBeLessThan(2);
  expect(Math.abs(dimensions.table.y - dimensions.copy.y)).toBeLessThan(2);
  await owner.screenshot({ path: "artifacts/review/uno-3d-flip.png" });
  expect(await guest.evaluate(() => window.reveals)).toEqual([]);
  await expect(guest.locator(".game-motion-front")).toHaveCount(0);
  await owner
    .locator(".original-game .uno-list")
    .click({ position: { x: 10, y: 5 } });
  await expect(
    owner.locator(".game-motion-copy,.game-motion-label"),
  ).toHaveCount(0);
  for (const id of drawn)
    expect(
      await owner
        .locator(`.uno-list [data-motion-key="uno-card-${id}"]`)
        .evaluate((node) => node.style.opacity),
    ).not.toBe("0");
  expect(await owner.evaluate(() => window.reveals.map(Number))).toEqual(drawn);
  await owner.emulateMedia({ reducedMotion: "reduce" });
  await expect(owner.locator(".original-game")).toHaveAttribute(
    "data-game-motion",
    "reduced",
  );
  expect(errors).toEqual([]);
  console.log(
    "PASS UNO actual draw: 3D back/front, landing geometry, owner-only reveal, immediate pointer cancellation, restored hand and reduced motion",
  );
} finally {
  await browser.close();
  await service.stop();
  await rm(directory, { recursive: true, force: true });
}

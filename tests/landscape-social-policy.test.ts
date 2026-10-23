import { expect, it } from "vitest";
import {
  imageProfiles,
  attachmentLimits,
  compressionOptions,
} from "../src/domain/attachments";
import { parseChatCommand, bannerCommands } from "../src/domain/banner";
import { mobileViewport } from "../src/client/mobile-viewport";
it("prioritizes image clarity and preserves PNG instead of forcing lossy conversion", () => {
  expect(attachmentLimits.bytes).toBe(3 * 1024 * 1024);
  expect(compressionOptions("image/png", "clear")).toMatchObject({
    fileType: "image/png",
    alwaysKeepResolution: true,
    maxIteration: 1,
  });
  expect(
    compressionOptions("image/jpeg", "clear").initialQuality,
  ).toBeGreaterThanOrEqual(0.9);
  expect(imageProfiles.clear.dimension).toBeGreaterThan(
    imageProfiles.data.dimension,
  );
});
it("derives bounded commands from one catalogue", () => {
  expect(parseChatCommand("/title --style red 好牌")).toMatchObject({
    kind: "title",
    style: "red",
    text: "好牌",
  });
  expect(parseChatCommand("/countdown 3 开局")).toMatchObject({
    kind: "countdown",
    seconds: 3,
    text: "开局",
  });
  expect(parseChatCommand("/combo 🤣 😱")).toMatchObject({
    kind: "combo",
    effects: ["laugh", "shock"],
  });
  expect(parseChatCommand("/roll 2d6")).toEqual({
    kind: "roll",
    count: 2,
    sides: 6,
  });
  expect(parseChatCommand("/me 正在思考")).toMatchObject({
    kind: "emote",
    text: "正在思考",
  });
  expect(parseChatCommand("/clearbanner")).toEqual({ kind: "clear" });
  expect(bannerCommands).toHaveLength(11);
  expect(() => parseChatCommand("/countdown 999 等等")).toThrow();
  expect(() => parseChatCommand("/roll 100d10000")).toThrow();
});
it("distinguishes landscape from a portrait keyboard and preserves safe available height", () => {
  expect(
    mobileViewport({
      width: 844,
      height: 390,
      visualHeight: 390,
      offsetTop: 0,
    }),
  ).toMatchObject({ landscape: true, height: 390, keyboard: false });
  expect(
    mobileViewport({
      width: 390,
      height: 844,
      visualHeight: 360,
      offsetTop: 0,
    }),
  ).toMatchObject({ landscape: false, height: 360, keyboard: true });
});
it("keeps Android keyboard positioning relative to its already resized window", () => {
  expect(
    mobileViewport({
      width: 390,
      height: 844,
      visualHeight: 360,
      windowHeight: 360,
      offsetTop: 0,
      orientation: "portrait",
    }),
  ).toMatchObject({ keyboard: true, bottom: 0, landscape: false });
});

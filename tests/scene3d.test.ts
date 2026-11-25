import { describe, expect, it } from "vitest";
import {
  detectSceneEnvironment,
  resolveSceneRenderer,
  scenePalettes,
} from "../src/client/scene3d/environment";
import { preferencesSchema } from "../src/client/preferences";

describe("scene renderer resolution", () => {
  const desktop = { finePointer: true, width: 1440, webgl: true };

  it("uses 3D only when supported and preferred", () => {
    expect(resolveSceneRenderer("auto", false, desktop)).toBe("3d");
    expect(resolveSceneRenderer("3d", false, desktop)).toBe("3d");
    expect(resolveSceneRenderer("2d", false, desktop)).toBe("2d");
    expect(resolveSceneRenderer("3d", true, desktop)).toBe("2d");
    expect(resolveSceneRenderer("3d", false, { ...desktop, webgl: false })).toBe("2d");
  });

  it("falls back to 2D on coarse or narrow screens in auto mode", () => {
    expect(resolveSceneRenderer("auto", false, { ...desktop, finePointer: false })).toBe("2d");
    expect(resolveSceneRenderer("auto", false, { ...desktop, width: 390 })).toBe("2d");
  });

  it("has no WebGL environment outside a browser", () => {
    expect(detectSceneEnvironment()).toEqual({
      finePointer: false,
      width: 0,
      webgl: false,
    });
  });

  it("provides two palettes for each game", () => {
    expect(Object.keys(scenePalettes)).toEqual(
      expect.arrayContaining(["coast", "forest", "midnight", "arena"]),
    );
  });
});

describe("3D preferences", () => {
  it("defaults golf to auto and provides both environments", () => {
    const preferences = preferencesSchema.parse({});
    expect(preferences.golfRenderer).toBe("auto");
    expect(preferences.golfEnvironment).toBe("coast");
    expect(preferences.poolEnvironment).toBe("midnight");
    expect(
      preferencesSchema.parse({ golfEnvironment: "forest" }).golfEnvironment,
    ).toBe("forest");
    expect(
      preferencesSchema.parse({ poolEnvironment: "arena" }).poolEnvironment,
    ).toBe("arena");
  });
});

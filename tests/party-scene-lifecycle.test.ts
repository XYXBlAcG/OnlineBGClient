import { expect, it, vi } from "vitest";
const gpu = vi.hoisted(() => ({
  fail: true,
  ticks: [] as { tick: () => void; stop: ReturnType<typeof vi.fn> }[],
}));
vi.mock("pixi.js", () => ({
  Application: class {
    renderer = { destroy: vi.fn() };
    async init() {
      throw Error("WebGL unavailable");
    }
  },
  Ticker: class {
    maxFPS = 0;
    stop = vi.fn();
    add(tick: () => void) {
      gpu.ticks.push({ tick, stop: this.stop });
    }
    start() {}
    destroy() {}
  },
  Container: class {},
  Sprite: class {},
  Texture: {},
  Assets: {},
}));
vi.mock("../src/client/party/cinema", () => ({
  PartyCinema: class {
    update() {}
    destroy() {}
  },
}));
vi.mock("../src/client/party/filters", () => ({
  PartyFilter: class {
    update() {}
    destroy() {}
  },
}));
import { PartyScene } from "../src/client/party/scene";
import { partyPreferencesSchema } from "../src/client/party/policy";
it("WebGL 初始化失败仍用同一采样器完成 10 秒绘制，不静默降成只有文字", async () => {
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
  const canvas = {
    getContext: () => ctx,
    width: 0,
    height: 0,
    remove: vi.fn(),
  };
  vi.stubGlobal("devicePixelRatio", 1);
  vi.stubGlobal("document", {
    hidden: false,
    createElement: () => canvas,
    querySelector: () => null,
  });
  const status = vi.fn(),
    host = {
      clientWidth: 390,
      clientHeight: 700,
      append: vi.fn(),
    } as unknown as HTMLElement;
  const scene = new PartyScene(
    host,
    partyPreferencesSchema.parse({ quality: "light" }),
    true,
    status,
  );
  try {
    await scene.init();
    expect(status).toHaveBeenCalledWith(expect.stringContaining("兼容绘制"));
    let time = 1000;
    scene.update(
      [
        {
          id: "egg",
          item: "cometEgg",
          from: "a",
          target: "b",
          time: 0,
          duration: 10000,
          seed: 4,
          caption: "蛋雨",
          density: 1,
        },
      ],
      ["a", "b"],
      () => time,
    );
    ctx.clearRect.mockClear();
    scene.update([], ["a", "b"], () => 11000, 0);
    expect(ctx.clearRect).toHaveBeenCalled();
    scene.update(
      [
        {
          id: "egg",
          item: "cometEgg",
          from: "a",
          target: "b",
          time: 0,
          duration: 10000,
          seed: 4,
          caption: "蛋雨",
          density: 1,
        },
      ],
      ["a", "b"],
      () => time,
    );
    const ticker = gpu.ticks.at(-1)!;
    ticker.tick();
    expect(ctx.drawImage).toHaveBeenCalled();
    ctx.drawImage.mockClear();
    time = 9600;
    ticker.tick();
    expect(ctx.drawImage).toHaveBeenCalled();
    ctx.clearRect.mockClear();
    time = 10001;
    ticker.tick();
    expect(ticker.stop).toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalled();
  } finally {
    scene.destroy();
    vi.unstubAllGlobals();
  }
});

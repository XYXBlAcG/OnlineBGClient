// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { WebGLRenderer } from "three";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Pool3DPreview } from "../src/client/dev/Pool3DPreview";
import {
  PoolScene3D,
  sceneSize,
  type PoolSceneStatus,
} from "../src/client/pool/render3d/PoolScene3D";
import { PoolRules } from "../src/domain/pool/rules";
import type { PoolShot } from "../src/domain/pool/types";

const view = new PoolRules(() => 0.42).create(2, false, {
  pool: { mode: "eight-ball", shotSeconds: 60, assist: true },
}).view;

const context = {
  fillStyle: "",
  fillRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  font: "",
  textAlign: "",
  textBaseline: "",
  fillText() {},
};

function createHost(width: number, height: number) {
  const host = document.createElement("div");
  Object.defineProperty(host, "clientWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(host, "clientHeight", {
    value: height,
    configurable: true,
  });
  document.body.append(host);
  return host;
}

function createRenderer() {
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      toJSON: () => ({}),
    }) as DOMRect;
  const sizes: [number, number][] = [];
  let renders = 0;
  const renderer = {
    domElement: canvas,
    shadowMap: { enabled: false, type: 0 },
    outputColorSpace: "",
    info: { render: { calls: 0, triangles: 0 } },
    capabilities: { isWebGL2: true },
    setPixelRatio() {},
    getPixelRatio: () => 1,
    setSize(width: number, height: number) {
      sizes.push([width, height]);
    },
    render() {
      renders += 1;
    },
    dispose() {},
    getContext: () => null,
  } as unknown as WebGLRenderer;
  return { renderer, sizes, renders: () => renders };
}

function stubFrames() {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return callbacks;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => context as never,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

it("renders the 3D preview with visible loading and debug states", () => {
  const html = renderToStaticMarkup(<Pool3DPreview />);
  expect(html).toContain("台球 3D 原型");
  expect(html).toContain("正在准备 3D 桌面");
  expect(html).toContain("2D 版本");
  expect(html).not.toContain("3D 调试信息");
  const debug = renderToStaticMarkup(<Pool3DPreview debug />);
  expect(debug).toContain("3D 调试信息");
  expect(debug).toContain("最近 resize");
});

it("keeps the 3D preview inside the viewport and loads its styles", () => {
  const css = readFileSync("src/client/pool/pool.css", "utf8");
  const preview =
    css.match(/\.app-shell\.pool-preview\s*\{([^}]*)\}/)?.[1] ?? "";
  expect(preview).toContain("box-sizing: border-box");
  expect(preview).toContain("height: 100dvh");
  expect(preview).toContain("min-height: 0");
  expect(preview).toContain("overflow: hidden");
  const host = css.match(/\.pool-preview-3d\s*\{([^}]*)\}/)?.[1] ?? "";
  expect(host).toContain("position: relative");
  expect(host).toContain("flex: 1");
  expect(host).toContain("min-height: 0");
  const canvas = css.match(/\.pool-preview-3d canvas\s*\{([^}]*)\}/)?.[1] ?? "";
  expect(canvas).toContain("position: absolute");
  expect(canvas).toContain("inset: 0");
  expect(canvas).toContain("width: 100%");
  expect(canvas).toContain("height: 100%");
  expect(readFileSync("src/client/dev/Pool3DPreview.tsx", "utf8")).toContain(
    'import "../pool/pool.css"',
  );
});

it("only accepts a positive host size", () => {
  expect(sceneSize(0, 0)).toBeNull();
  expect(sceneSize(-1, 10)).toBeNull();
  expect(sceneSize(Number.NaN, 600)).toBeNull();
  expect(sceneSize(800, 600)).toEqual({ width: 800, height: 600 });
});

it("reports a visible error when the renderer cannot start", () => {
  const host = createHost(0, 0);
  const statuses: PoolSceneStatus[] = [];
  const scene = new PoolScene3D(host, view, {
    rendererFactory: () => {
      throw new Error("WebGL 不可用");
    },
    onStatus: (status) => statuses.push(status),
  });
  expect(statuses.at(-1)).toEqual({
    phase: "error",
    message: "WebGL 不可用",
  });
  expect(host.querySelector("canvas")).toBeNull();
  scene.destroy();
});

it("waits for a valid host size and then renders the first frame", () => {
  const frames = stubFrames();
  const host = createHost(0, 0);
  const statuses: PoolSceneStatus[] = [];
  const fake = createRenderer();
  const scene = new PoolScene3D(host, view, {
    rendererFactory: () => fake.renderer,
    onStatus: (status) => statuses.push(status),
  });
  expect(statuses.at(-1)?.phase).toBe("loading");
  expect(fake.sizes).toEqual([]);
  Object.defineProperty(host, "clientWidth", {
    value: 800,
    configurable: true,
  });
  Object.defineProperty(host, "clientHeight", {
    value: 600,
    configurable: true,
  });
  frames[0](0);
  expect(fake.sizes.at(-1)).toEqual([800, 600]);
  expect(fake.renders()).toBeGreaterThan(0);
  expect(statuses.at(-1)?.phase).toBe("ready");
  expect(scene.metrics()).toMatchObject({
    phase: "ready",
    width: 800,
    height: 600,
  });
  scene.destroy();
});

it("renders immediately when the host already has a size", () => {
  stubFrames();
  const host = createHost(1024, 768);
  const fake = createRenderer();
  const scene = new PoolScene3D(host, view, {
    rendererFactory: () => fake.renderer,
  });
  expect(fake.sizes[0]).toEqual([1024, 768]);
  expect(fake.renders()).toBeGreaterThan(0);
  scene.setCursor("not-allowed");
  expect(fake.renderer.domElement.style.cursor).toBe("not-allowed");
  scene.setCursor("grab");
  expect(fake.renderer.domElement.style.cursor).toBe("grab");
  scene.destroy();
  expect(host.querySelector("canvas")).toBeNull();
});

it("maps the pointer to the table plane", () => {
  stubFrames();
  const host = createHost(800, 600);
  const fake = createRenderer();
  const scene = new PoolScene3D(host, view, {
    rendererFactory: () => fake.renderer,
  });
  const point = scene.pointAt(400, 300);
  expect(point).not.toBeNull();
  expect(Math.abs(point!.x)).toBeLessThan(0.01);
  expect(Math.abs(point!.y)).toBeLessThan(0.01);
  scene.destroy();
});

it("plays the recorded shot and reports its end", () => {
  const frames = stubFrames();
  const host = createHost(800, 600);
  const fake = createRenderer();
  let ended = 0;
  let pocketed = 0;
  let impacted = 0;
  const scene = new PoolScene3D(host, view, {
    rendererFactory: () => fake.renderer,
    onShotEnd: () => {
      ended += 1;
    },
    onPocket: () => {
      pocketed += 1;
    },
    onImpact: () => {
      impacted += 1;
    },
  });
  const shot: PoolShot = {
    actor: 0,
    aim: 0,
    power: 0.5,
    spin: { x: 0, y: 0 },
    cueBefore: { x: -0.5, y: 0 },
    impacts: [{ t: 120, kind: "ball", intensity: 0.6 }],
    frames: [
      {
        t: 0,
        balls: [
          { id: 0, x: -0.5, y: 0 },
          { id: 1, x: 0, y: 0 },
        ],
      },
      {
        t: 1000,
        balls: [
          { id: 0, x: -0.4, y: 0 },
          { id: 1, x: 0.1, y: 0 },
        ],
      },
    ],
    pocketed: [{ id: 1, t: 500 }],
    firstHit: 1,
    railAfterContact: false,
    cuePocketed: false,
    finalBalls: [
      { id: 0, x: -0.4, y: 0, pocketed: false },
      { id: 1, x: 0.1, y: 0, pocketed: true },
    ],
  };
  const now = vi.spyOn(performance, "now").mockReturnValue(1000);
  scene.playShot(shot, 1);
  now.mockReturnValue(2000);
  frames[0](2000);
  expect(pocketed).toBe(1);
  expect(impacted).toBe(1);
  expect(ended).toBe(1);
  scene.destroy();
});

it("builds the larger party table with its special balls in 3D", () => {
  stubFrames();
  const partyView = new PoolRules(() => 0.42).create(3, false, {
    pool: { mode: "party", shotSeconds: 60, assist: true },
  }).view;
  const host = createHost(1024, 768);
  const fake = createRenderer();
  const scene = new PoolScene3D(host, partyView, {
    rendererFactory: () => fake.renderer,
  });
  const metrics = scene.metrics();
  expect(metrics.phase).toBe("ready");
  expect(metrics.balls).toBe(12);
  expect(metrics.camera.z).toBeGreaterThan(2);
  scene.destroy();
});

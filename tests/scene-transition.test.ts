import { expect, it, vi } from "vitest";
import { SceneMotion, sceneKey } from "../src/client/scene-transition";
function fixture() {
  let x = 100,
    width = 360;
  const finished = new Promise<void>(() => {});
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
  const animate = vi.fn(
    (_frames: Keyframe[], _options: KeyframeAnimationOptions) => {
      const animation = { cancel: vi.fn(), finished };
      animations.push(animation);
      return animation;
    },
  );
  const surface = {
    dataset: { sceneLayout: "card" },
    getBoundingClientRect: () => ({ left: x, top: 0, width, height: 300 }),
    animate,
  };
  const root = {
    children: [surface],
    querySelectorAll: (selector: string) =>
      selector.includes("layout") ? [surface] : [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    animate,
  };
  return {
    root: root as unknown as HTMLElement,
    animate,
    animations,
    move: () => {
      x = 0;
      width = 560;
    },
  };
}
it("does not animate initial mount or repeated snapshots but transitions meaningful scene changes", () => {
  const f = fixture(),
    motion = new SceneMotion(f.root);
  motion.update("join", true);
  expect(f.animate).not.toHaveBeenCalled();
  f.move();
  motion.update("create", true);
  expect(f.animate).toHaveBeenCalled();
  const count = f.animate.mock.calls.length;
  motion.update("create", true);
  expect(f.animate).toHaveBeenCalledTimes(count);
});
it("cancels stale motion on rapid transitions, animation disable and disposal", () => {
  const f = fixture(),
    motion = new SceneMotion(f.root);
  motion.update("join", true);
  f.move();
  motion.update("create", true);
  const first = [...f.animations];
  motion.update("join", true);
  first.forEach((animation) => expect(animation.cancel).toHaveBeenCalledOnce());
  motion.update("join", false);
  f.animations.forEach((animation) =>
    expect(animation.cancel).toHaveBeenCalled(),
  );
  const count = f.animate.mock.calls.length;
  motion.update("room", false);
  expect(f.animate).toHaveBeenCalledTimes(count);
  motion.dispose();
});
it("keys room lifecycle without including ordinary turn or snapshot versions", () => {
  const snapshot = { room: "one", kind: "uno", playing: true, finished: false };
  expect(sceneKey(snapshot)).toBe(sceneKey({ ...snapshot, version: 99 }));
  expect(sceneKey(snapshot)).not.toBe(
    sceneKey({ ...snapshot, finished: true }),
  );
  expect(sceneKey(snapshot)).not.toBe(sceneKey({ ...snapshot, kind: "tq" }));
  expect(sceneKey(null)).toBe("lobby");
});

it("keeps the scene wrapper outside the explicit UI scope so game animation retains its independent policy", async () => {
  const React = await import("react"),
    { renderToStaticMarkup } = await import("react-dom/server"),
    { SceneSurface } = await import("../src/client/SceneSurface");
  const html = renderToStaticMarkup(
    React.createElement(SceneSurface, {
      scene: "playing",
      children: React.createElement("div", { "data-motion-scope": "game" }),
    }),
  );
  expect(html).not.toContain('data-motion-scope="ui"');
  expect(html).toContain('data-motion-scope="game"');
});

it("uses opacity for the outer scene without transforming the containing block of game overlays", () => {
  const f = fixture();
  Object.assign(f.root, {
    dataset: { sceneEnter: "fade" },
    hasAttribute: () => true,
  });
  const motion = new SceneMotion(f.root);
  motion.update("lobby", true);
  motion.update("room", true);
  expect(f.animate.mock.calls.at(-1)![0]).toEqual([
    { opacity: 0 },
    { opacity: 1 },
  ]);
  motion.dispose();
});

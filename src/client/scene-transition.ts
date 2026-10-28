import { useLayoutEffect, useRef } from "react";
type Bounds = Pick<DOMRect, "left" | "top" | "width" | "height">;
export function sceneKey<
  T extends { room: string; kind: string; playing: boolean; finished: boolean },
>(snapshot: T | null): string {
  return snapshot
    ? `${snapshot.room}:${snapshot.kind}:${snapshot.playing ? "playing" : "waiting"}:${snapshot.finished ? "finished" : "active"}`
    : "lobby";
}
export class SceneMotion {
  private scene: string | undefined;
  private bounds = new Map<string, Bounds>();
  private animations = new Set<Animation>();
  constructor(private readonly root: HTMLElement) {}
  capture(): void {
    if (this.animations.size) return;
    this.bounds = new Map(
      Array.from(
        this.root.querySelectorAll<HTMLElement>(
          "[data-scene-layout],[data-scene-size]",
        ),
        (element) => [
          element.dataset.sceneLayout ?? element.dataset.sceneSize!,
          element.getBoundingClientRect(),
        ],
      ),
    );
  }
  update(scene: string, enabled: boolean): void {
    const changed = this.scene !== undefined && this.scene !== scene;
    this.scene = scene;
    if (!enabled) {
      this.dispose();
      this.capture();
      return;
    }
    if (!changed) {
      this.capture();
      return;
    }
    const before = this.bounds;
    this.dispose();
    const layouts = Array.from(
      this.root.querySelectorAll<HTMLElement>("[data-scene-layout]"),
    );
    const sizes = Array.from(
      this.root.querySelectorAll<HTMLElement>("[data-scene-size]"),
    );
    const after = new Map<HTMLElement, DOMRect>();
    for (const element of [...layouts, ...sizes])
      after.set(element, element.getBoundingClientRect());
    this.capture();
    for (const element of layouts) {
      const previous = before.get(element.dataset.sceneLayout!),
        next = after.get(element)!;
      if (
        previous &&
        (Math.abs(previous.left - next.left) > 0.5 ||
          Math.abs(previous.top - next.top) > 0.5)
      )
        this.play(element, [
          {
            transform: `translate(${previous.left - next.left}px, ${previous.top - next.top}px)`,
          },
          { transform: "translate(0,0)" },
        ]);
    }
    for (const element of sizes) {
      const previous = before.get(element.dataset.sceneSize!),
        next = after.get(element)!;
      if (previous && Math.abs(previous.height - next.height) > 0.5)
        this.play(element, [
          { height: `${previous.height}px`, overflow: "clip" },
          { height: `${next.height}px`, overflow: "clip" },
        ]);
    }
    const fade = this.root.dataset?.sceneEnter === "fade";
    const entering = fade
      ? (Array.from(this.root.children) as HTMLElement[])
      : Array.from(
          this.root.querySelectorAll<HTMLElement>("[data-scene-enter]"),
        );
    for (const element of entering)
      this.play(
        element,
        fade || element.dataset.sceneEnter === "fade"
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0.3, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
      );
  }
  private play(element: HTMLElement, keyframes: Keyframe[]): void {
    if (typeof element.animate !== "function") return;
    const animation = element.animate(keyframes, {
      duration: 220,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
    this.animations.add(animation);
    const release = () => {
      this.animations.delete(animation);
      this.capture();
    };
    void animation.finished.then(release, release);
  }
  dispose(): void {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
  }
}
export function useSceneTransition<T extends HTMLElement = HTMLDivElement>(
  scene: string,
  enabled: boolean,
) {
  const root = useRef<T>(null),
    motion = useRef<SceneMotion>();
  useLayoutEffect(() => {
    if (!root.current) return;
    const current = new SceneMotion(root.current);
    motion.current = current;
    return () => {
      current.dispose();
      motion.current = undefined;
    };
  }, []);
  useLayoutEffect(() => {
    motion.current?.update(scene, enabled);
    if (!root.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => motion.current?.capture());
    observer.observe(root.current);
    for (const element of root.current.querySelectorAll(
      "[data-scene-layout],[data-scene-size]",
    ))
      observer.observe(element);
    return () => observer.disconnect();
  }, [scene, enabled]);
  return root;
}

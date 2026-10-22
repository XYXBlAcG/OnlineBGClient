import type { GameMotionEvent } from "../game-motion-events";
import type { GameHighlight } from "../game-motion";
import { findSample, type TableSample } from "./table-sample";
export const tableTiming = {
  travel: 480,
  flip: 340,
  stagger: 65,
  hop: 190,
  land: 220,
};
const center = (b: DOMRect) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});
export class TableAnimator {
  private animations = new Set<Animation>();
  private copies = new Set<HTMLElement>();
  private masks = new Map<HTMLElement | SVGElement, string>();
  private closed = false;
  private frame = 0;
  private rate: number;
  constructor(
    private surface: Element,
    private previous: TableSample[],
    private current: TableSample[],
    rate: number,
  ) {
    this.rate = Math.max(0.25, Math.min(4, rate));
  }
  cancel = () => {
    this.closed = true;
    cancelAnimationFrame(this.frame);
    for (const animation of this.animations) animation.cancel();
    for (const copy of this.copies) copy.remove();
    for (const [node, opacity] of this.masks) node.style.opacity = opacity;
    this.animations.clear();
    this.copies.clear();
    this.masks.clear();
  };
  private animate(
    node: Element,
    frames: Keyframe[],
    duration: number,
    delay = 0,
  ): Animation {
    const animation = node.animate(frames, {
      duration: duration / this.rate,
      delay: delay / this.rate,
      easing: "cubic-bezier(.22,.7,.25,1)",
      fill: "both",
    });
    this.animations.add(animation);
    animation.finished.then(
      () => this.animations.delete(animation),
      () => this.animations.delete(animation),
    );
    return animation;
  }
  private shell(bounds: DOMRect, content?: Element): HTMLDivElement {
    const shell = document.createElement("div");
    shell.className = "game-motion-copy";
    shell.inert = true;
    shell.setAttribute("aria-hidden", "true");
    shell.dataset.motionScope = "game";
    Object.assign(shell.style, {
      left: `${bounds.x}px`,
      top: `${bounds.y}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    });
    if (content) shell.append(content.cloneNode(true));
    document.body.append(shell);
    this.copies.add(shell);
    return shell;
  }
  private mask(node: Element) {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      if (!this.masks.has(node)) this.masks.set(node, node.style.opacity);
      node.style.opacity = "0";
    }
  }
  private release(shell: HTMLElement, node?: Element) {
    shell.remove();
    this.copies.delete(shell);
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      const opacity = this.masks.get(node);
      if (opacity !== undefined) {
        node.style.opacity = opacity;
        this.masks.delete(node);
      }
    }
  }
  private land(bounds: DOMRect, delay = 0) {
    const ring = this.shell(bounds);
    ring.classList.add("game-motion-landing");
    const animation = this.animate(
      ring,
      [
        { transform: "scale(.7)", opacity: 0.85 },
        { transform: "scale(1.2)", opacity: 0 },
      ],
      tableTiming.land,
      delay,
    );
    animation.finished.then(
      () => this.release(ring),
      () => {},
    );
  }
  play(events: GameMotionEvent[], highlights: GameHighlight[]) {
    for (const event of events) {
      if (
        event.type === "celebrate" ||
        event.type === "beam" ||
        event.type === "collect" ||
        (event.type === "draw" && event.card === undefined)
      )
        continue;
      const after = findSample(this.current, event.target),
        before =
          event.type === "build" || findSample(this.previous, event.source);
      if (after && before) this.mask(after.node);
    }
    for (const after of this.current
      .filter((sample) => sample.hand && sample.key)
      .slice(0, 20)) {
      const before = this.previous.find(
        (sample) => sample.hand && sample.key === after.key,
      );
      if (
        before &&
        Math.abs(before.bounds.x - after.bounds.x) +
          Math.abs(before.bounds.y - after.bounds.y) >=
          3
      )
        this.mask(after.node);
    }
    this.frame = requestAnimationFrame(() => {
      if (this.closed) return;
      for (const sample of this.current)
        sample.bounds = sample.node.getBoundingClientRect();

      const consumed = new Set<string>(),
        usedMasks = new Set<Element>();
      events.forEach((event, index) => {
        const before = findSample(
          this.previous,
          event.type === "build" || event.type === "celebrate"
            ? event.target
            : event.source,
        );
        const after = findSample(this.current, event.target);
        if (event.type === "celebrate") {
          if (!after) return;
          const b = after.bounds,
            copy = this.shell(
              new DOMRect(b.x - 30, b.y - 26, b.width + 60, b.height + 28),
            );
          copy.classList.add("game-motion-celebrate");
          copy.dataset.motionEvent = "celebrate";
          copy.textContent = event.label;
          this.animate(
            copy,
            [
              { transform: "translateY(6px) scale(.6)", opacity: 0 },
              {
                transform: "translateY(-12px) scale(1.06)",
                opacity: 1,
                offset: 0.2,
              },
              {
                transform: "translateY(-14px) scale(1)",
                opacity: 1,
                offset: 0.8,
              },
              { transform: "translateY(-26px) scale(.95)", opacity: 0 },
            ],
            1300,
          ).finished.then(
            () => this.release(copy),
            () => {},
          );
          this.land(b);
          return;
        }
        if (event.type === "collect") {
          if (!before || !after) return;
          const a = center(before.bounds),
            b = center(after.bounds),
            shell = this.shell(new DOMRect(a.x - 25, a.y - 18, 50, 36));
          shell.classList.add("game-motion-cardback");
          shell.dataset.motionEvent = "collect";
          shell.textContent = `+${event.count}`;
          this.animate(
            shell,
            [
              { transform: "translate(0,0)", opacity: 1 },
              {
                transform: `translate(${b.x - a.x}px,${b.y - a.y}px) scale(.7)`,
                opacity: 1,
              },
            ],
            tableTiming.travel,
            tableTiming.travel,
          ).finished.then(
            () => {
              this.release(shell);
              if (!this.closed) this.land(after.bounds);
            },
            () => {},
          );
          return;
        }
        if (event.type === "beam") {
          if (!before || !after) return;
          const a = center(before.bounds),
            b = center(after.bounds),
            line = this.shell(
              new DOMRect(a.x, a.y, Math.hypot(b.x - a.x, b.y - a.y), 3),
            );
          line.classList.add("game-motion-beam");
          line.dataset.motionEvent = "beam";
          line.style.transformOrigin = "left center";
          line.style.rotate = `${Math.atan2(b.y - a.y, b.x - a.x)}rad`;
          this.animate(
            line,
            [
              { transform: "scaleX(0)", opacity: 0 },
              { transform: "scaleX(1)", opacity: 1, offset: 0.4 },
              { transform: "scaleX(1)", opacity: 0 },
            ],
            500,
          ).finished.then(
            () => this.release(line),
            () => {},
          );
          return;
        }
        if (!after || (!before && event.type !== "build")) return;
        if (after.key) consumed.add(after.key);
        if (before?.key) consumed.add(before.key);
        if (event.type === "build") {
          this.mask(after.node);
          usedMasks.add(after.node);
          const shell = this.shell(after.bounds, after.copy);
          shell.dataset.motionEvent = "build";
          shell.style.transformOrigin = "center bottom";
          this.land(after.bounds);
          this.animate(
            shell,
            [
              { transform: "translateY(-16px) scale(.2)", opacity: 0 },
              {
                transform: "translateY(2px) scale(1.08)",
                opacity: 1,
                offset: 0.75,
              },
              { transform: "translateY(0) scale(1)", opacity: 1 },
            ],
            450,
          ).finished.then(
            () => this.release(shell, after.node),
            () => {},
          );
          return;
        }
        if (event.type === "piece") {
          const a = center(before!.bounds),
            b = center(after.bounds);
          let points = event.route
            .map((id) =>
              this.surface.querySelector(
                `[data-guide-target="${event.cells}"][data-guide-id="${id}"]`,
              ),
            )
            .filter((node): node is Element => !!node)
            .map((node) => center(node.getBoundingClientRect()));
          const route = after.node.getAttribute("data-motion-route"),
            matrix = (
              after.node.parentElement as unknown as SVGGraphicsElement
            )?.getScreenCTM?.();
          if (route && matrix)
            points = route.split(";").map((pair) => {
              const [x, y] = pair.trim().split(/[ ,]+/).map(Number);
              const point = new DOMPoint(x, y).matrixTransform(matrix);
              return { x: point.x, y: point.y };
            });
          if (points.length < 2) points = [a, b];
          this.mask(after.node);
          usedMasks.add(after.node);
          const shell = this.shell(after.bounds, after.copy),
            frames: Keyframe[] = [];
          points.forEach((point, i) => {
            if (i) {
              const prev = points[i - 1];
              frames.push({
                offset: (i - 0.5) / (points.length - 1),
                transform: `translate(${(prev.x + point.x) / 2 - b.x}px,${(prev.y + point.y) / 2 - b.y - 12}px) scale(1.08)`,
              });
            }
            frames.push({
              offset: i / (points.length - 1),
              transform: `translate(${point.x - b.x}px,${point.y - b.y}px) scale(1)`,
            });
          });
          shell.dataset.motionEvent = "piece";
          const duration = Math.min(
            950,
            Math.max(350, (points.length - 1) * tableTiming.hop),
          );
          this.animate(shell, frames, duration).finished.then(
            () => {
              this.release(shell, after.node);
              if (!this.closed) this.land(after.bounds);
            },
            () => {},
          );
          return;
        }
        const draw = event.type === "draw",
          reveal = draw && event.reveal;
        const back = this.surface.querySelector(
          draw && event.back
            ? event.back
            : '[data-motion-zone="uno.deck"] [class~="uno"]',
        );
        const actualCard =
          (draw && event.card !== undefined) || event.type === "card";
        const content = draw
          ? back?.cloneNode(true)
          : after.copy.cloneNode(true);
        const shell = this.shell(after.bounds);
        shell.dataset.motionEvent = event.type;
        if (reveal) shell.dataset.motionReveal = String(event.card);
        if (actualCard) {
          this.mask(after.node);
          usedMasks.add(after.node);
        }
        if (reveal) {
          const flipper = document.createElement("div");
          flipper.className = "game-motion-flipper";
          const backFace = document.createElement("div"),
            frontFace = document.createElement("div");
          backFace.className = "game-motion-face game-motion-back";
          frontFace.className = "game-motion-face game-motion-front";
          if (back instanceof HTMLElement) {
            const copy = back.cloneNode(true) as HTMLElement;
            Object.assign(copy.style, {
              position: "absolute",
              left: "0",
              top: "0",
              margin: "0",
              transformOrigin: "top left",
              transform: `scale(${after.bounds.width / back.offsetWidth})`,
            });
            backFace.append(copy);
          }
          frontFace.append(after.copy.cloneNode(true));
          flipper.append(backFace, frontFace);
          shell.append(flipper);
          this.animate(
            flipper,
            [{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }],
            tableTiming.flip,
            tableTiming.travel + index * tableTiming.stagger,
          ).finished.then(
            () => {
              this.release(shell, after.node);
              if (!this.closed) this.land(after.bounds);
            },
            () => {},
          );
        } else if (content) {
          if (draw && content instanceof HTMLElement)
            Object.assign(content.style, {
              position: "absolute",
              left: "0",
              top: "0",
              margin: "0",
              transformOrigin: "top left",
              transform: `scale(${after.bounds.width / (back as HTMLElement).offsetWidth})`,
            });
          shell.append(content);
        } else {
          shell.classList.add("game-motion-cardback");
          shell.dataset.motionEvent = "collect";
          shell.textContent = "◆";
        }
        const a = center(before!.bounds),
          b = center(after.bounds),
          dx = a.x - b.x,
          dy = a.y - b.y;
        const scale = Math.min(
          1.4,
          Math.max(0.2, before!.bounds.width / after.bounds.width),
        );
        const animation = this.animate(
          shell,
          [
            {
              transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(-9deg)`,
              opacity: 1,
            },
            {
              transform: `translate(${dx * 0.4}px,${dy * 0.4 - 28}px) scale(1.05) rotate(4deg)`,
              opacity: 1,
              offset: 0.55,
            },
            { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
          ],
          tableTiming.travel,
          index * tableTiming.stagger,
        );
        if (!reveal)
          animation.finished.then(
            () => {
              this.release(shell, actualCard ? after.node : undefined);
              if (!this.closed) this.land(after.bounds);
            },
            () => {},
          );
      });
      for (const after of this.current
        .filter(
          (sample) => sample.hand && sample.key && !consumed.has(sample.key),
        )
        .slice(0, 20)) {
        const before = this.previous.find(
          (sample) => sample.hand && sample.key === after.key,
        );
        if (!before) continue;
        const dx = before.bounds.x - after.bounds.x,
          dy = before.bounds.y - after.bounds.y;
        if (Math.abs(dx) + Math.abs(dy) < 3) continue;
        this.mask(after.node);
        usedMasks.add(after.node);
        const shell = this.shell(after.bounds, after.copy);
        this.animate(
          shell,
          [
            { transform: `translate(${dx}px,${dy}px)` },
            { transform: "translate(0,0)" },
          ],
          260,
        ).finished.then(
          () => this.release(shell, after.node),
          () => {},
        );
      }
      for (const [node, opacity] of this.masks)
        if (!usedMasks.has(node)) {
          node.style.opacity = opacity;
          this.masks.delete(node);
        }
      for (const [index, highlight] of highlights.entries())
        for (const node of this.surface.querySelectorAll(highlight.selector)) {
          if (!node.getClientRects().length) continue;
          const bounds = node.getBoundingClientRect();
          if (highlight.destination) {
            const target = this.surface.querySelector(highlight.destination);
            if (!target) continue;
            const forward = highlight.label?.startsWith("+"),
              other = target.getBoundingClientRect(),
              start = forward ? bounds : other,
              end = forward ? other : bounds;
            const chip = this.shell(
              new DOMRect(start.x, start.y, bounds.width, bounds.height),
              node.cloneNode(true) as Element,
            );
            chip.dataset.motionEvent = "token";
            const a = center(start),
              b = center(end);
            this.animate(
              chip,
              [
                { transform: "translate(0,0) scale(.85)", opacity: 1 },
                {
                  transform: `translate(${(b.x - a.x) * 0.5}px,${(b.y - a.y) * 0.5 - 20}px) scale(.8)`,
                  opacity: 1,
                  offset: 0.5,
                },
                {
                  transform: `translate(${b.x - a.x}px,${b.y - a.y}px) scale(.5)`,
                  opacity: 1,
                },
              ],
              tableTiming.travel,
              index * tableTiming.stagger,
            ).finished.then(
              () => {
                this.release(chip);
                if (!this.closed) this.land(end);
              },
              () => {},
            );
          } else {
            this.land(bounds);
            if (highlight.label) {
              const label = this.shell(
                new DOMRect(bounds.x, bounds.bottom - 10, bounds.width, 28),
              );
              label.className = "game-motion-label";
              label.textContent = highlight.label;
              this.animate(
                label,
                [
                  { transform: "translateY(0)", opacity: 0 },
                  { transform: "translateY(-8px)", opacity: 1, offset: 0.2 },
                  { transform: "translateY(-26px)", opacity: 0 },
                ],
                850,
              ).finished.then(
                () => this.release(label),
                () => {},
              );
            }
          }
        }
    });
  }
}

import {
  Assets,
  Application,
  Container,
  Sprite,
  Texture,
  Ticker,
} from "pixi.js";
import { partyAppearance, type PartyEvent } from "../../domain/party";
import { resolvePartyArt, type PartyArt } from "../../domain/party/stage";
import { PartyCinema } from "./cinema";
import { PartyFilter } from "./filters";
import { drawPartyGlyph } from "./glyph";
import { emojiUrl } from "../Emoji";
import { partyElapsed } from "./timeline";
import { partyBudget, type PartyPreferences } from "./policy";
import {
  partyParticles,
  partyFrame,
  samplePartyParticle,
  type PartyParticle,
  type PartyParticlePose,
} from "./particles";
interface Emitter {
  particles: PartyParticle[];
  container?: Container;
  sprites: Sprite[];
  filter?: PartyFilter;
}
export class PartyScene {
  private app?: Application;
  private cinema: PartyCinema;
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private ticker = new Ticker();
  private emitters = new Map<string, Emitter>();
  private textures = new Map<string, Texture>();
  private owned = new Set<Texture>();
  private icons = new Map<string, HTMLCanvasElement>();
  private anchors = new Map<string, { x: number; y: number }>();
  private anchorAt = 0;
  private viewport = { width: 0, height: 0 };
  private resizeObserver: ResizeObserver | undefined;
  private clock = () => Date.now();
  private rate = 1;
  private wake: ReturnType<typeof setTimeout> | undefined;
  private events: PartyEvent[] = [];
  private members: string[] = [];
  private destroyed = false;
  private ready = false;
  private pose: PartyParticlePose = {
    x: 0,
    y: 0,
    size: 0,
    rotation: 0,
    alpha: 0,
    visible: false,
  };
  constructor(
    private host: HTMLElement,
    private preferences: PartyPreferences,
    private mobile: boolean,
    private onStatus: (message: string) => void = () => {},
  ) {
    this.cinema = new PartyCinema(host);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(([entry]) => {
        this.viewport = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
      });
      this.resizeObserver.observe(host);
    }
  }
  async init(): Promise<void> {
    const app = new Application(),
      budget = partyBudget(this.preferences.quality, this.mobile);
    try {
      await app.init({
        resizeTo: this.host,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(devicePixelRatio || 1, budget.resolution),
        autoDensity: true,
        autoStart: false,
        preference: "webgl",
        powerPreference: this.mobile ? "low-power" : "high-performance",
      });
      this.app = app;
      if (this.destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      this.canvas = app.canvas;
      this.host.append(app.canvas);
      const warm = new Sprite(Texture.WHITE);
      warm.width = 1;
      warm.height = 1;
      warm.alpha = 0.001;
      app.stage.addChild(warm);
      app.render();
      warm.destroy();
      app.render();
    } catch {
      if (this.app === app) {
        this.app = undefined;
        app.destroy(true, { children: true });
      } else app.renderer?.destroy();
      if (this.destroyed) return;
      this.useCanvas();
    }
    this.ready = true;
    this.ticker.maxFPS = this.preferences.fps;
    this.ticker.add(() => this.render());
    this.resume();
  }
  private render(): void {
    try {
      this.frame();
    } catch {
      if (this.app) {
        try {
          this.useCanvas();
          this.frame();
        } catch {
          this.onStatus("图形绘制失败，请检查设备的图形加速设置");
          this.ticker.stop();
        }
      } else {
        this.onStatus("兼容绘制失败，请检查设备设置");
        this.ticker.stop();
      }
    }
  }
  private useCanvas(): void {
    const canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    if (!context) throw Error("此设备无法初始化特效绘图，请检查图形加速设置");
    this.app?.destroy(true, { children: true });
    this.app = undefined;
    for (const emitter of this.emitters.values()) emitter.filter?.destroy();
    this.emitters.clear();
    this.canvas?.remove();
    this.canvas = canvas;
    this.context = context;
    this.host.append(canvas);
    this.onStatus("图形加速不可用，正在使用兼容绘制");
  }
  update(
    events: PartyEvent[],
    members: string[],
    clock = () => Date.now(),
    rate = 1,
  ): void {
    this.events = events;
    this.members = members;
    this.clock = clock;
    this.rate = rate;
    clearTimeout(this.wake);
    if (this.ready && !this.destroyed && !document.hidden) this.render();
    this.resume();
  }
  visibility(visible: boolean): void {
    if (visible) {
      if (this.ready && !this.destroyed) this.render();
      this.resume();
    } else this.ticker.stop();
  }
  private resume(): void {
    if (
      this.ready &&
      !this.destroyed &&
      !document.hidden &&
      this.events.some((e) => this.clock() < e.time + e.duration)
    )
      this.ticker.start();
  }
  private icon(art: PartyArt, emoji: string, color: string): HTMLCanvasElement {
    const key = `${art.glyph}:${color}:${art.glyph === "emoji" ? emoji : ""}`;
    const cached = this.icons.get(key);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    drawPartyGlyph(canvas.getContext("2d")!, art.glyph, color, emoji);
    this.icons.set(key, canvas);
    return canvas;
  }
  private clearFrame(): void {
    if (this.context && this.canvas)
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    else this.app?.render();
  }
  private texture(art: PartyArt, emoji: string, color: string): Texture {
    const key = `${art.glyph}:${color}:${art.glyph === "emoji" ? emoji : ""}`;
    const cached = this.textures.get(key);
    if (cached) return cached;
    const texture = Texture.from(this.icon(art, emoji, color));
    this.textures.set(key, texture);
    this.owned.add(texture);
    const url = art.glyph === "emoji" ? emojiUrl(emoji) : undefined;
    if (url)
      void Assets.load<Texture>(url)
        .then((loaded) => {
          if (this.destroyed) return;
          this.textures.set(key, loaded);
          for (const [id, emitter] of this.emitters) {
            const event = this.events.find((e) => e.id === id);
            if (
              event &&
              resolvePartyArt(event).glyph === "emoji" &&
              partyAppearance(event).emoji === emoji
            )
              emitter.sprites.forEach((sprite, i) => {
                if (emitter.particles[i].main) sprite.texture = loaded;
              });
          }
        })
        .catch(() => this.onStatus("表情资源未就绪，正在使用系统表情"));
    return texture;
  }
  private frame(): void {
    const now = this.clock(),
      width = this.viewport.width || this.host.clientWidth,
      height = this.viewport.height || this.host.clientHeight;
    const sampleAnchors = now - this.anchorAt > 200;
    if (sampleAnchors) this.anchorAt = now;
    const pending = this.events.filter((e) => now < e.time + e.duration),
      live = pending.filter((e) => now >= e.time);
    this.cinema.update(live, now);
    for (const [id, emitter] of this.emitters)
      if (!live.some((e) => e.id === id)) {
        emitter.filter?.destroy();
        emitter.container?.destroy({ children: true });
        this.emitters.delete(id);
      }
    if (!pending.length) {
      this.clearFrame();
      this.ticker.stop();
      return;
    }
    if (!live.length) {
      this.clearFrame();
      this.ticker.stop();
      clearTimeout(this.wake);
      if (this.rate > 0)
        this.wake = setTimeout(
          () => this.resume(),
          Math.max(
            1,
            (Math.min(...pending.map((e) => e.time)) - now) / this.rate,
          ),
        );
      return;
    }
    const budget = partyBudget(this.preferences.quality, this.mobile),
      capacity = this.context ? Math.min(320, budget.objects) : budget.objects;
    if (this.context && this.canvas) {
      const resolution = Math.min(devicePixelRatio || 1, 1.5),
        w = Math.round(width * resolution),
        h = Math.round(height * resolution);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.context.setTransform(resolution, 0, 0, resolution, 0, 0);
      this.context.clearRect(0, 0, width, height);
    }
    for (const event of live) {
      const appearance = partyAppearance(event),
        art = resolvePartyArt(event),
        count = Math.min(
          Math.floor(capacity / live.length),
          Math.ceil(
            (event.item === "cometEgg" ? 210 : 100) *
              event.density *
              appearance.density,
          ),
        );
      let emitter = this.emitters.get(event.id);
      if (emitter && emitter.particles.length !== count) {
        emitter.filter?.destroy();
        emitter.container?.destroy({ children: true });
        this.emitters.delete(event.id);
        emitter = undefined;
      }
      if (!emitter) {
        const particles = partyParticles(
            event.seed,
            count,
            event.item === "cometEgg" ? 160 : art.glyph === "emoji" ? 80 : 40,
          ),
          sprites: Sprite[] = [],
          container = this.app ? new Container() : undefined;
        if (container) {
          const texture = this.texture(art, appearance.emoji, appearance.color);
          for (const p of particles) {
            const sprite = new Sprite(
              p.main
                ? texture
                : this.texture({ ...art, glyph: "spark" }, "", "#ffffff"),
            );
            sprite.anchor.set(0.5);
            if (!p.main) {
              sprite.tint = appearance.color;
              sprite.blendMode = "add";
            }
            sprites.push(sprite);
            container.addChild(sprite);
          }
          this.app!.stage.addChild(container);
        }
        emitter = {
          particles,
          sprites,
          container,
          filter: container
            ? new PartyFilter(
                container,
                art.shader,
                appearance.color,
                !this.mobile && this.preferences.quality !== "light",
              )
            : undefined,
        };
        this.emitters.set(event.id, emitter);
      }
      emitter.filter?.update(partyElapsed(event, now) / 1000, width, height);
      const index = this.members.indexOf(event.target),
        selector = event.units
          ? `.original-game[data-game="graphwar"] [data-game-unit="${event.units.target}"]`
          : `.original-game [data-game-avatar="${index}"]`;
      if (sampleAnchors || !this.anchors.has(event.target)) {
        const bounds =
          index >= 0
            ? document.querySelector(selector)?.getBoundingClientRect()
            : undefined;
        if (bounds)
          this.anchors.set(event.target, {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          });
      }
      const frame = partyFrame(
        event,
        now,
        width,
        height,
        this.anchors.get(event.target),
      );
      for (let i = 0; i < emitter.particles.length; i++) {
        const particle = emitter.particles[i];
        samplePartyParticle(frame, particle, this.pose);
        const pose = this.pose,
          size = pose.size * (this.mobile ? 0.8 : 1);
        if (this.app) {
          const sprite = emitter.sprites[i];
          sprite.visible = pose.visible;
          sprite.position.set(pose.x, pose.y);
          sprite.rotation = pose.rotation;
          sprite.width = size;
          sprite.height = size;
          sprite.alpha = pose.alpha;
        } else if (this.context && pose.visible && pose.alpha > 0) {
          const ctx = this.context;
          ctx.save();
          ctx.translate(pose.x, pose.y);
          ctx.rotate(pose.rotation);
          ctx.globalAlpha = pose.alpha;
          if (particle.main) {
            ctx.drawImage(
              this.icon(art, appearance.emoji, appearance.color),
              -size / 2,
              -size / 2,
              size,
              size,
            );
          } else {
            ctx.fillStyle = appearance.color;
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
    this.app?.render();
    if (this.rate === 0) this.ticker.stop();
  }
  destroy(): void {
    this.destroyed = true;
    this.cinema.destroy();
    this.resizeObserver?.disconnect();
    for (const emitter of this.emitters.values()) emitter.filter?.destroy();
    clearTimeout(this.wake);
    this.ticker.destroy();
    this.app?.destroy(true, { children: true });
    this.canvas?.remove();
    for (const texture of this.owned) texture.destroy(true);
    this.owned.clear();
    this.textures.clear();
    this.icons.clear();
  }
}

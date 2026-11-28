import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  standardPoolLayout,
  poolLayout,
  jawPolygon,
  type PoolPoint,
  type PoolTableLayout,
} from "../../../domain/pool/table";
import type { PoolBall, PoolShot, PoolView } from "../../../domain/pool/types";
import { POOL_PLAYBACK_RATE, interpolateBalls } from "../frames";
import { poolBallColors } from "../colors";
import type { PoolCursor } from "../aim";
import type { PoolPrediction } from "../prediction";
import { elevationAngle } from "../../../domain/pool/cue";
import {
  pixelRatioFor,
  postSettings,
  scenePalettes,
  type PoolEnvironment,
} from "../../scene3d/environment";
import { applyRepeat, carpetTexture, woodTexture } from "../../scene3d/textures";
import { applyHdri, placeSceneModel } from "../../scene3d/assets";
import { createPostPipeline, type PostPipeline } from "../../scene3d/post";

const ballRadius = standardPoolLayout.table.ballRadius;
const railHeight = 0.065;
const floorY = -0.74;
const cueLength = 0.82;

interface BallDrop {
  started: number;
  from: PoolPoint;
  pocket: PoolPoint;
}

interface LeadInCue {
  cue: PoolPoint;
  aim: number;
  power: number;
  elevation: number;
  startedAt: number;
  duration: number;
}
const up = new THREE.Vector3(0, 1, 0);

export type PoolScenePhase = "loading" | "ready" | "error";
export type PoolSceneInputMode = "aim" | "orbit";
export interface PoolSceneStatus {
  phase: PoolScenePhase;
  message?: string;
}
export interface PoolSceneAim {
  cue: PoolPoint | null;
  aim: number;
  power: number;
  elevation: number;
  prediction: PoolPrediction | null;
  visible: boolean;
}
export interface PoolSceneMetrics {
  phase: PoolScenePhase;
  message?: string;
  width: number;
  height: number;
  canvas: { width: number; height: number };
  devicePixelRatio: number;
  rendererPixelRatio: number;
  webgl: string;
  calls: number;
  triangles: number;
  objects: number;
  balls: number;
  lastResize: { at: number; width: number; height: number } | null;
  camera: {
    x: number;
    y: number;
    z: number;
    target: { x: number; y: number; z: number };
    fov: number;
    aspect: number;
  };
  fps: number;
}
export interface PoolSceneOptions {
  mode?: "orbit" | "play";
  onStatus?: (status: PoolSceneStatus) => void;
  onShotEnd?: () => void;
  onPocket?: (id: number) => void;
  onImpact?: (kind: "ball" | "rail", intensity: number) => void;
  onCueStrike?: (power: number) => void;
  rendererFactory?: () => THREE.WebGLRenderer;
  environment?: PoolEnvironment;
  quality?: import("../../scene3d/environment").Scene3dQuality;
}

export function sceneSize(
  width: number,
  height: number,
): { width: number; height: number } | null {
  return Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
    ? { width, height }
    : null;
}

function ballTexture(
  id: number,
  eightBall: boolean,
  special?: "bolt" | "gold",
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const color =
    special === "bolt"
      ? "#2f80ed"
      : special === "gold"
        ? "#f2c94c"
        : (poolBallColors[id] ?? "#ddd");
  const striped = eightBall && id >= 9 && id <= 15;
  context.fillStyle = striped ? "#f8f7f2" : color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (striped) {
    context.fillStyle = color;
    context.fillRect(0, 38, canvas.width, 52);
  }
  if (id !== 0) {
    context.beginPath();
    context.arc(128, 64, 25, 0, Math.PI * 2);
    context.fillStyle = "#f8f7f2";
    context.fill();
    context.fillStyle = "#172330";
    context.font = "700 28px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      special === "bolt" ? "⚡" : special === "gold" ? "★" : String(id),
      128,
      65,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function line(color = 0xf5d37a): THREE.Line {
  const result = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    }),
  );
  result.frustumCulled = false;
  return result;
}

function setLinePoints(target: THREE.Line, points: PoolPoint[]) {
  const geometry = target.geometry,
    current = geometry.getAttribute("position") as
      THREE.BufferAttribute | undefined;
  const attribute =
    current && current.count >= points.length
      ? current
      : new THREE.BufferAttribute(
          new Float32Array(Math.max(8, points.length) * 3),
          3,
        );
  const values = attribute.array as Float32Array;
  points.forEach((point, index) => {
    values[index * 3] = point.x;
    values[index * 3 + 1] = 0.014;
    values[index * 3 + 2] = point.y;
  });
  attribute.needsUpdate = true;
  if (attribute !== current) geometry.setAttribute("position", attribute);
  geometry.setDrawRange(0, points.length);
}

export class PoolScene3D {
  private lowQuality =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 20);
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private balls = new Map<number, THREE.Mesh>();
  private layout: PoolTableLayout = standardPoolLayout;
  private tableWidth = standardPoolLayout.table.width;
  private tableHeight = standardPoolLayout.table.height;
  private previous = new Map<number, PoolPoint>();
  private ballGeometry = new THREE.SphereGeometry(
    ballRadius,
    this.lowQuality ? 20 : 32,
    this.lowQuality ? 14 : 24,
  );
  private cue = new THREE.Group();
  private aimLine = line();
  private ghost = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius, 20, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf5d37a,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private frame = 0;
  private resizeFrame = 0;
  private resizeAttempts = 0;
  private width = 0;
  private height = 0;
  private status: PoolSceneStatus = { phase: "loading" };
  private lastFrameAt = 0;
  private fps = 0;
  private lastResize: PoolSceneMetrics["lastResize"] = null;
  private latestView: PoolView | null = null;
  private playing: PoolShot | null = null;
  private playStarted = 0;
  private playShotNumber = -1;
  private playedPockets = new Set<number>();
  private playedImpacts = new Set<number>();
  private drops = new Map<number, BallDrop>();
  private aim: PoolSceneAim = {
    cue: null,
    aim: 0,
    power: 0,
    elevation: 0,
    prediction: null,
    visible: false,
  };
  private strikeAt = 0;
  private strikePower = 0;
  private leadInCue: LeadInCue | null = null;
  private resetting = false;
  private homePosition = new THREE.Vector3(0, 2.05, 1.85);
  private homeTarget = new THREE.Vector3(0, 0, 0);
  private environment: PoolEnvironment = "midnight";
  private palette = scenePalettes.midnight;
  private quality: import("../../scene3d/environment").Scene3dQuality = "balanced";
  private post?: PostPipeline;
  private degraded = false;
  private frameSamples = 0;
  private frameStartedAt = performance.now();
  private wood = applyRepeat(woodTexture(), 3, 2);
  private carpet = applyRepeat(carpetTexture(), 5, 4);
  private felt = applyRepeat(carpetTexture("#126e5d", "#0b4f42"), 4, 2);

  constructor(
    private host: HTMLElement,
    view: PoolView,
    private options: PoolSceneOptions = {},
  ) {
    this.latestView = view;
    this.quality = options.quality ?? "balanced";
    this.layout = poolLayout(view.mode);
    this.tableWidth = this.layout.table.width;
    this.tableHeight = this.layout.table.height;
    const tableScale = this.tableWidth / standardPoolLayout.table.width;
    this.homePosition.set(0, 2.05 * tableScale, 1.95 * tableScale);
    this.environment = options.environment ?? "midnight";
    this.palette = scenePalettes[this.environment];
    this.scene.background = new THREE.Color(this.palette.sky);
    this.scene.fog = new THREE.Fog(
      this.palette.fog,
      7 * tableScale,
      18 * tableScale,
    );
    this.camera.position.copy(this.homePosition);
    this.ghost.visible = false;
    this.aimLine.visible = false;
    this.report("loading", "正在初始化 3D 桌面");
    try {
      const renderer =
        options.rendererFactory?.() ??
        new THREE.WebGLRenderer({
          antialias: !this.lowQuality,
          alpha: true,
        });
      this.renderer = renderer;
      renderer.domElement.addEventListener(
        "webglcontextlost",
        this.handleContextLost,
      );
      renderer.setPixelRatio(pixelRatioFor(this.quality));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = this.quality !== "performance";
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.host.append(renderer.domElement);
      this.controls = new OrbitControls(this.camera, renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.minDistance = 1.6 * (this.tableWidth / standardPoolLayout.table.width);
      this.controls.maxDistance = 4.2 * (this.tableWidth / standardPoolLayout.table.width);
      this.controls.minPolarAngle = 0.3;
      this.controls.maxPolarAngle = 1.34;
      this.controls.target.copy(this.homeTarget);
      this.controls.update();
      if (options.mode === "play") {
        this.controls.mouseButtons.LEFT = null;
        this.controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
        this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        this.controls.touches.ONE = null;
        this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      }
      this.setupLights();
      this.setupTable();
      this.setupRoom();
      const post = postSettings(this.quality);
      if (post.enabled && this.renderer)
        this.post = createPostPipeline(this.renderer, this.scene, this.camera, post);
      void applyHdri(this.renderer, this.scene, "studio", {
        intensity: 0.16,
      });
      this.setupBalls(view.balls);
      this.setupCue();
      this.scene.add(this.aimLine, this.ghost);
      this.resize();
      if (this.status.phase === "error") return;
      this.observer =
        typeof ResizeObserver === "undefined"
          ? undefined
          : new ResizeObserver(() => this.resize());
      this.observer?.observe(this.host);
      this.animate();
    } catch (error) {
      this.fail(error);
    }
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.fail(new Error("WebGL 上下文丢失"));
  };

  private report(phase: PoolScenePhase, message?: string) {
    if (this.status.phase === phase && this.status.message === message) return;
    this.status = { phase, message };
    this.options.onStatus?.(this.status);
  }

  private fail(error: unknown) {
    this.destroy();
    this.report(
      "error",
      error instanceof Error ? error.message : "3D 桌面初始化失败",
    );
  }

  private scheduleResize() {
    if (this.resizeFrame) return;
    if (this.resizeAttempts++ > 600) {
      this.fail(new Error("3D 画布尺寸为 0，请检查页面布局"));
      return;
    }
    const schedule =
      typeof requestAnimationFrame === "undefined"
        ? (callback: () => void) => setTimeout(callback, 16)
        : requestAnimationFrame;
    this.resizeFrame = schedule(() => {
      this.resizeFrame = 0;
      this.resize();
    }) as unknown as number;
  }

  private cancelResize() {
    if (!this.resizeFrame) return;
    if (typeof cancelAnimationFrame === "function")
      cancelAnimationFrame(this.resizeFrame);
    else clearTimeout(this.resizeFrame);
    this.resizeFrame = 0;
  }

  private clampCamera() {
    if (!this.camera) return;
    const scale = this.tableWidth / standardPoolLayout.table.width;
    const limitX = 4.4 * scale;
    const limitZ = 3.1 * scale;
    this.camera.position.x = Math.max(-limitX, Math.min(limitX, this.camera.position.x));
    this.camera.position.z = Math.max(-limitZ, Math.min(limitZ, this.camera.position.z));
    this.camera.position.y = Math.max(0.45, Math.min(2.95, this.camera.position.y));
  }

  private adaptQuality(now: number) {
    if (this.frameSamples < 30) return;
    const average = (now - this.frameStartedAt) / this.frameSamples;
    if (average > 26 && !this.degraded && this.renderer) {
      this.degraded = true;
      this.post?.dispose();
      this.post = undefined;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / Math.max(1, this.height);
      this.camera.updateProjectionMatrix();
    }
    this.frameSamples = 0;
    this.frameStartedAt = now;
  }

  private resize(): boolean {
    if (!this.renderer) return false;
    const size = sceneSize(this.host.clientWidth, this.host.clientHeight);
    if (!size) {
      this.report("loading", "等待 3D 画布尺寸");
      this.scheduleResize();
      return false;
    }
    this.resizeAttempts = 0;
    this.width = size.width;
    this.height = size.height;
    try {
      this.renderer.setPixelRatio(
        Math.min(1.6, Math.max(1, devicePixelRatio || 1)),
      );
      this.renderer.setSize(size.width, size.height, false);
      this.post?.resize(size.width, size.height);
      this.camera.aspect = size.width / size.height;
      this.camera.fov = 46;
      this.camera.updateProjectionMatrix();
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.fail(error);
      return false;
    }
    this.lastResize = {
      at: performance.now(),
      width: size.width,
      height: size.height,
    };
    this.report("ready");
    return true;
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight("#e4eff7", this.palette.ambient, 1.55));
    const key = new THREE.DirectionalLight(this.palette.sun, 2.3);
    key.position.set(1.8, 3.4, 1.5);
    key.castShadow = this.quality !== "performance" && !this.lowQuality;
    const shadowSize = this.quality === "high" ? 2048 : this.quality === "balanced" ? 1024 : 512;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.camera.left = -this.tableWidth * 0.74;
    key.shadow.camera.right = this.tableWidth * 0.74;
    key.shadow.camera.top = this.tableHeight * 1.35;
    key.shadow.camera.bottom = -this.tableHeight * 1.35;
    key.shadow.normalBias = 0.009;
    key.shadow.radius = 2;
    this.scene.add(key);
    const rim = new THREE.PointLight(this.palette.fill, 0.85, 4);
    rim.position.set(-1.6, 1.1, -1.2);
    this.scene.add(rim);
  }

  private setupTable() {
    const wood = new THREE.MeshStandardMaterial({
      map: this.wood,
      color: "#8d5a34",
      roughness: 0.38,
      metalness: 0.06,
    });
    const bodyWood = new THREE.MeshStandardMaterial({
      map: this.wood,
      color: "#6b3f22",
      roughness: 0.46,
    });
    const clothColor = this.environment === "midnight" ? "#238765" : "#2c7294";
    const cloth = new THREE.MeshStandardMaterial({
      color: clothColor,
      roughness: 0.95,
      metalness: 0,
    });
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableWidth, 0.03, this.tableHeight),
      cloth,
    );
    bed.position.y = -0.015;
    bed.receiveShadow = true;
    this.scene.add(bed);
    const slate = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableWidth + 0.06, 0.05, this.tableHeight + 0.06),
      new THREE.MeshStandardMaterial({ color: "#24282c", roughness: 0.9 }),
    );
    slate.position.y = -0.055;
    this.scene.add(slate);
    const apronHeight = 0.18;
    const apronTop = -0.07;
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableWidth + 0.2, apronHeight, this.tableHeight + 0.2),
      bodyWood,
    );
    apron.position.y = apronTop - apronHeight / 2;
    apron.castShadow = true;
    apron.receiveShadow = true;
    this.scene.add(apron);
    const apronInset = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableWidth + 0.16, apronHeight * 0.22, this.tableHeight + 0.16),
      new THREE.MeshStandardMaterial({
        color: "#c9a25f",
        roughness: 0.42,
        metalness: 0.25,
      }),
    );
    apronInset.position.y = apronTop - apronHeight * 0.62;
    this.scene.add(apronInset);
    const legTop = apronTop - apronHeight + 0.02;
    const legHeight = legTop - floorY;
    const profile = [
      [0.082, 0], [0.082, 0.05], [0.058, 0.08], [0.088, 0.14], [0.088, 0.2],
      [0.052, 0.25], [0.052, 0.34], [0.096, 0.41], [0.096, 0.5], [0.072, 0.56],
    ].map(([radius, height]) => new THREE.Vector2(radius, (height / 0.56) * legHeight));
    const legGeometry = new THREE.LatheGeometry(profile, 20);
    const legPositions: [number, number][] = [
      [-this.tableWidth / 2 + 0.24, -this.tableHeight / 2 + 0.24],
      [this.tableWidth / 2 - 0.24, -this.tableHeight / 2 + 0.24],
      [-this.tableWidth / 2 + 0.24, this.tableHeight / 2 - 0.24],
      [this.tableWidth / 2 - 0.24, this.tableHeight / 2 - 0.24],
    ];
    for (const [x, z] of legPositions) {
      const leg = new THREE.Mesh(legGeometry, wood);
      leg.position.set(x, floorY, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.06, 0.2),
        bodyWood,
      );
      capital.position.set(x, legTop + 0.02, z);
      capital.castShadow = true;
      this.scene.add(capital);
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.11, 0.035, 18),
        new THREE.MeshStandardMaterial({ color: "#221208", roughness: 0.6 }),
      );
      foot.position.set(x, floorY + 0.0175, z);
      this.scene.add(foot);
    }
    const railWood = new THREE.MeshStandardMaterial({
      map: this.wood,
      color: "#5d3418",
      roughness: 0.5,
      metalness: 0.04,
    });
    const railMesh = (points: PoolPoint[], height = railHeight) => {
      const shape = new THREE.Shape(
        points.map((point) => new THREE.Vector2(point.x, -point.y)),
      );
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: height,
          bevelEnabled: false,
        }),
        railWood,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };
    for (const rail of this.layout.rails) railMesh(rail.points);
    for (const jaw of this.layout.jaws)
      railMesh(jawPolygon(jaw), railHeight * 0.94);
    const sightMaterial = new THREE.MeshStandardMaterial({
      color: "#f3e6c4",
      roughness: 0.45,
      metalness: 0.2,
    });
    const sight = (x: number, z: number, alongX: boolean) => {
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.006, 4),
        sightMaterial,
      );
      marker.position.set(x, railHeight + 0.003, z);
      marker.rotation.y = alongX ? Math.PI / 4 : 0;
      this.scene.add(marker);
    };
    for (let index = 1; index <= 7; index++) {
      if (index === 4) continue;
      const x = (-this.tableWidth / 2) + (this.tableWidth * index) / 8;
      sight(x, -this.tableHeight / 2 - 0.0225, true);
      sight(x, this.tableHeight / 2 + 0.0225, true);
    }
    for (let index = 1; index <= 3; index++) {
      if (index === 2) continue;
      const z = (-this.tableHeight / 2) + (this.tableHeight * index) / 4;
      sight(-this.tableWidth / 2 - 0.0225, z, false);
      sight(this.tableWidth / 2 + 0.0225, z, false);
    }
    const pocketMaterial = new THREE.MeshStandardMaterial({
      color: "#06080a",
      roughness: 0.95,
    });
    for (const pocket of this.layout.pockets) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(
          this.layout.table.pocketRadius,
          this.layout.table.pocketRadius,
          0.03,
          28,
        ),
        pocketMaterial,
      );
      hole.position.set(pocket.x, 0.003, pocket.y);
      this.scene.add(hole);
    }
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 11),
      new THREE.MeshStandardMaterial({
        map: this.carpet,
        color: this.environment === "midnight" ? "#8a7361" : "#7d8899",
        roughness: 0.97,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private setupRoom() {
    const tableScale = this.tableWidth / standardPoolLayout.table.width;
    const midnight = this.environment === "midnight";
    const wallColor = midnight ? "#7d5537" : "#333c4d";
    const trimColor = midnight ? "#b1814a" : "#c3a05a";
    const panel = new THREE.MeshStandardMaterial({
      map: this.wood,
      color: wallColor,
      roughness: 0.9,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.6,
      metalness: 0.18,
    });
    const width = 5.2 * tableScale;
    const depth = 3.5 * tableScale;
    const ceiling = floorY + 3.25;
    for (const [x, z, sx, sz] of [
      [-width, 0, 0.18, depth * 2],
      [width, 0, 0.18, depth * 2],
      [0, -depth, width * 2, 0.18],
      [0, depth, width * 2, 0.18],
    ]) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(sx, ceiling - floorY, sz),
        panel,
      );
      wall.position.set(x, (ceiling + floorY) / 2, z);
      wall.receiveShadow = true;
      this.scene.add(wall);
      const baseboard = new THREE.Mesh(
        new THREE.BoxGeometry(sx * 1.01, 0.12, sz * 1.01),
        trim,
      );
      baseboard.position.set(x, floorY + 0.06, z);
      this.scene.add(baseboard);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(sx * 1.02, 0.08, sz * 1.02),
        trim,
      );
      beam.position.set(x, ceiling - 0.06, z);
      this.scene.add(beam);
    }
    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 2.4, depth * 2.4),
      new THREE.MeshStandardMaterial({
        color: this.environment === "midnight" ? "#2b1c12" : "#1a2029",
        roughness: 1,
      }),
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = ceiling;
    this.scene.add(ceilingMesh);
    for (const z of [-1.8, 0, 1.8]) {
      const bulb = new THREE.PointLight(
        "#ffd59b",
        midnight ? 1.2 : 1.5,
        5.2 * tableScale,
      );
      bulb.position.set(0, ceiling - 0.5, z * tableScale);
      this.scene.add(bulb);
    }
    const backdrop = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 2.35, 0.12),
      new THREE.MeshStandardMaterial({
        map: this.wood,
        color: midnight ? "#61351f" : "#2a3340",
        roughness: 0.86,
      }),
    );
    backdrop.position.set(0, floorY + 1.2, -depth + 0.1);
    backdrop.receiveShadow = true;
    this.scene.add(backdrop);
    const neon = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.06, 0.05),
      new THREE.MeshBasicMaterial({ color: midnight ? "#ffb45e" : "#8fe4ff" }),
    );
    neon.position.set(0, floorY + 2.2, -depth + 0.18);
    this.scene.add(neon);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.05),
      new THREE.MeshBasicMaterial({ color: midnight ? "#5d3d22" : "#1b2f3a" }),
    );
    screen.position.set(0, floorY + 1.55, -depth + 0.17);
    this.scene.add(screen);
    const galleryFrame = new THREE.MeshStandardMaterial({
      color: midnight ? "#cb9859" : "#8296ab", metalness: 0.42, roughness: 0.42,
    });
    const galleryGlass = new THREE.MeshStandardMaterial({
      color: midnight ? "#405a6c" : "#21445c",
      emissive: midnight ? "#182735" : "#15344b", emissiveIntensity: 0.55, metalness: 0.15, roughness: 0.35,
    });
    for (const x of [-3.3, -2.22, 2.22, 3.3]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86 * tableScale, 1.55, 0.052), galleryFrame);
      frame.position.set(x * tableScale, floorY + 1.7, -depth + 0.14);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.79 * tableScale, 1.48), galleryGlass);
      glass.position.copy(frame.position).z += 0.028;
      this.scene.add(frame, glass);
    }
    const shelfLight = new THREE.PointLight(
      midnight ? "#ffb86b" : "#b7e8ff",
      0.9,
      4,
    );
    shelfLight.position.set(0, floorY + 1.6, -depth + 0.8);
    this.scene.add(shelfLight);
    const artMaterial = new THREE.MeshStandardMaterial({
      color: midnight ? "#8c5c32" : "#3c4657",
      roughness: 0.7,
    });
    for (const x of [-1.5, 1.5]) {
      const art = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.66, 0.05), artMaterial);
      art.position.set(x * tableScale, floorY + 1.75, -depth + 0.16);
      this.scene.add(art);
    }
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.95, 0.5),
      new THREE.MeshStandardMaterial({
        map: this.wood,
        color: midnight ? "#6b4228" : "#2a3038",
        roughness: 0.55,
        metalness: 0.15,
      }),
    );
    bar.position.set(0, floorY + 0.475, -depth + 0.4);
    bar.castShadow = true;
    this.scene.add(bar);
    const barTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.07, 0.6),
      new THREE.MeshStandardMaterial({
        color: midnight ? "#d2a25d" : "#8c98a8",
        roughness: 0.3,
        metalness: 0.35,
      }),
    );
    barTop.position.set(0, floorY + 0.985, -depth + 0.4);
    this.scene.add(barTop);
    for (const x of [-2.3, -0.8, 0.8, 2.3]) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.075, 0.34, 12),
        new THREE.MeshStandardMaterial({
          color: x < 0 ? "#7c9c6a" : "#b67447",
          roughness: 0.32,
          metalness: 0.12,
        }),
      );
      bottle.position.set(x, floorY + 1.19, -depth + 0.42);
      this.scene.add(bottle);
    }
    void placeSceneModel(
      this.scene,
      "lamp",
      [(width - 1.0) * tableScale, floorY, -depth + 1.25],
      1.55,
      0.2,
    );
    void placeSceneModel(
      this.scene,
      "cactus",
      [(-width + 1.1) * tableScale, floorY, -depth + 1.35],
      0.85,
      0.4,
    );
    for (const x of [-1.65, 1.65]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.05), trim);
      frame.position.set(x, floorY + 1.9, -depth + 0.14);
      this.scene.add(frame);
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(0.88, 0.56),
        new THREE.MeshBasicMaterial({ color: midnight ? "#8b6234" : "#3c5968" }),
      );
      poster.position.set(x, floorY + 1.9, -depth + 0.17);
      this.scene.add(poster);
    }
    for (const x of [-width + 0.12, width - 0.12]) {
      for (const z of [-1.8, 1.4]) {
        const sconce = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 12, 10),
          new THREE.MeshStandardMaterial({
            color: "#ffe0a8",
            emissive: "#ffb968",
            emissiveIntensity: 0.9,
            roughness: 0.4,
          }),
        );
        sconce.position.set(x, floorY + 2.05, z);
        this.scene.add(sconce);
      }
    }
    for (const x of [-2.3, -0.8, 0.8, 2.3]) {
      const lamp = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.2, 18),
        new THREE.MeshStandardMaterial({
          color: "#e3c489",
          roughness: 0.5,
          emissive: "#6b4a20",
          emissiveIntensity: 0.4,
        }),
      );
      lamp.position.set(x, ceiling - 0.28, -1.2);
      this.scene.add(lamp);
      const glow = new THREE.PointLight(
        "#ffd49a",
        midnight ? 0.4 : 0.55,
        2.6,
      );
      glow.position.set(x, ceiling - 0.5, -1.2);
      this.scene.add(glow);
    }
    for (let index = 0; index < 4; index++) {
      const cue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.018, 1.5, 8),
        new THREE.MeshStandardMaterial({
          color: "#d4ad74",
          roughness: 0.35,
          metalness: 0.1,
        }),
      );
      cue.position.set(-width + 0.3, floorY + 0.78, -1.3 + index * 0.16);
      cue.rotation.z = 0.12;
      cue.rotation.x = 0.1;
      this.scene.add(cue);
    }
    for (const [x, z] of [
      [-2.7, 1.25],
      [2.7, 1.25],
      [-3.5, -0.8],
      [3.5, -0.8],
    ]) {
      const stool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.2, 0.5, 16),
        new THREE.MeshStandardMaterial({
          color: midnight ? "#563a28" : "#2d3741",
          roughness: 0.6,
        }),
      );
      stool.position.set(x * tableScale, floorY + 0.25, z);
      stool.castShadow = true;
      this.scene.add(stool);
      const cushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.07, 16),
        new THREE.MeshStandardMaterial({
          color: midnight ? "#9b5f37" : "#445c70",
          roughness: 0.8,
        }),
      );
      cushion.position.set(x * tableScale, floorY + 0.535, z);
      this.scene.add(cushion);
    }
    if (this.environment === "arena") {
      for (const z of [-2.4, 2.4])
        for (const x of [-2.6, 2.6]) {
          const spot = new THREE.SpotLight("#fff3d6", 4.5, 9, 0.45, 0.6);
          spot.position.set(x * tableScale, ceiling - 0.2, z * tableScale);
          spot.target.position.set(0, 0, 0);
          this.scene.add(spot, spot.target);
        }
    } else {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, 2.1), trim);
      shelf.position.set(-width + 0.42, floorY + 0.525, -1.4);
      this.scene.add(shelf);
      const plant = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.85, 12),
        new THREE.MeshStandardMaterial({ color: "#3d6a4c", roughness: 1 }),
      );
      plant.position.set(width - 0.6, floorY + 0.425, 1.6);
      this.scene.add(plant);
    }
  }

  private setupBalls(balls: PoolBall[]) {
    const party = this.latestView?.mode === "party";
    const specials = new Map(
      (this.latestView?.party?.specials ?? []).map((special) => [
        special.id,
        special.kind,
      ]),
    );
    for (const ball of balls) {
      const texture = ballTexture(
        ball.id,
        !party,
        specials.get(ball.id),
      );
      const material = new THREE.MeshPhysicalMaterial({
        map: texture,
        color: "#f2f2f2",
        roughness: 0.32,
        metalness: 0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.22,
        envMapIntensity: 0.55,
      });
      const mesh = new THREE.Mesh(this.ballGeometry, material);
      mesh.castShadow = true;
      mesh.visible = !ball.pocketed;
      mesh.position.set(ball.x, ballRadius, ball.y);
      if (ball.rotation)
        mesh.quaternion.set(
          ball.rotation.x,
          ball.rotation.y,
          ball.rotation.z,
          ball.rotation.w,
        );
      this.scene.add(mesh);
      this.balls.set(ball.id, mesh);
      if (!ball.pocketed) this.previous.set(ball.id, { x: ball.x, y: ball.y });
    }
  }

  private setupCue() {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.011, cueLength, 16),
      new THREE.MeshStandardMaterial({ color: "#d9b37a", roughness: 0.42 }),
    );
    shaft.position.y = -cueLength / 2;
    shaft.castShadow = true;
    const butt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.014, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: "#4a2a1c", roughness: 0.5 }),
    );
    butt.position.y = -cueLength - 0.09;
    butt.castShadow = true;
    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.007, 0.012, 12),
      new THREE.MeshStandardMaterial({ color: "#f4f1e6", roughness: 0.7 }),
    );
    tip.position.y = -0.006;
    this.cue.add(shaft, butt, tip);
    this.cue.visible = false;
    this.scene.add(this.cue);
  }

  private applyBallPositions(balls: PoolBall[]) {
    const active = new Set(
      balls.filter((ball) => !ball.pocketed).map((ball) => ball.id),
    );
    for (const [id, mesh] of this.balls) {
      if (!active.has(id)) {
        this.previous.delete(id);
        if (!this.drops.has(id)) mesh.visible = false;
      }
    }
    for (const ball of balls) {
      if (ball.pocketed) continue;
      const mesh = this.balls.get(ball.id);
      if (!mesh) continue;
      if (this.drops.delete(ball.id)) mesh.scale.setScalar(1);
      mesh.visible = true;
      const previous = this.previous.get(ball.id),
        dx = previous ? ball.x - previous.x : 0,
        dz = previous ? ball.y - previous.y : 0,
        distance = Math.hypot(dx, dz);
      if (ball.rotation)
        mesh.quaternion.set(
          ball.rotation.x,
          ball.rotation.y,
          ball.rotation.z,
          ball.rotation.w,
        );
      else if (distance > 0.0001 && distance < 0.4) {
        const axis = new THREE.Vector3(dz, 0, -dx).normalize();
        mesh.rotateOnWorldAxis(axis, distance / ballRadius);
      }
      mesh.position.set(ball.x, ballRadius + (ball.z ?? 0), ball.y);
      this.previous.set(ball.id, { x: ball.x, y: ball.y });
    }
  }

  update(view: PoolView) {
    if (this.status.phase === "error") return;
    this.latestView = view;
    if (this.playing) return;
    this.applyBallPositions(view.balls);
  }

  playShot(
    shot: PoolShot,
    shotNumber: number,
    startedAt = performance.now(),
    leadIn = 0,
  ) {
    if (this.status.phase === "error" || this.playShotNumber === shotNumber)
      return;
    this.playShotNumber = shotNumber;
    this.playing = shot;
    this.playStarted = startedAt;
    this.leadInCue =
      leadIn > 0 && performance.now() < startedAt
        ? {
            cue: shot.cueBefore,
            aim: shot.aim,
            power: shot.power,
            elevation: shot.elevation ?? 0,
            startedAt: startedAt - leadIn,
            duration: leadIn,
          }
        : null;
    this.playedPockets.clear();
    this.playedImpacts.clear();
    const initial =
      ((performance.now() - startedAt) / 1000) * POOL_PLAYBACK_RATE;
    const time = initial * 1000;
    for (const pocket of shot.pocketed)
      if (pocket.t <= time) this.playedPockets.add(pocket.id);
    for (let index = 0; index < (shot.impacts?.length ?? 0); index++)
      if (shot.impacts[index].t <= time) this.playedImpacts.add(index);
    for (const mesh of this.balls.values()) mesh.scale.setScalar(1);
    this.drops.clear();
    this.cue.visible = !!this.leadInCue;
    this.aimLine.visible = false;
    this.ghost.visible = false;
    this.applyBallPositions(interpolateBalls(shot, initial));
    if (this.leadInCue) this.updateLeadIn(performance.now());
  }

  updateAim(aim: PoolSceneAim) {
    if (this.status.phase === "error") return;
    this.aim = aim;
    if (
      !this.playing &&
      this.strikeAt > 0 &&
      performance.now() - this.strikeAt > 220
    ) {
      this.strikeAt = 0;
      this.strikePower = 0;
    }
    this.applyAim();
  }

  strike(power: number, aim = this.aim.aim, elevation = this.aim.elevation) {
    if (this.status.phase === "error") return;
    this.strikePower = power;
    this.strikeAt = performance.now();
    if (this.aim.cue) {
      this.aim = { ...this.aim, aim, elevation, power };
    }
    this.applyCueTransform(performance.now());
  }

  private applyAim() {
    if (this.leadInCue && performance.now() < this.playStarted) {
      this.cue.visible = true;
      this.aimLine.visible = false;
      this.ghost.visible = false;
      return;
    }
    const { cue, aim, prediction, visible } = this.aim;
    const show = visible && !!cue && !this.playing;
    this.cue.visible = show;
    this.aimLine.visible = false;
    this.ghost.visible = false;
    if (!cue) return;
    if (show) {
      const cueBall = this.balls.get(0);
      if (cueBall) {
        cueBall.visible = true;
        cueBall.position.set(cue.x, ballRadius, cue.y);
        this.previous.set(0, { x: cue.x, y: cue.y });
      }
    }
    this.applyAimLine(cue, aim, prediction, show);
    if (show) this.applyCueTransform(performance.now());
  }

  private applyAimLine(
    cue: PoolPoint,
    aim: number,
    prediction: PoolPrediction | null,
    visible: boolean,
  ) {
    if (!visible) return;
    if (prediction) {
      setLinePoints(this.aimLine, prediction.cue);
      this.aimLine.visible = prediction.cue.length > 1;
      if (prediction.ghost) {
        this.ghost.position.set(
          prediction.ghost.x,
          ballRadius,
          prediction.ghost.y,
        );
        this.ghost.visible = true;
      }
      return;
    }
    const direction = new THREE.Vector3(Math.cos(aim), 0, Math.sin(aim));
    setLinePoints(this.aimLine, [
      {
        x: cue.x + direction.x * ballRadius,
        y: cue.y + direction.z * ballRadius,
      },
      {
        x: cue.x + direction.x * 0.28,
        y: cue.y + direction.z * 0.28,
      },
    ]);
    this.aimLine.visible = true;
  }

  private applyCuePose(
    cue: PoolPoint,
    aim: number,
    power: number,
    progress: number,
    elevation: number,
  ) {
    const pulled = ballRadius * 1.35 + power * 0.42;
    const tipDistance = pulled + (ballRadius * 1.01 - pulled) * progress;
    const direction = new THREE.Vector3(Math.cos(aim), 0, Math.sin(aim));
    const tilt = elevationAngle(elevation);
    const tipDirection = new THREE.Vector3(
      direction.x * Math.cos(tilt),
      -Math.sin(tilt),
      direction.z * Math.cos(tilt),
    ).normalize();
    this.cue.position.set(
      cue.x - direction.x * tipDistance,
      ballRadius + 0.008,
      cue.y - direction.z * tipDistance,
    );
    this.cue.quaternion.setFromUnitVectors(up, tipDirection);
  }

  private applyCueTransform(now: number) {
    const cue = this.aim.cue;
    if (!cue || !this.cue.visible || this.playing) return;
    const progress =
      this.strikeAt > 0 && this.strikePower > 0
        ? Math.min(1, (now - this.strikeAt) / 160)
        : 0;
    const power = this.strikeAt > 0 ? this.strikePower : this.aim.power;
    this.applyCuePose(cue, this.aim.aim, power, progress, this.aim.elevation);
  }

  private updateLeadIn(now: number) {
    const lead = this.leadInCue;
    if (!lead) return;
    if (now >= this.playStarted) {
      this.leadInCue = null;
      this.cue.visible = false;
      this.options.onCueStrike?.(lead.power);
      return;
    }
    const progress = Math.min(
      1,
      Math.max(0, (now - lead.startedAt) / lead.duration),
    );
    this.cue.visible = true;
    this.applyCuePose(lead.cue, lead.aim, lead.power, progress, lead.elevation);
  }

  private pointerRay(clientX: number, clientY: number) {
    const canvas = this.renderer?.domElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(pointer, this.camera);
    return this.raycaster;
  }

  ballAt(clientX: number, clientY: number): number | null {
    const ray = this.pointerRay(clientX, clientY);
    if (!ray) return null;
    const visible = [...this.balls.values()].filter((mesh) => mesh.visible);
    for (const mesh of visible) mesh.updateWorldMatrix(true, false);
    const hit = ray.intersectObjects(visible, false)[0];
    if (hit) for (const [id, mesh] of this.balls) if (mesh === hit.object) return id;
    return null;
  }

  pointAt(clientX: number, clientY: number): PoolPoint | null {
    const point = new THREE.Vector3();
    return this.pointerRay(clientX, clientY)?.ray.intersectPlane(this.plane, point)
      ? { x: point.x, y: point.z }
      : null;
  }

  setCursor(cursor: PoolCursor) {
    if (!this.renderer) return;
    this.renderer.domElement.style.cursor =
      cursor === "default" ? "crosshair" : cursor;
  }

  setInputMode(mode: PoolSceneInputMode) {
    if (!this.controls) return;
    this.controls.mouseButtons.LEFT =
      mode === "orbit" ? THREE.MOUSE.ROTATE : null;
    this.controls.touches.ONE = mode === "orbit" ? THREE.TOUCH.ROTATE : null;
    this.controls.enableRotate = true;
  }

  resetCamera() {
    this.resetting = true;
  }

  metrics(): PoolSceneMetrics {
    const canvas = this.renderer?.domElement;
    const target = this.controls?.target;
    let objects = 0;
    this.scene.traverse(() => {
      objects += 1;
    });
    return {
      phase: this.status.phase,
      message: this.status.message,
      width: this.width,
      height: this.height,
      canvas: {
        width: canvas?.clientWidth ?? 0,
        height: canvas?.clientHeight ?? 0,
      },
      devicePixelRatio:
        typeof devicePixelRatio === "number" ? devicePixelRatio : 1,
      rendererPixelRatio: this.renderer?.getPixelRatio() ?? 1,
      webgl: this.renderer?.capabilities.isWebGL2 ? "WebGL2" : "WebGL1",
      calls: this.renderer?.info.render.calls ?? 0,
      triangles: this.renderer?.info.render.triangles ?? 0,
      objects,
      balls: this.balls.size,
      lastResize: this.lastResize,
      camera: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        target: { x: target?.x ?? 0, y: target?.y ?? 0, z: target?.z ?? 0 },
        fov: this.camera.fov,
        aspect: this.camera.aspect,
      },
      fps: this.fps,
    };
  }

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    if (!this.renderer) return;
    try {
      const now = performance.now();
      if (this.lastFrameAt)
        this.fps = 1000 / Math.max(1, now - this.lastFrameAt);
      this.lastFrameAt = now;
      this.playback(now);
      this.updateLeadIn(now);
      this.updateDrops(now);
      this.followCamera();
      this.applyCueTransform(now);
      this.controls?.update();
      this.clampCamera();
      this.frameSamples += 1;
      if (!this.playing) this.adaptQuality(now);
      if (this.post) this.post.render();
      else this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.fail(error);
    }
  };

  private playback(now: number) {
    const shot = this.playing;
    if (!shot) return;
    const elapsed = ((now - this.playStarted) / 1000) * POOL_PLAYBACK_RATE;
    const time = elapsed * 1000;
    for (const pocket of shot.pocketed) {
      if (pocket.t <= time && !this.playedPockets.has(pocket.id)) {
        this.playedPockets.add(pocket.id);
        const mesh = this.balls.get(pocket.id);
        if (mesh) {
          const from = { x: mesh.position.x, y: mesh.position.z };
          const nearest = this.layout.pockets.reduce(
            (best, candidate) =>
              Math.hypot(candidate.x - from.x, candidate.y - from.y) <
              Math.hypot(best.x - from.x, best.y - from.y)
                ? candidate
                : best,
            this.layout.pockets[0],
          );
          this.drops.set(pocket.id, {
            started: now,
            from,
            pocket: { x: nearest.x, y: nearest.y },
          });
          mesh.visible = true;
        }
        this.options.onPocket?.(pocket.id);
      }
    }
    for (let index = 0; index < (shot.impacts?.length ?? 0); index++) {
      const impact = shot.impacts[index];
      if (impact.t <= time && !this.playedImpacts.has(index)) {
        this.playedImpacts.add(index);
        this.options.onImpact?.(impact.kind, impact.intensity);
      }
    }
    this.applyBallPositions(interpolateBalls(shot, elapsed));
    const last = shot.frames.at(-1)?.t ?? 0;
    if (elapsed * 1000 < last) return;
    this.playing = null;
    this.leadInCue = null;
    this.cue.visible = false;
    this.strikeAt = 0;
    this.strikePower = 0;
    this.applyBallPositions(this.latestView?.balls ?? shot.finalBalls);
    this.applyAim();
    this.options.onShotEnd?.();
  }

  private updateDrops(now: number) {
    for (const [id, drop] of this.drops) {
      const mesh = this.balls.get(id);
      if (!mesh) {
        this.drops.delete(id);
        continue;
      }
      const elapsed = now - drop.started,
        move = Math.min(1, elapsed / 120),
        sink = Math.min(1, Math.max(0, (elapsed - 120) / 180));
      mesh.visible = true;
      mesh.position.x = drop.from.x + (drop.pocket.x - drop.from.x) * move;
      mesh.position.z = drop.from.y + (drop.pocket.y - drop.from.y) * move;
      mesh.position.y = ballRadius - sink * 0.09;
      mesh.scale.setScalar(1 - sink * 0.75);
      if (sink >= 1) {
        mesh.visible = false;
        mesh.scale.setScalar(1);
        this.drops.delete(id);
      }
    }
  }

  private followCamera() {
    if (!this.resetting || !this.controls) return;
    this.camera.position.lerp(this.homePosition, 0.16);
    this.controls.target.lerp(this.homeTarget, 0.16);
    if (
      this.camera.position.distanceTo(this.homePosition) < 0.003 &&
      this.controls.target.distanceTo(this.homeTarget) < 0.003
    ) {
      this.camera.position.copy(this.homePosition);
      this.controls.target.copy(this.homeTarget);
      this.resetting = false;
    }
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.cancelResize();
    this.observer?.disconnect();
    this.observer = undefined;
    this.controls?.dispose();
    this.renderer?.domElement.removeEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    this.post?.dispose();
    this.post = undefined;
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = undefined;
    this.controls = undefined;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const attached = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      for (const material of attached) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value);
        }
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    this.balls.clear();
    this.previous.clear();
  }
}

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

const ballRadius = standardPoolLayout.table.ballRadius;
const railHeight = 0.065;
const cueLength = 0.82;
const cueTilt = 0.14;

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

  constructor(
    private host: HTMLElement,
    view: PoolView,
    private options: PoolSceneOptions = {},
  ) {
    this.latestView = view;
    this.layout = poolLayout(view.mode);
    this.tableWidth = this.layout.table.width;
    this.tableHeight = this.layout.table.height;
    const tableScale = this.tableWidth / standardPoolLayout.table.width;
    this.homePosition.set(0, 2.05 * tableScale, 1.85 * tableScale);
    this.scene.background = new THREE.Color("#111820");
    this.scene.fog = new THREE.Fog(
      "#111820",
      4.5 * tableScale,
      9 * tableScale,
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
      renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, this.lowQuality ? 1.25 : 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !this.lowQuality;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.host.append(renderer.domElement);
      this.controls = new OrbitControls(this.camera, renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.minDistance = 1.15 * (this.tableWidth / standardPoolLayout.table.width);
      this.controls.maxDistance = 4.2 * (this.tableWidth / standardPoolLayout.table.width);
      this.controls.minPolarAngle = 0.22;
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
        Math.min(devicePixelRatio || 1, this.lowQuality ? 1.25 : 2),
      );
      this.renderer.setSize(size.width, size.height, false);
      this.camera.aspect = size.width / size.height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
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
    this.scene.add(new THREE.HemisphereLight("#dff3ff", "#18202a", 1.1));
    const key = new THREE.DirectionalLight("#fff3d6", 2.4);
    key.position.set(1.8, 3.4, 1.5);
    key.castShadow = !this.lowQuality;
    key.shadow.mapSize.set(
      this.lowQuality ? 512 : 1024,
      this.lowQuality ? 512 : 1024,
    );
    key.shadow.camera.left = -1.8;
    key.shadow.camera.right = 1.8;
    key.shadow.camera.top = 1.4;
    key.shadow.camera.bottom = -1.4;
    this.scene.add(key);
    const rim = new THREE.PointLight("#8fd8ff", 1.2, 4);
    rim.position.set(-1.6, 1.1, -1.2);
    this.scene.add(rim);
  }

  private setupTable() {
    const wood = new THREE.MeshStandardMaterial({
      color: "#4b2d22",
      roughness: 0.42,
      metalness: 0.08,
    });
    const cloth = new THREE.MeshStandardMaterial({
      color: "#126e5d",
      roughness: 0.92,
      metalness: 0,
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(
        this.tableWidth + 0.16,
        0.1,
        this.tableHeight + 0.16,
      ),
      wood,
    );
    frame.position.y = -0.075;
    frame.receiveShadow = true;
    this.scene.add(frame);
    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableWidth, 0.035, this.tableHeight),
      cloth,
    );
    felt.position.y = -0.0175;
    felt.receiveShadow = true;
    this.scene.add(felt);
    const railMesh = (points: PoolPoint[], height = railHeight) => {
      const shape = new THREE.Shape(
        points.map((point) => new THREE.Vector2(point.x, -point.y)),
      );
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: height,
          bevelEnabled: false,
        }),
        wood,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };
    for (const rail of this.layout.rails) railMesh(rail.points);
    for (const jaw of this.layout.jaws)
      railMesh(jawPolygon(jaw), railHeight * 0.94);
    const pocketMaterial = new THREE.MeshStandardMaterial({
      color: "#05090c",
      roughness: 0.9,
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
      new THREE.CircleGeometry(3.2 * (this.tableWidth / standardPoolLayout.table.width), 64),
      new THREE.MeshStandardMaterial({ color: "#0a1117", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.13;
    floor.receiveShadow = true;
    this.scene.add(floor);
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
        color: "#ffffff",
        roughness: 0.26,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
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

  strike(power: number) {
    if (this.status.phase === "error") return;
    this.strikePower = power;
    this.strikeAt = performance.now();
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
    const tilt = cueTilt + elevation * 0.95;
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

  pointAt(clientX: number, clientY: number): PoolPoint | null {
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
    const point = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, point)
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
      this.renderer.render(this.scene, this.camera);
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

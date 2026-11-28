import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { golfBallRadius, golfCupRadius } from "../../../domain/golf/physics";
import { golfSurfaceGeometry } from "./surface";
import { sampleGolfSurface } from "../../../domain/golf/terrain";
import type { GolfCourse, GolfPoint, GolfState } from "../../../domain/golf/types";
import {
  pixelRatioFor,
  postSettings,
  scenePalettes,
  type GolfEnvironment,
} from "../../scene3d/environment";
import {
  applyRepeat,
  grassTexture,
  waterTexture,
} from "../../scene3d/textures";
import { applyHdri, placeSceneModel } from "../../scene3d/assets";
import { createPostPipeline, type PostPipeline } from "../../scene3d/post";

const ballColors = ["#f9faed", "#eda547", "#80bcee", "#f17494", "#bd9af4", "#b3dd59"];
const up = new THREE.Vector3(0, 1, 0);

export type GolfSceneStatus = { phase: "loading" | "ready" | "error"; message?: string };
export type GolfSceneInputMode = "aim" | "orbit";

export class GolfScene3D {
  private lowQuality =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  private controls?: OrbitControls;
  private observer?: ResizeObserver;
  private host: HTMLElement;
  private environment: GolfEnvironment;
  private palette;
  private balls = new Map<number, THREE.Mesh>();
  private group = new THREE.Group();
  private ground?: THREE.Mesh;
  private aim = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: "#fff0bd" }),
  );
  private status: GolfSceneStatus = { phase: "loading" };
  private running = true;
  private post?: PostPipeline;
  private follow: GolfPoint | null = null;
  private keys = new Set<string>();
  private cameraYaw = 0;
  private panOffset = new THREE.Vector3();
  private lastTick = 0;
  private detachKeyboard?: () => void;
  private grass = applyRepeat(grassTexture(), 8, 5);
  private water = applyRepeat(waterTexture(), 3);

  constructor(
    host: HTMLElement,
    environment: GolfEnvironment,
    private course: GolfCourse,
    private onStatus?: (status: GolfSceneStatus) => void,
    private quality: import("../../scene3d/environment").Scene3dQuality = "balanced",
    private hole = 0,
  ) {
    this.host = host;
    this.environment = environment;
    this.palette = scenePalettes[environment];
    this.applySky();
    const span = Math.max(this.course.width, this.course.height);
    this.scene.fog = new THREE.Fog(this.palette.fog, span * 1.1, span * 3.1);
    this.camera.far = span * 7;
    this.camera.updateProjectionMatrix();
    this.scene.add(this.group);
    const canvas = document.createElement("canvas");
    canvas.className = "golf-3d-canvas";
    host.append(canvas);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !this.lowQuality,
        alpha: false,
        powerPreference: "high-performance",
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.9;
      canvas.addEventListener("webglcontextlost", this.handleContextLost);
      this.renderer.setPixelRatio(pixelRatioFor(this.quality));
      this.renderer.shadowMap.enabled = this.quality !== "performance";
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.camera.position.set(0, 11.5, 15.5);
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.enablePan = false;
      this.controls.target.set(0, 0.2, 0);
      this.controls.minDistance = 8;
      this.controls.maxDistance = 26;
      this.controls.minPolarAngle = 0.35;
      this.controls.maxPolarAngle = 1.35;
      this.controls.update();
      this.setInputMode("aim");
      this.attachKeyboard();
      this.frameCourse();
      this.setupLights();
      this.buildHole();
      this.aim.visible = false;
      this.scene.add(this.aim);
      const post = postSettings(this.quality);
      if (post.enabled)
        this.post = createPostPipeline(this.renderer, this.scene, this.camera, post);
      void applyHdri(this.renderer, this.scene, "sunset", {
        background: false,
        intensity: 0.35,
      });
      this.resize();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(host);
      this.report("ready");
      this.tick();
    } catch (error) {
      this.fail(error);
    }
  }

  private applySky() {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, this.palette.sky);
    gradient.addColorStop(0.55, this.palette.fog);
    gradient.addColorStop(1, this.palette.ambient);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
    this.scene.background = texture;
  }

  setInputMode(mode: GolfSceneInputMode) {
    if (!this.controls) return;
    if (mode === "aim") {
      this.controls.mouseButtons.LEFT = null;
      this.controls.touches.ONE = null;
      this.controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
      this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    } else {
      this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      this.controls.touches.ONE = THREE.TOUCH.ROTATE;
      this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    }
  }

  focusBall(point: GolfPoint | null) {
    if (point === this.follow) return;
    this.follow = point;
    if (!point) this.resetCamera();
  }

  private attachKeyboard() {
    const blocked = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable;
    };
    const down = (event: KeyboardEvent) => {
      if (blocked(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === "w" || key === "a" || key === "s" || key === "d" || key === "q" || key === "e") {
        this.keys.add(key);
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      this.keys.delete(event.key.toLowerCase());
    };
    const blur = () => this.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.detachKeyboard = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }

  private applyCameraInput(delta: number) {
    if (!this.controls || this.keys.size === 0) return;
    const span = Math.max(this.course.width, this.course.height);
    const panSpeed = span * 0.42 * delta;
    const rotateSpeed = 1.3 * delta;
    const forward = new THREE.Vector3()
      .subVectors(this.controls.target, this.camera.position);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const move = new THREE.Vector3();
    if (this.keys.has("w")) move.add(forward);
    if (this.keys.has("s")) move.sub(forward);
    if (this.keys.has("d")) move.add(right);
    if (this.keys.has("a")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(panSpeed);
      this.camera.position.add(move);
      this.controls.target.add(move);
      this.panOffset.add(move);
    }
    const rotate = (this.keys.has("q") ? 1 : 0) - (this.keys.has("e") ? 1 : 0);
    if (rotate) {
      const pivot = this.controls.target;
      const offset = new THREE.Vector3().subVectors(this.camera.position, pivot);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotateSpeed * rotate);
      this.camera.position.copy(pivot).add(offset);
      this.cameraYaw += rotateSpeed * rotate;
    }
  }

  private frameCourse() {
    const span = Math.max(this.course.width, this.course.height);
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    const verticalExtent = this.course.height * 0.55;
    const horizontalExtent = this.course.width * 0.55 / Math.max(0.4, aspect);
    const distance = Math.max(verticalExtent, horizontalExtent) /
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) + this.course.height * 0.40;
    this.camera.far = Math.max(span * 7, distance * 3);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, distance * 0.6, distance * 0.78);
    this.controls?.target.set(0, 0.2, 0);
    this.panOffset.set(0, 0, 0);
    this.cameraYaw = 0;
    if (this.controls) {
      this.controls.minDistance = span * 0.32;
      this.controls.maxDistance = Math.max(span * 1.8 + 10, distance * 1.2);
    }
    this.controls?.update();
  }

  resetCamera() {
    this.frameCourse();
  }

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.fail(new Error("WebGL 上下文丢失"));
  };

  private report(phase: GolfSceneStatus["phase"], message?: string) {
    if (this.status.phase === phase && this.status.message === message) return;
    this.status = { phase, message };
    this.onStatus?.(this.status);
  }

  private fail(error: unknown) {
    this.dispose();
    this.report("error", error instanceof Error ? error.message : "3D 球场初始化失败");
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight(this.palette.sky, this.palette.ground, 1.5));
    const sun = new THREE.DirectionalLight(this.palette.sun, 3.2);
    sun.position.set(6, 12, 5);
    sun.castShadow = this.quality !== "performance";
    const shadowSize =
      this.quality === "high" ? 2048 : this.quality === "balanced" ? 1024 : 512;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    const shadowExtent = Math.max(this.course.width, this.course.height) * 0.65;
    sun.shadow.camera.left = -shadowExtent;
    sun.shadow.camera.right = shadowExtent;
    sun.shadow.camera.top = shadowExtent;
    sun.shadow.camera.bottom = -shadowExtent;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 2;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(this.palette.fill, 0.8);
    fill.position.set(-8, 5, -4);
    this.scene.add(fill);
  }

  private material(color: string, roughness = 0.9) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, cast = true) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.position.y = 0;
    this.group.add(mesh);
    return mesh;
  }

  private heightAt(x: number, y: number) {
    return sampleGolfSurface(this.course, { x, y }).height;
  }

  private drapedZone(
    zone: { x: number; y: number; width: number; height: number },
    color: string,
    lift: number,
    opacity = 1,
  ) {
    const geometry = new THREE.PlaneGeometry(
      zone.width,
      zone.height,
      Math.max(2, Math.ceil(zone.width * 4)),
      Math.max(2, Math.ceil(zone.height * 4)),
    );
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position!;
    const center = this.heightAt(zone.x, zone.y);
    for (let vertex = 0; vertex < vertices.count; vertex++) {
      const worldX = zone.x + vertices.getX(vertex);
      const worldY = zone.y + vertices.getZ(vertex);
      const level = this.heightAt(worldX, worldY);
      vertices.setY(
        vertex,
        Math.max(center - 0.1, Math.min(center + 0.1, level)) + lift,
      );
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.05,
        transparent: opacity < 1,
        opacity,
      }),
    );
    mesh.position.set(
      zone.x - this.course.width / 2,
      0,
      zone.y - this.course.height / 2,
    );
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  private surfaceBox(width: number, thickness: number, depth: number, x: number, y: number) {
    if (!this.course.terrain) return new THREE.BoxGeometry(width, thickness, depth);
    const geometry = new THREE.BoxGeometry(width, thickness, depth, Math.ceil(width * 2), 1, Math.ceil(depth * 2));
    const vertices = geometry.attributes.position!;
    for (let vertex = 0; vertex < vertices.count; vertex++) {
      const height = this.heightAt(x + vertices.getX(vertex), y + vertices.getZ(vertex));
      vertices.setY(vertex, vertices.getY(vertex) + height);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  private buildHole() {
    const course = this.course;
    this.clearGroup();
    if (this.environment === "coast") {
      const sea = this.mesh(
        new THREE.BoxGeometry(course.width + 35, 0.08, 22),
        new THREE.MeshStandardMaterial({ map: this.water, color: "#ffffff", roughness: 0.2, metalness: 0.18 }),
        false,
      );
      sea.position.set(0, -0.3, -course.height / 2 - 18);
    }
    this.ground = this.mesh(
      golfSurfaceGeometry(course, this.palette.groundAccent),
      new THREE.MeshStandardMaterial({ map: this.grass, vertexColors: true, roughness: 1 }),
      false,
    );
    for (const wall of [
      { x: 0, y: this.course.height / 2, width: 0.3, height: this.course.height + 0.4 },
      { x: this.course.width, y: this.course.height / 2, width: 0.3, height: this.course.height + 0.4 },
      { x: this.course.width / 2, y: 0, width: this.course.width, height: 0.3 },
      { x: this.course.width / 2, y: this.course.height, width: this.course.width, height: 0.3 },
    ]) {
      const rail = this.mesh(
        this.surfaceBox(wall.width, 0.32, wall.height, wall.x, wall.y),
        this.material(this.environment === "coast" ? "#b18b60" : "#6c5238", 0.8),
      );
      rail.position.set(wall.x - this.course.width / 2, 0.12, wall.y - this.course.height / 2);
    }
    for (const bank of course.banks) {
      const mesh = this.mesh(
        this.surfaceBox(bank.width, 0.28, bank.height, bank.x, bank.y),
        this.material(this.environment === "coast" ? "#d2b28a" : "#806545", 0.85),
      );
      mesh.position.set(bank.x - this.course.width / 2, 0.1, bank.y - this.course.height / 2);
    }
    for (const zone of course.sand)
      this.drapedZone(zone, "#f2e2b8", 0.012);
    for (const zone of course.water)
      this.drapedZone(zone, "#3f8fc4", 0.02, 0.92);
    const teeElevation = this.heightAt(course.tee.x, course.tee.y);
    const cupElevation = this.heightAt(course.cup.x, course.cup.y);
    const sign = this.mesh(
      new THREE.BoxGeometry(0.05, 0.6, 0.05),
      this.material("#6f4f34", 0.9),
    );
    sign.position.set(course.tee.x - this.course.width / 2 - 0.7, 0.3 + teeElevation, course.tee.y - this.course.height / 2 - 0.4);
    const board = this.mesh(
      new THREE.BoxGeometry(0.6, 0.34, 0.04),
      this.material("#f4e7c6", 0.8),
    );
    board.position.set(course.tee.x - this.course.width / 2 - 0.7, 0.62 + teeElevation, course.tee.y - this.course.height / 2 - 0.4);
    const cup = this.mesh(new THREE.CylinderGeometry(golfCupRadius, golfCupRadius, 0.046, 32), this.material("#1c241d"));
    cup.position.set(course.cup.x - this.course.width / 2, 0.016 + cupElevation, course.cup.y - this.course.height / 2);
    const pole = this.mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 12), this.material("#f0e7cf", 0.4));
    pole.position.set(course.cup.x - this.course.width / 2, 1.2 + cupElevation, course.cup.y - this.course.height / 2);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.62),
      new THREE.MeshStandardMaterial({ color: "#fa6b5e", side: THREE.DoubleSide, roughness: 0.8 }),
    );
    flag.position.set(course.cup.x - this.course.width / 2 + 0.56, 2.12 + cupElevation, course.cup.y - this.course.height / 2);
    this.group.add(flag);
    this.buildScenery(course);
    this.balls.clear();
    for (let index = 0; index < 8; index++) {
      const ball = this.mesh(
        new THREE.SphereGeometry(golfBallRadius, 20, 16),
        new THREE.MeshStandardMaterial({ color: ballColors[index] ?? "#fff", roughness: 0.5 }),
      );
      ball.visible = false;
      this.balls.set(index, ball);
    }
  }

  private clearGroup() {
    this.ground = undefined;
    while (this.group.children.length) {
      const child = this.group.children.pop()!;
      child.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
          else object.material.dispose();
        }
      });
    }
  }

  private tree(x: number, z: number, scale = 1, base = 0) {
    const trunk = this.mesh(
      new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 1.2 * scale, 8),
      this.material("#6f4f34", 1),
    );
    trunk.position.set(x, base + 0.6 * scale, z);
    const crown = this.mesh(
      new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 10),
      this.material(this.environment === "coast" ? "#3f7758" : "#2f6345", 1),
    );
    crown.position.set(x, base + 1.7 * scale, z);
    const crown2 = this.mesh(
      new THREE.ConeGeometry(0.62 * scale, 1.3 * scale, 10),
      this.material(this.environment === "coast" ? "#4a8862" : "#3d7651", 1),
    );
    crown2.position.set(x, 2.45 * scale, z);
  }

  private buildScenery(_course: GolfCourse) {
    const edge = 1.4;
    for (let index = 0; index < 7; index++) {
      const hill = this.mesh(
        new THREE.ConeGeometry(2.8 + (index % 3) * 0.9, 3.2 + (index % 2) * 1.4, 7),
        this.material(this.environment === "coast" ? "#6c9582" : "#4e6d55", 1),
        false,
      );
      hill.position.set(-14 + index * 4.6, 1.1, -15 - (index % 3) * 2.4);
      hill.rotation.y = index * 0.6;
    }
    void placeSceneModel(this.group, "araucaria", [-8.5, 0, -5.2], 4.2, 0.4);
    void placeSceneModel(this.group, "ipe", [8.2, 0, -6.5], 3.8, -0.6);
    void placeSceneModel(this.group, "rocks", [-6.8, 0, 5.2], 0.8, 0.2);
    for (let index = 0; index < 5; index++) {
      const cloud = new THREE.Group();
      const cloudMaterial = new THREE.MeshBasicMaterial({
        color: this.environment === "coast" ? "#f6f5ea" : "#e5eadf",
        transparent: true,
        opacity: 0.72,
      });
      for (let part = 0; part < 3; part++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.55 + part * 0.16, 10, 8),
          cloudMaterial,
        );
        puff.position.set(part * 0.7 - 0.6, part % 2 ? 0.18 : 0, 0);
        cloud.add(puff);
      }
      cloud.position.set(-12 + index * 5.2, 7.4 + (index % 2) * 0.7, -11);
      this.group.add(cloud);
    }
    for (let x = -this.course.width / 2 - 2.4; x < this.course.width / 2 + 3; x += 2.1) {
      if (Math.abs(x) < 2.8) continue;
      this.tree(x, -this.course.height / 2 - edge - 1.2, 0.7 + (Math.abs(x) % 1.3) * 0.28);
      this.tree(x, this.course.height / 2 + edge + 1.2, 0.72 + (Math.abs(x) % 1.8) * 0.24);
    }
    for (let index = 0; index < 7; index++) {
      const rock = this.mesh(
        new THREE.DodecahedronGeometry(0.28 + (index % 3) * 0.1, 0),
        this.material(this.environment === "coast" ? "#a9a293" : "#757c6f", 1),
      );
      rock.position.set(-5.5 + index * 1.8, 0.18, (index % 2 ? 1 : -1) * (this.course.height / 2 + 1.25));
      rock.rotation.set(index, index * 0.4, 0);
    }
    if (this.environment === "coast") {
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 30),
        new THREE.MeshStandardMaterial({ color: "#3b87a0", roughness: 0.28, metalness: 0.2 }),
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, -0.5, -this.course.height / 2 - 22);
      this.group.add(sea);
      const tower = this.mesh(
        new THREE.CylinderGeometry(0.55, 0.9, 4.2, 16),
        this.material("#f0e8d3", 0.8),
      );
      tower.position.set(-8.5, 2.1, -this.course.height / 2 - 2);
      const top = this.mesh(
        new THREE.CylinderGeometry(0.34, 0.52, 0.7, 16),
        this.material("#c76155", 0.8),
      );
      top.position.set(-8.5, 4.55, -this.course.height / 2 - 2);
      const light = new THREE.PointLight("#ffc978", 2.2, 8);
      light.position.set(-8.5, 4.5, -this.course.height / 2 - 2);
      this.group.add(light);
    } else {
      const pond = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 32),
        new THREE.MeshStandardMaterial({ color: "#4b8492", roughness: 0.25, metalness: 0.1 }),
      );
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(8.2, 0.01, this.course.height / 2 + 3);
      this.group.add(pond);
      const cabin = this.mesh(new THREE.BoxGeometry(2.2, 1.6, 1.8), this.material("#7b5a40", 0.9));
      cabin.position.set(-7.2, 0.8, this.course.height / 2 + 3);
      const roof = this.mesh(new THREE.ConeGeometry(1.8, 1.1, 4), this.material("#5f3d2b", 0.9));
      roof.position.set(-7.2, 2.15, this.course.height / 2 + 3);
      roof.rotation.y = Math.PI / 4;
    }
  }

  private tick = () => {
    if (!this.running) return;
    const now = performance.now();
    const delta = this.lastTick ? Math.min(0.05, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    this.applyCameraInput(delta);
    this.controls?.update();
    if (this.follow) {
      const target = new THREE.Vector3(
        this.follow.x - this.course.width / 2,
        0.35 + this.heightAt(this.follow.x, this.follow.y),
        this.follow.y - this.course.height / 2,
      ).add(this.panOffset);
      const base = new THREE.Vector3(1.8, 4.0, 5.5).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.cameraYaw,
      );
      this.controls?.target.lerp(target, 0.08);
      this.camera.position.lerp(
        new THREE.Vector3(target.x + base.x, target.y + base.y, target.z + base.z),
        0.04,
      );
    }
    if (this.post) this.post.render();
    else this.renderer?.render(this.scene, this.camera);
    requestAnimationFrame(this.tick);
  };

  update(view: GolfState["view"], moving: Record<number, GolfPoint> = {}) {
    const next = view.courses[view.hole];
    if (next && view.hole !== this.hole) {
      this.course = next;
      this.hole = view.hole;
      this.buildHole();
      this.frameCourse();
      if (this.scene.fog instanceof THREE.Fog) {
        const span = Math.max(next.width, next.height);
        this.scene.fog.near = span * 1.1;
        this.scene.fog.far = span * 3.1;
      }
    }
    const active = view.players;
    for (const [index, ball] of this.balls) {
      const player = active[index];
      if (!player) {
        ball.visible = false;
        continue;
      }
      const point = moving[index] ?? player.position;
      ball.visible = !player.sunk || !!moving[index];
      ball.position.set(point.x - this.course.width / 2, golfBallRadius + this.heightAt(point.x, point.y), point.y - this.course.height / 2);
    }
  }

  setAim(point: GolfPoint | null, aim: number, power: number, visible: boolean) {
    if (!point || !visible) {
      this.aim.visible = false;
      return;
    }
    const length = 0.6 + power * 4;
    const points = Array.from({ length: 18 }, (_, index) => {
      const travel = index * length / 17;
      const x = point.x + Math.cos(aim) * travel;
      const y = point.y + Math.sin(aim) * travel;
      return new THREE.Vector3(x - this.course.width / 2, this.heightAt(x, y) + 0.065, y - this.course.height / 2);
    });
    this.aim.geometry.dispose();
    this.aim.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.aim.visible = true;
  }

  setEnvironment(environment: GolfEnvironment) {
    if (environment === this.environment) return;
    this.environment = environment;
    this.palette = scenePalettes[environment];
    this.applySky();
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.set(this.palette.fog);
    this.buildHole();
  }

  private resize() {
    if (!this.renderer) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.post?.resize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.running = false;
    this.detachKeyboard?.();
    this.observer?.disconnect();
    this.controls?.dispose();
    this.clearGroup();
    this.aim.geometry.dispose();
    (this.aim.material as THREE.Material).dispose();
    this.renderer?.domElement.removeEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    this.post?.dispose();
    this.post = undefined;
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = undefined;
  }

  groundPoint(clientX: number, clientY: number): GolfPoint | null {
    const rect = this.host.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    this.camera.updateMatrixWorld();
    ray.setFromCamera(pointer, this.camera);
    if (this.ground) this.ground.updateWorldMatrix(true, false);
    const hit = this.ground ? ray.intersectObject(this.ground)[0]?.point : undefined;
    const point = hit ?? ray.ray.intersectPlane(new THREE.Plane(up, 0.06), new THREE.Vector3());
    if (!point) return null;
    return {
      x: point.x + this.course.width / 2,
      y: point.z + this.course.height / 2,
    };
  }
}

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const modelUrls = {
  lamp: new URL("../../assets/scene3d/models/ap_floor_lamp.glb", import.meta.url).href,
  cactus: new URL("../../assets/scene3d/models/ap_plant_cactus.glb", import.meta.url).href,
  araucaria: new URL("../../assets/scene3d/models/araucaria.glb", import.meta.url).href,
  ipe: new URL("../../assets/scene3d/models/ipe_amarelo.glb", import.meta.url).href,
  rocks: new URL("../../assets/scene3d/models/pedras.glb", import.meta.url).href,
} as const;

const hdriUrls = {
  studio: new URL("../../assets/scene3d/hdri/studio_small_03_1k.hdr", import.meta.url).href,
  sunset: new URL("../../assets/scene3d/hdri/sunset_in_the_chalk_quarry_1k.hdr", import.meta.url).href,
} as const;

export type SceneModel = keyof typeof modelUrls;
export type SceneHdri = keyof typeof hdriUrls;

const modelCache = new Map<string, Promise<THREE.Group>>();
const hdriCache = new Map<string, Promise<THREE.DataTexture>>();

export function loadSceneModel(name: SceneModel): Promise<THREE.Group> {
  const cached = modelCache.get(name);
  if (cached) return cached;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    new GLTFLoader().load(
      modelUrls[name],
      (gltf) => resolve(gltf.scene),
      undefined,
      reject,
    );
  });
  modelCache.set(name, promise);
  return promise;
}

export async function placeSceneModel(
  parent: THREE.Object3D,
  name: SceneModel,
  position: [number, number, number],
  height: number,
  rotation = 0,
) {
  try {
    const source = await loadSceneModel(name);
    const model = source.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = height / Math.max(0.001, size.y);
    model.scale.setScalar(scale);
    model.position.set(position[0], position[1], position[2]);
    model.rotation.y = rotation;
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    parent.add(model);
    return model;
  } catch {
    return undefined;
  }
}

export function loadSceneHdri(name: SceneHdri): Promise<THREE.DataTexture> {
  const cached = hdriCache.get(name);
  if (cached) return cached;
  const promise = new Promise<THREE.DataTexture>((resolve, reject) => {
    new RGBELoader().load(
      hdriUrls[name],
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
  hdriCache.set(name, promise);
  return promise;
}

export async function applyHdri(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  name: SceneHdri,
  options: { background?: boolean; intensity?: number } = {},
) {
  try {
    const texture = await loadSceneHdri(name);
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromEquirectangular(texture);
    generator.dispose();
    scene.environment = target.texture;
    scene.environmentIntensity = options.intensity ?? 1;
    if (options.background) scene.background = texture;
    return { environment: target.texture, texture };
  } catch {
    return undefined;
  }
}

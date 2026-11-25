import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export interface PostPipeline {
  render: () => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export interface PostOptions {
  bloom?: boolean;
  smaa?: boolean;
  sharpen?: boolean;
  samples?: number;
}

export function createPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PostOptions = {},
): PostPipeline | undefined {
  try {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: options.samples ?? 0,
    });
    const composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = options.bloom === false ? undefined : new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, renderer.domElement.width / 2), Math.max(1, renderer.domElement.height / 2)),
      0.08,
      0.22,
      1.16,
    );
    if (bloom) composer.addPass(bloom);
    const smaa = options.smaa === false ? undefined : new SMAAPass();
    if (smaa) composer.addPass(smaa);
    const sharpen = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(1, 1) },
        strength: { value: 0.28 },
      },
      vertexShader:
        "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float strength; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); vec2 texel = 1.0 / resolution; vec4 blur = (texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)) + texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)) + texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)) + texture2D(tDiffuse, vUv + vec2(0.0, texel.y))) * 0.25; gl_FragColor = vec4(color.rgb + (color.rgb - blur.rgb) * strength, color.a); }",
    });
    if (options.sharpen !== false) composer.addPass(sharpen);
    composer.addPass(new OutputPass());
    return {
      render: () => composer.render(),
      resize: (width, height) => {
        composer.setSize(width, height);
        sharpen.uniforms.resolution.value.set(width, height);
      },
      dispose: () => {
        bloom?.dispose();
        smaa?.dispose();
        sharpen.dispose();
        composer.dispose();
      },
    };
  } catch {
    return undefined;
  }
}

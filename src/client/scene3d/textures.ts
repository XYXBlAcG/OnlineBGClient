import * as THREE from "three";

function canvasTexture(size: number, paint: (context: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  paint(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function grassTexture(base = "#5e9a60", accent = "#7fba72") {
  return canvasTexture(256, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 1400; index++) {
      context.fillStyle = index % 3 === 0 ? accent : "rgb(255 255 255 / 0.05)";
      const x = Math.random() * size;
      const y = Math.random() * size;
      context.fillRect(x, y, 1, 2 + Math.random() * 3);
    }
    context.strokeStyle = "rgb(255 255 255 / 0.07)";
    context.lineWidth = 5;
    for (let x = -size; x < size * 2; x += 34) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + size, size);
      context.stroke();
    }
  });
}

export function woodTexture(base = "#6b4326", grain = "#3d2315") {
  return canvasTexture(128, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      context.fillStyle = y % 16 === 0 ? grain : "rgb(255 255 255 / 0.05)";
      context.fillRect(0, y, size, 1 + (y % 3));
    }
    for (let index = 0; index < 16; index++) {
      context.fillStyle = "rgb(255 255 255 / 0.04)";
      context.fillRect(0, Math.random() * size, size, 1);
    }
  });
}

export function carpetTexture(base = "#2d211b", accent = "#5a3d2b") {
  return canvasTexture(96, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 1200; index++) {
      context.fillStyle = index % 7 === 0 ? accent : "rgb(255 255 255 / 0.035)";
      context.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  });
}

export function sandTexture(base = "#d9c08b", accent = "#c5a66f") {
  return canvasTexture(96, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 800; index++) {
      context.fillStyle = index % 8 === 0 ? accent : "rgb(80 60 30 / 0.08)";
      context.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  });
}

export function waterTexture(base = "#4c93aa") {
  return canvasTexture(128, (context, size) => {
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgb(255 255 255 / 0.15)";
    context.lineWidth = 2;
    for (let y = 0; y < size; y += 14) {
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(size * 0.3, y - 4, size * 0.6, y + 4, size, y);
      context.stroke();
    }
  });
}

export function applyRepeat(texture: THREE.Texture, x: number, y = x) {
  texture.anisotropy = 8;
  texture.repeat.set(x, y);
  texture.needsUpdate = true;
  return texture;
}

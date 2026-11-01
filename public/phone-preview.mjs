import { previewUrl, previewSize, previewFit } from "./phone-preview-model.mjs";

const stage = document.querySelector("#stage");
const space = document.querySelector("#space");
const device = document.querySelector("#device");
const frame = document.querySelector("#game");
const width = document.querySelector("#width");
const height = document.querySelector("#height");
const preset = document.querySelector("#preset");
const scale = document.querySelector("#scale");
const address = document.querySelector("#address");
const error = document.querySelector("#error");
const dimensions = document.querySelector("#dimensions");
let landscape = false;
let loaded = "";

function resize() {
  const size = previewSize(width.value, height.value, landscape);
  const factor =
    scale.value === "fit"
      ? previewFit(
          size.width,
          size.height,
          stage.clientWidth,
          stage.clientHeight,
        )
      : Number(scale.value);
  width.value = String(size.width);
  height.value = String(size.height);
  device.style.width = `${size.width}px`;
  device.style.height = `${size.height}px`;
  device.style.transform = `scale(${factor})`;
  space.style.width = `${(size.width + 20) * factor}px`;
  space.style.height = `${(size.height + 20) * factor}px`;
  dimensions.value = `${size.width} × ${size.height} CSS px · 外框 ${Math.round(factor * 100)}%`;
}

function navigate() {
  try {
    const url = previewUrl(address.value, location.href);
    frame.src = url;
    loaded = url;
    error.textContent = "";
  } catch (value) {
    error.textContent = value.message;
  }
}

document.querySelector("#navigate").addEventListener("submit", (event) => {
  event.preventDefault();
  navigate();
});
preset.addEventListener("change", () => {
  if (preset.value !== "custom")
    [width.value, height.value] = preset.value.split(",");
  resize();
});
for (const field of [width, height])
  field.addEventListener("change", () => {
    preset.value = "custom";
    landscape = Number(width.value) > Number(height.value);
    resize();
  });
scale.addEventListener("change", resize);
document.querySelector("#rotate").addEventListener("click", () => {
  landscape = !landscape;
  resize();
});
document.querySelector("#reload").addEventListener("click", () => {
  if (loaded) frame.src = loaded;
});
new ResizeObserver(resize).observe(stage);
address.value = new URL(
  location.protocol === "file:" ? "http://127.0.0.1:1421/" : "/",
  location.href,
).href;
resize();
navigate();

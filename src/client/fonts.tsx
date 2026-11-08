import { useEffect } from "react";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";

const cjkRange =
  "U+2000-206F, U+2E80-2FFF, U+3000-303F, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FF00-FFEF, U+20000-2FA1F";

const hasFont = (family: string, sample: string) => {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return false;
  context.font = "40px monospace";
  const fallback = context.measureText(sample).width;
  context.font = `40px "${family}", monospace`;
  return Math.abs(context.measureText(sample).width - fallback) > 0.5;
};

const systemFonts = () =>
  typeof navigator !== "undefined" &&
  typeof document !== "undefined" &&
  (/Mac/.test(navigator.platform || navigator.userAgent) ||
    (hasFont("PingFang SC", "永久中文测试") &&
      (hasFont("SF Pro Text", "OnlineBG") ||
        hasFont("SF Pro Display", "OnlineBG"))));

const fontFaces = () =>
  `@font-face{font-family:"OnlineBG UI";src:url("${convertFileSrc("SFNS.woff2", "fonts")}") format("woff2");font-style:normal;font-weight:100 900;font-display:swap}
@font-face{font-family:"OnlineBG CJK";src:url("${convertFileSrc("PingFangSC-Regular.woff2", "fonts")}") format("woff2");font-style:normal;font-weight:400 500;font-display:swap;unicode-range:${cjkRange}}
@font-face{font-family:"OnlineBG CJK";src:url("${convertFileSrc("PingFangSC-Semibold.woff2", "fonts")}") format("woff2");font-style:normal;font-weight:600 900;font-display:swap;unicode-range:${cjkRange}}`;

export function FontAssets() {
  useEffect(() => {
    if (!isTauri() || systemFonts()) return;
    let active = true;
    void invoke<string[]>("ensure_fonts")
      .then((files) => {
        if (!active || !files.length) return;
        document
          .querySelectorAll("style[data-onlinebg-fonts]")
          .forEach((style) => style.remove());
        const style = document.createElement("style");
        style.dataset.onlinebgFonts = "true";
        style.textContent = fontFaces();
        document.head.append(style);
      })
      .catch((error) => console.warn("无法加载字体", error));
    return () => {
      active = false;
    };
  }, []);
  return null;
}
